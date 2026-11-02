import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Helper to send real SMS via Fast2SMS Gateway
async function sendFast2SMS(phone, message) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    return { success: false, reason: 'FAST2SMS_API_KEY not configured in environment' };
  }

  // Extract clean 10-digit Indian mobile number
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return { success: false, reason: `Invalid 10-digit phone number: ${phone}` };
  }

  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',
        message,
        language: 'english',
        flash: 0,
        numbers: cleanPhone,
      }),
    });

    const result = await response.json();
    return {
      success: result.return === true,
      messageId: result.request_id || null,
      raw: result,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default async function handler(req, res) {
  // Set CORS headers so frontend can trigger reminder checks directly
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const gmailUser = process.env.GMAIL_USER;
  const rawPass = process.env.GMAIL_APP_PASSWORD;
  const gmailPass = rawPass ? rawPass.replace(/\s+/g, '') : '';

  if (!gmailUser || !gmailPass) {
    return res.status(400).json({
      success: false,
      error: 'Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.',
    });
  }

  // Create Nodemailer Transporter using Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  // 1. DIRECT ACTIVE ALERTS MODE: Frontend sends nearing renewals (2 days / 7 days before)
  const incomingAlerts = req.body?.alerts || [];
  if (Array.isArray(incomingAlerts) && incomingAlerts.length > 0) {
    const sentResults = [];

    for (const alert of incomingAlerts) {
      const targetEmail = alert.target_email || gmailUser;
      const merchant = alert.merchant_name || 'Active Subscription';
      const amount = alert.amount ? `${alert.currency || 'INR'} ${alert.amount}` : 'recurring charge';
      const nextDate = alert.next_billing_date || 'Upcoming';
      const rail = alert.payment_mode_label || 'AutoPay Mandate';
      const trigger = alert.trigger_type || (alert.days_remaining <= 2 ? '2-day' : '7-day');
      const daysLeft = alert.days_remaining !== undefined ? alert.days_remaining : trigger === '2-day' ? 2 : 7;

      const isUrgent = daysLeft <= 2;
      const subject = isUrgent
        ? `🚨 Urgent Watchdog Alert: ${merchant} renews in ${daysLeft === 0 ? 'Today' : daysLeft === 1 ? '1 day' : daysLeft + ' days'} (${amount})`
        : `⚠️ Reminder: ${merchant} renews in ${daysLeft} days (${amount})`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
            .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .badge-urgent { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
            .badge-warning { background: #fffbeb; border: 1px solid #fde68a; color: #d97706; }
            .details-box { background: #f8fafc; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0; font-size: 13px; line-height: 1.8; color: #334155; }
            .btn { display: inline-block; background: #2446d8; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; font-size: 13px; }
            .btn-outline { display: inline-block; background: #ffffff; color: #dc2626; border: 1px solid #fecaca; text-decoration: none; padding: 9px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; margin-left: 10px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
              <span style="font-weight: 900; font-size: 16px; color: #2446d8;">RecurSight Watchdog</span>
              <span class="badge ${isUrgent ? 'badge-urgent' : 'badge-warning'}">
                ${isUrgent ? '2-Day Critical Alert' : '7-Day Notice'}
              </span>
            </div>

            <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0;">
              ${merchant} Renews in ${daysLeft === 0 ? 'Today' : daysLeft === 1 ? '1 Day' : daysLeft + ' Days'}
            </h2>

            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
              This is your scheduled watchdog alert for <strong>${merchant}</strong>. An upcoming recurring charge of <strong>${amount}</strong> is approaching.
            </p>

            <div class="details-box">
              <div><strong>Service:</strong> ${merchant}</div>
              <div><strong>Renewal Amount:</strong> ${amount}</div>
              <div><strong>Next Billing Date:</strong> ${nextDate}</div>
              <div><strong>Payment Rail:</strong> ${rail}</div>
              <div><strong>Alert Rule:</strong> Notified ${daysLeft} days before renewal</div>
            </div>

            <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
              If you wish to keep this subscription, no action is required — the AutoPay mandate will renew normally. If you do not want to renew, cancel or pause the mandate before the charge date.
            </p>

            <div style="margin-top: 24px; text-align: center;">
              <a href="https://recu-sight-x7iz.vercel.app/subscriptions" class="btn">View Subscription</a>
              <a href="https://recu-sight-x7iz.vercel.app/cancellation-guidance" class="btn-outline">Cancel Guidance</a>
            </div>

            <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
              RecurSight Automated Subscription & Mandate Watchdog • Delivery channel: Verified Email
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const info = await transporter.sendMail({
          from: `"RecurSight Watchdog" <${gmailUser}>`,
          to: targetEmail,
          subject,
          html: htmlContent,
        });

        let smsStatus = 'none';
        if (alert.target_phone) {
          const smsText = `🚨 RecurSight Alert: ${merchant} renews in ${daysLeft === 0 ? 'Today' : daysLeft === 1 ? '1 day' : daysLeft + ' days'} (${amount}). AutoPay active. Check dashboard to review or cancel.`;
          const smsRes = await sendFast2SMS(alert.target_phone, smsText);
          if (smsRes.success) {
            smsStatus = 'sent';
            console.log(`[Fast2SMS] Successfully delivered live SMS to ${alert.target_phone}`);
          } else {
            smsStatus = smsRes.reason || 'simulated';
            console.log(`[RecurSight SMS Gateway] ${smsRes.reason || 'Simulated dispatch'} for ${alert.target_phone}`);
          }
        }

        sentResults.push({
          merchant,
          targetEmail,
          targetPhone: alert.target_phone || null,
          smsStatus,
          messageId: info.messageId,
          daysLeft,
          status: 'sent',
        });
      } catch (err) {
        console.error(`Error sending alert for ${merchant}:`, err);
        sentResults.push({
          merchant,
          error: err.message,
          status: 'failed',
        });
      }
    }

    return res.status(200).json({
      success: true,
      dispatchedCount: sentResults.filter((r) => r.status === 'sent').length,
      results: sentResults,
    });
  }

  // 2. BATCH CRON MODE: Find due reminders in Supabase & dispatch
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({
      success: true,
      message: 'SMTP is active. Ready to process direct alert payloads.',
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const todayISO = new Date().toISOString();
    
    // Fetch pending scheduled email reminders due on or before today
    const { data: dueReminders, error: fetchErr } = await supabase
      .from('reminders')
      .select('*, subscriptions(*), profiles(*)')
      .eq('status', 'scheduled')
      .eq('delivery_channel', 'email')
      .lte('scheduled_at', todayISO);

    if (fetchErr) {
      console.error('Error fetching due reminders:', fetchErr);
      return res.status(500).json({ success: false, error: fetchErr.message });
    }

    if (!dueReminders || dueReminders.length === 0) {
      return res.status(200).json({
        success: true,
        dispatchedCount: 0,
        message: 'No pending reminders due for dispatch today.',
      });
    }

    let sentCount = 0;
    const sentIds = [];

    for (const reminder of dueReminders) {
      const sub = reminder.subscriptions;
      const targetEmail = reminder.profiles?.email || gmailUser;
      const merchantName = sub?.merchant_name || 'Active Subscription';
      const amount = sub?.amount ? `${sub.currency || 'INR'} ${sub.amount}` : 'recurring charge';
      const nextDate = sub?.next_billing_date || 'Upcoming';
      const rail = sub?.payment_mode_label || 'AutoPay Mandate';

      const mailOptions = {
        from: `"RecurSight Watchdog" <${gmailUser}>`,
        to: targetEmail,
        subject: `⚠️ Reminder: ${merchantName} renews on ${nextDate} (${amount})`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: sans-serif; background-color: #f8fafc; padding: 20px;">
            <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0;">
              <h2 style="color: #0f172a; margin-top: 0;">RecurSight Renewal Notice</h2>
              <p style="color: #334155; font-size: 14px;">This is an automated watchdog notice regarding your upcoming subscription renewal:</p>
              
              <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 18px 0; font-size: 13px;">
                <p style="margin: 4px 0;"><strong>Service:</strong> ${merchantName}</p>
                <p style="margin: 4px 0;"><strong>Renewal Amount:</strong> ${amount}</p>
                <p style="margin: 4px 0;"><strong>Next Billing Date:</strong> ${nextDate}</p>
                <p style="margin: 4px 0;"><strong>Payment Rail:</strong> ${rail}</p>
              </div>

              <p style="color: #64748b; font-size: 12px;">If you do not plan to renew, make sure to cancel or pause the mandate before the charge date.</p>
              
              <div style="margin-top: 20px;">
                <a href="https://recu-sight-x7iz.vercel.app/cancellation-guidance" style="background: #2446d8; color: white; padding: 9px 18px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: bold; display: inline-block;">Cancellation Guidance →</a>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      try {
        // Dispatch SMS if channel is sms or notes specify phone
        if (reminder.delivery_channel === 'sms' || (reminder.notes && reminder.notes.includes('+91'))) {
          const userPhone = reminder.profiles?.phone_number || (reminder.notes?.match(/(\+91[\d\s]+|\d{10})/)?.[0]);
          if (userPhone) {
            await sendFast2SMS(userPhone, `🚨 RecurSight Alert: ${merchantName} renews on ${nextDate} (${amount}). Check dashboard to review or cancel.`);
          }
        }

        // Dispatch Email if email channel or default
        if (reminder.delivery_channel !== 'sms') {
          await transporter.sendMail(mailOptions);
        }

        sentCount++;
        sentIds.push(reminder.id);

        // Update reminder status to 'sent'
        await supabase
          .from('reminders')
          .update({ status: 'sent', updated_at: new Date().toISOString() })
          .eq('id', reminder.id);
      } catch (err) {
        console.error(`Error sending reminder ${reminder.id}:`, err);
      }
    }

    return res.status(200).json({
      success: true,
      dispatchedCount: sentCount,
      sentIds,
      message: `Dispatched ${sentCount} reminder email(s) successfully!`,
    });
  } catch (batchErr) {
    console.error('Batch error:', batchErr);
    return res.status(500).json({ success: false, error: batchErr.message });
  }
}
