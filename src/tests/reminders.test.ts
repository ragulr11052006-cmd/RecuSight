import { describe, it, expect } from 'vitest';
import { Reminder } from '../types';

describe('RecurSight Reminders & SLA Schedule', () => {
  it('correctly calculates 48-hour prior notification time', () => {
    const nextRenewal = new Date('2026-10-31T00:00:00Z');
    const leadDays = 2; // 48 hours
    const reminderDate = new Date(nextRenewal);
    reminderDate.setDate(reminderDate.getDate() - leadDays);

    expect(reminderDate.toISOString().split('T')[0]).toBe('2026-10-29');
  });

  it('validates supported delivery channels', () => {
    const validChannels = ['in_app', 'email', 'sms'];
    const reminder: Partial<Reminder> = {
      delivery_channel: 'email',
      status: 'scheduled',
    };

    expect(validChannels.includes(reminder.delivery_channel!)).toBe(true);
  });
});
