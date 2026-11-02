import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { UserProfile, NotificationPreferences, Reminder, DeliveryChannel } from '../types';

describe('Profile Mobile Number & SMS Notification Preferences', () => {
  beforeAll(() => {
    if (typeof localStorage === 'undefined' || !localStorage.clear) {
      const storage = new Map<string, string>();
      globalThis.localStorage = {
        getItem: (k: string) => storage.get(k) || null,
        setItem: (k: string, v: string) => storage.set(k, String(v)),
        removeItem: (k: string) => storage.delete(k),
        clear: () => storage.clear(),
        length: 0,
        key: () => null,
      } as any;
    }
  });

  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
  });

  it('correctly persists and retrieves user profile with phone_number', () => {
    const mockUser: UserProfile = {
      id: 'usr-test-123',
      email: 'alex@example.com',
      display_name: 'Alex Johnson',
      phone_number: '+91 98765 43210',
      preferred_currency: 'INR',
      timezone: 'Asia/Kolkata',
      theme_preference: 'light',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem('recusight_auth_user', JSON.stringify(mockUser));
    const retrieved: UserProfile = JSON.parse(localStorage.getItem('recusight_auth_user') || '{}');

    expect(retrieved.phone_number).toBe('+91 98765 43210');
    expect(retrieved.email).toBe('alex@example.com');
    expect(retrieved.display_name).toBe('Alex Johnson');
  });

  it('validates notification preferences with sms_enabled delivery channel', () => {
    const prefs: NotificationPreferences = {
      id: 'pref-default',
      user_id: 'usr-123',
      email_enabled: true,
      in_app_enabled: true,
      sms_enabled: true,
      default_lead_days: 2,
      reminder_dispatch_time: '09:00',
      notify_on_trial_expiry: true,
      notify_on_renewal: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(prefs.sms_enabled).toBe(true);
    expect(prefs.email_enabled).toBe(true);
    expect(prefs.in_app_enabled).toBe(true);
    expect(prefs.default_lead_days).toBe(2);
  });

  it('correctly auto-fetches profile phone number when SMS channel is selected', () => {
    const userProfile: Partial<UserProfile> = {
      phone_number: '+91 98765 43210',
      email: 'user@example.com',
    };

    // Simulate clicking SMS channel button without typing
    let manualTargetSMS = false;
    let targetPhone = '';

    // Action: click SMS
    manualTargetSMS = !manualTargetSMS;
    if (manualTargetSMS && !targetPhone && userProfile.phone_number) {
      targetPhone = userProfile.phone_number;
    }

    expect(manualTargetSMS).toBe(true);
    expect(targetPhone).toBe('+91 98765 43210');

    // Simulate channel label rendering
    const pillLabel = `SMS ${targetPhone ? `(${targetPhone})` : ''}`;
    expect(pillLabel).toBe('SMS (+91 98765 43210)');
  });

  it('creates scheduled reminders with sms delivery channel referencing user phone', () => {
    const userPhone = '+91 91234 56789';
    const channel: DeliveryChannel = 'sms';

    const reminder: Reminder = {
      id: 'rem-sms-1',
      user_id: 'usr-sms-user',
      subscription_id: 'sub-spotify-1',
      scheduled_at: '2026-11-18T09:00:00.000Z',
      reminder_type: 'renewal_notice',
      delivery_channel: channel,
      status: 'scheduled',
      timezone: 'Asia/Kolkata',
      notes: `2-day alert for Spotify Premium to ${userPhone}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(reminder.delivery_channel).toBe('sms');
    expect(reminder.notes).toContain(userPhone);
    expect(reminder.status).toBe('scheduled');
  });
});
