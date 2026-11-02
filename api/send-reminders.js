import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers so frontend can trigger test emails directly
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

  // Verify SMTP Connection
  try {
    await transporter.verify();
  } catch (authError) {
    console.error('SMTP Auth Failed:', authError);
    return res.status(500).json({
      success: false,
      error: `Failed to authenticate with Gmail SMTP: ${authError.message}. Make sure 2FA is enabled and your 16-character App Password is correct.`,
    });
  }

  // 1. TEST MODE: Send immediate confirmation test email
  if (req.query.test === 'true' || req.body?.test === true) {
    const targetRecipient = req.query.to || req.body?.to || gmailUser;
    
    const mailOptions = {
      from: `"RecurSight Watchdog" <${gmailUser}>`,
      to: targetRecipient,
      subject: '🔔 RecurSight Watchdog Alert: Email Dispatch Verified!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
            .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px border #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
            .logo { width: 36px; height: 36px; border-radius: 10px; background: #2446d8; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; }
            h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
            p { font-size: 14px; line-height: 1.6; color: #334155; margin: 12px 0; }
            .badge { display: inline-block; padding: 4px 10px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-size: 12px; font-weight: 700; border-radius: 8px; }
            .details { background: #f8fafc; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0; font-size: 13px; }
            .btn { display: inline-block; background: #2446d8; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; font-size: 13px; margin-top: 12px; }
            .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="logo">R</div>
              <div>
                <h1>RecurSight Watchdog</h1>
                <span class="badge">✓ Live Dispatch Active</span>
              </div>
            </div>
            
            <p>Hello,</p>
            <p>Your <strong>Gmail SMTP connection is active & verified</strong>. RecurSight will dispatch automatic reminder notices directly to this address whenever upcoming renewal commitments or trial expirations approach.</p>
            
            <div class="details">
              <strong>Dispatch Channel:</strong> Gmail SMTP (Free)<br>
              <strong>Sender:</strong> ${gmailUser}<br>
              <strong>Verified Target:</strong> ${targetRecipient}<br>
              <strong>Watchdog Guard:</strong> 7-Day & 2-Day Alerts Active
            </div>

            <p>You can manage your notification thresholds, active subscriptions, and AutoPay mandates anytime on your dashboard.</p>
            
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://recu-sight-x7iz.vercel.app/reminders" class="btn">View Renewal Schedule →</a>
            </div>

            <div class="footer">
              RecurSight — Automated Subscription & Mandate Governance
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      return res.status(200).json({
        success: true,
        message: `Test email sent successfully to ${targetRecipient}!`,
        messageId: info.messageId,
      });
    } catch (sendError) {
      console.error('Send error:', sendError);
      return res.status(500).json({
        success: false,
        error: `Failed to send email: ${sendError.message}`,
      });
    }
  }

  // 2. BATCH CRON MODE: Find due reminders in Supabase & dispatch
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({
      success: true,
      message: 'SMTP is active, but Supabase environment variables are missing for automatic batch lookup.',
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
        await transporter.sendMail(mailOptions);
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
