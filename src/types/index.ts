// Core Type Definitions for RecurSight

export type Currency = 'USD' | 'INR' | 'EUR' | 'GBP';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
};

export type SubscriptionCategory =
  | 'Productivity'
  | 'Streaming & Ent'
  | 'Entertainment'
  | 'Design'
  | 'AI Assist'
  | 'Ai Assist'
  | 'Software & Dev'
  | 'Software & Tools'
  | 'Utilities & Cloud'
  | 'Fitness & Health'
  | 'Other Misc'
  | 'Other';

export type BillingIntervalUnit = 'days' | 'weeks' | 'months' | 'years';

export type SubscriptionStatus = 'active' | 'trial' | 'paused' | 'cancelled' | 'needs_review';

export type ConfidenceStatus = 'verified' | 'unconfirmed_estimate' | 'candidate';

export type PaymentSourceType =
  | 'credit_card'
  | 'debit_card'
  | 'upi_autopay'
  | 'net_banking'
  | 'bank_account'
  | 'paypal'
  | 'apple_pay'
  | 'other';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  preferred_currency: Currency;
  timezone: string;
  theme_preference: 'light' | 'dark' | 'system';
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentSource {
  id: string;
  user_id: string;
  provider_name: string;
  display_name: string;
  source_type: PaymentSourceType;
  last_four?: string;
  currency?: Currency;
  external_reference?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  merchant_name: string;
  category: SubscriptionCategory;
  amount: number;
  currency: Currency;
  billing_interval: number;
  billing_interval_unit: BillingIntervalUnit;
  next_billing_date?: string; // YYYY-MM-DD
  trial_start_date?: string; // YYYY-MM-DD
  trial_end_date?: string; // YYYY-MM-DD
  payment_source_id?: string;
  payment_source?: PaymentSource;
  payment_mode_label?: string;
  payment_mode_badge?: string;
  mandate_reference?: string;
  status: SubscriptionStatus;
  confidence_status: ConfidenceStatus;
  notes?: string;
  website_url?: string;
  cancellation_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  raw_ocr_data?: any;
  created_at: string;
  updated_at: string;
}

export interface ExtractedTransaction {
  id: string;
  user_id: string;
  document_id: string;
  merchant_name: string;
  transaction_description?: string;
  amount: number;
  currency: Currency;
  transaction_date?: string;
  suggested_cadence?: string;
  suggested_category?: SubscriptionCategory;
  confidence_score: number;
  possible_duplicate: boolean;
  matched_subscription_id?: string;
  is_recurring_candidate: boolean;
  review_status: 'pending' | 'confirmed' | 'rejected' | 'ignored';
  created_at: string;
}

export type ReminderType = 'renewal_notice' | 'trial_expiry' | 'autopay_alert' | 'price_change' | 'custom';
export type DeliveryChannel = 'in_app' | 'email' | 'sms';
export type ReminderStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled';

export interface Reminder {
  id: string;
  user_id: string;
  subscription_id: string;
  subscription?: Subscription;
  scheduled_at: string;
  reminder_type: ReminderType;
  delivery_channel: DeliveryChannel;
  status: ReminderStatus;
  timezone: string;
  idempotency_key?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  sms_enabled: boolean;
  default_lead_days: number;
  reminder_dispatch_time: string;
  notify_on_trial_expiry: boolean;
  notify_on_renewal: boolean;
  created_at: string;
  updated_at: string;
}

export interface CancellationGuidanceHistory {
  id: string;
  user_id: string;
  subscription_id?: string;
  merchant_name: string;
  action_type: 'cancel_vendor' | 'revoke_autopay' | 'pause_requested' | 'view_guidance';
  status: 'guidance_viewed' | 'mandate_revocation_marked' | 'cancellation_confirmed_by_user' | 'abandoned';
  confirmation_reference?: string;
  notes?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id?: string;
  action: string;
  metadata?: any;
  created_at: string;
}
