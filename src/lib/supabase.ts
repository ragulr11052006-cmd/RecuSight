import { createClient } from '@supabase/supabase-js';
import { 
  Subscription, 
  PaymentSource, 
  Reminder, 
  DocumentRecord, 
  ExtractedTransaction, 
  CancellationGuidanceHistory,
  UserProfile,
  NotificationPreferences 
} from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('your-project')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==========================================
// LOCAL STORAGE DATA STORE (DEV / FALLBACK)
// ==========================================
const STORAGE_PREFIX = 'recusight_';

// Initial Mock Seed Data matching Figma exactly
const INITIAL_PAYMENT_SOURCES: PaymentSource[] = [
  // ==========================================
  // INR PAYMENT SOURCES (UPI, Cards, Bank Accounts)
  // ==========================================
  // UPI Apps (AutoPay)
  {
    id: 'ps-inr-upi-1',
    user_id: 'default-user',
    provider_name: 'Google Pay',
    display_name: 'Google Pay UPI AutoPay',
    source_type: 'upi_autopay',
    last_four: '3310',
    currency: 'INR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-inr-upi-2',
    user_id: 'default-user',
    provider_name: 'PhonePe',
    display_name: 'PhonePe AutoPay',
    source_type: 'upi_autopay',
    last_four: '7812',
    currency: 'INR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-inr-upi-3',
    user_id: 'default-user',
    provider_name: 'Paytm',
    display_name: 'Paytm UPI AutoPay',
    source_type: 'upi_autopay',
    last_four: '4419',
    currency: 'INR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-inr-upi-4',
    user_id: 'default-user',
    provider_name: 'Cred',
    display_name: 'CRED / BHIM UPI Mandate',
    source_type: 'upi_autopay',
    last_four: '9012',
    currency: 'INR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Cards (Credit & Debit)
  {
    id: 'ps-2',
    user_id: 'default-user',
    provider_name: 'HDFC Bank',
    display_name: 'HDFC Diners Club Credit Card',
    source_type: 'credit_card',
    last_four: '4291',
    currency: 'INR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-inr-card-2',
    user_id: 'default-user',
    provider_name: 'State Bank of India',
    display_name: 'SBI SimplyClick Credit Card',
    source_type: 'credit_card',
    last_four: '5521',
    currency: 'INR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-inr-card-3',
    user_id: 'default-user',
    provider_name: 'ICICI Bank',
    display_name: 'ICICI Sapphiro Credit Card',
    source_type: 'credit_card',
    last_four: '8832',
    currency: 'INR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-inr-card-4',
    user_id: 'default-user',
    provider_name: 'Axis Bank',
    display_name: 'Axis Bank Magnus Credit Card',
    source_type: 'credit_card',
    last_four: '1944',
    currency: 'INR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Bank Accounts (Net Banking & e-Mandate)
  {
    id: 'ps-inr-bank-1',
    user_id: 'default-user',
    provider_name: 'HDFC Bank',
    display_name: 'HDFC Bank NetBanking',
    source_type: 'net_banking',
    last_four: '2091',
    currency: 'INR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-inr-bank-2',
    user_id: 'default-user',
    provider_name: 'State Bank of India',
    display_name: 'SBI Savings Account e-Mandate',
    source_type: 'bank_account',
    last_four: '6720',
    currency: 'INR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-inr-bank-3',
    user_id: 'default-user',
    provider_name: 'ICICI Bank',
    display_name: 'ICICI Bank Savings Auto-Debit',
    source_type: 'bank_account',
    last_four: '5110',
    currency: 'INR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-inr-bank-4',
    user_id: 'default-user',
    provider_name: 'Kotak Mahindra Bank',
    display_name: 'Kotak Mahindra Bank e-Mandate',
    source_type: 'bank_account',
    last_four: '8190',
    currency: 'INR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ==========================================
  // USD PAYMENT SOURCES
  // ==========================================
  {
    id: 'ps-1',
    user_id: 'default-user',
    provider_name: 'Chase Bank',
    display_name: 'Chase Sapphire Reserve',
    source_type: 'credit_card',
    last_four: '4821',
    currency: 'USD',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-usd-2',
    user_id: 'default-user',
    provider_name: 'Bank of America',
    display_name: 'BofA Cash Rewards',
    source_type: 'credit_card',
    last_four: '1042',
    currency: 'USD',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-usd-3',
    user_id: 'default-user',
    provider_name: 'Apple Pay',
    display_name: 'Apple Card Mastercard',
    source_type: 'apple_pay',
    last_four: '9901',
    currency: 'USD',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-usd-4',
    user_id: 'default-user',
    provider_name: 'Chase Bank',
    display_name: 'JPMorgan Chase Checking',
    source_type: 'bank_account',
    last_four: '5011',
    currency: 'USD',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ==========================================
  // EUR PAYMENT SOURCES
  // ==========================================
  {
    id: 'ps-eur-1',
    user_id: 'default-user',
    provider_name: 'Revolut',
    display_name: 'Revolut Metal Card',
    source_type: 'debit_card',
    last_four: '6120',
    currency: 'EUR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-eur-2',
    user_id: 'default-user',
    provider_name: 'N26',
    display_name: 'N26 Smart Mastercard',
    source_type: 'debit_card',
    last_four: '3409',
    currency: 'EUR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-eur-3',
    user_id: 'default-user',
    provider_name: 'BNP Paribas',
    display_name: 'BNP Paribas SEPA Direct Debit',
    source_type: 'bank_account',
    last_four: '8912',
    currency: 'EUR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ==========================================
  // GBP PAYMENT SOURCES
  // ==========================================
  {
    id: 'ps-gbp-1',
    user_id: 'default-user',
    provider_name: 'Barclays',
    display_name: 'Barclays Premier Rewards',
    source_type: 'credit_card',
    last_four: '8820',
    currency: 'GBP',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-gbp-2',
    user_id: 'default-user',
    provider_name: 'Monzo',
    display_name: 'Monzo Current Account',
    source_type: 'debit_card',
    last_four: '5291',
    currency: 'GBP',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ps-gbp-3',
    user_id: 'default-user',
    provider_name: 'HSBC',
    display_name: 'HSBC Direct Debit Mandate',
    source_type: 'bank_account',
    last_four: '4490',
    currency: 'GBP',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-1',
    user_id: 'default-user',
    merchant_name: 'Netflix',
    category: 'Entertainment',
    amount: 19.99,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'months',
    next_billing_date: 'Nov 24, 2026',
    payment_mode_label: 'UPI AutoPay (Google Pay)',
    payment_mode_badge: 'UPI AutoPay: Active',
    status: 'active',
    confidence_status: 'verified',
    notes: 'Family 4K Streaming Tier',
    website_url: 'https://netflix.com',
    cancellation_url: 'https://www.netflix.com/youraccount',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-2',
    user_id: 'default-user',
    merchant_name: 'Figma',
    category: 'Design',
    amount: 15.00,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'months',
    next_billing_date: 'Nov 28, 2026',
    payment_mode_label: 'UPI Autopay (Gpay)',
    payment_mode_badge: 'UPI AutoPay: Active',
    status: 'active',
    confidence_status: 'verified',
    notes: 'Professional seat design license',
    website_url: 'https://figma.com',
    cancellation_url: 'https://help.figma.com/hc/en-us/articles/360040532333',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-3',
    user_id: 'default-user',
    merchant_name: 'Claude',
    category: 'Ai Assist',
    amount: 54.99,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'months',
    next_billing_date: 'Dec 24, 2026',
    payment_mode_label: 'SBI Visa •••• 2345',
    payment_mode_badge: 'Card AutoPay: Active',
    status: 'active',
    confidence_status: 'verified',
    notes: 'Anthropic Claude Team workspace',
    website_url: 'https://claude.ai',
    cancellation_url: 'https://claude.ai/settings/billing',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-4',
    user_id: 'default-user',
    merchant_name: 'Canva',
    category: 'Design',
    amount: 12.99,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'years',
    next_billing_date: 'Dec 31, 2026',
    payment_mode_label: 'UPI Autopay (Gpay)',
    payment_mode_badge: 'Card AutoPay: InActive',
    status: 'paused',
    confidence_status: 'verified',
    notes: 'Design Suite Annual Pro',
    website_url: 'https://canva.com',
    cancellation_url: 'https://www.canva.com/settings/billing',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-5',
    user_id: 'default-user',
    merchant_name: 'Notion',
    category: 'Productivity',
    amount: 10.00,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'months',
    next_billing_date: 'Jan 24, 2027',
    payment_mode_label: 'SBI Visa •••• 2345',
    payment_mode_badge: 'Annual Auto Renewal',
    status: 'trial',
    confidence_status: 'verified',
    notes: 'Notion AI Plus trial tier',
    website_url: 'https://notion.so',
    cancellation_url: 'https://www.notion.so/settings',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-6',
    user_id: 'default-user',
    merchant_name: 'Perplexity',
    category: 'Ai Assist',
    amount: 20.00,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'months',
    next_billing_date: 'Mar 24, 2027',
    payment_mode_label: 'HDFC Visa •••• 4090',
    payment_mode_badge: 'Card AutoPay: Active',
    status: 'trial',
    confidence_status: 'verified',
    notes: 'Perplexity Pro trial',
    website_url: 'https://perplexity.ai',
    cancellation_url: 'https://www.perplexity.ai/settings',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-7',
    user_id: 'default-user',
    merchant_name: 'Spotify Family',
    category: 'Entertainment',
    amount: 10.99,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'months',
    next_billing_date: 'Nov 04, 2026',
    payment_mode_label: 'UPI AutoPay (Google Pay)',
    payment_mode_badge: 'UPI AutoPay: Active',
    status: 'active',
    confidence_status: 'verified',
    notes: 'Family Premium plan',
    website_url: 'https://spotify.com',
    cancellation_url: 'https://spotify.com/account',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-8',
    user_id: 'default-user',
    merchant_name: 'GitHub Copilot',
    category: 'Software & Tools',
    amount: 10.00,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'months',
    next_billing_date: 'Nov 12, 2026',
    payment_mode_label: 'SBI Visa •••• 2345',
    payment_mode_badge: 'Card AutoPay: Active',
    status: 'active',
    confidence_status: 'verified',
    notes: 'Developer tools',
    website_url: 'https://github.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-9',
    user_id: 'default-user',
    merchant_name: 'Adobe Creative Cloud',
    category: 'Design',
    amount: 54.99,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'months',
    next_billing_date: 'Oct 31, 2026',
    payment_mode_label: 'HDFC Visa •••• 4090',
    payment_mode_badge: 'Card AutoPay: Active',
    status: 'active',
    confidence_status: 'verified',
    notes: 'All apps cloud subscription',
    website_url: 'https://adobe.com',
    cancellation_url: 'https://account.adobe.com/plans',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-10',
    user_id: 'default-user',
    merchant_name: 'Google Cloud Platform',
    category: 'Utilities & Cloud',
    amount: 12.50,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'months',
    next_billing_date: 'Nov 18, 2026',
    payment_mode_label: 'SBI Visa •••• 2345',
    payment_mode_badge: 'UPI AutoPay: Active',
    status: 'active',
    confidence_status: 'verified',
    notes: 'Cloud instance billing',
    website_url: 'https://cloud.google.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-11',
    user_id: 'default-user',
    merchant_name: 'Amazon Prime',
    category: 'Entertainment',
    amount: 14.99,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'months',
    next_billing_date: 'Dec 05, 2026',
    payment_mode_label: 'HDFC Visa •••• 4090',
    payment_mode_badge: 'Card AutoPay: Active',
    status: 'active',
    confidence_status: 'verified',
    notes: 'Video and delivery membership',
    website_url: 'https://amazon.com/prime',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-12',
    user_id: 'default-user',
    merchant_name: 'Apple iCloud+',
    category: 'Utilities & Cloud',
    amount: 0.99,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'months',
    next_billing_date: 'Nov 29, 2026',
    payment_mode_label: 'UPI Autopay (Gpay)',
    payment_mode_badge: 'UPI AutoPay: Active',
    status: 'active',
    confidence_status: 'verified',
    notes: '50GB cloud storage storage',
    website_url: 'https://apple.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-13',
    user_id: 'default-user',
    merchant_name: 'FastSpring Software',
    category: 'Software & Tools',
    amount: 29.00,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'years',
    next_billing_date: 'Nov 26, 2026',
    payment_mode_label: 'UPI AutoPay (Google Pay)',
    payment_mode_badge: 'UPI AutoPay: Active',
    status: 'needs_review',
    confidence_status: 'unconfirmed_estimate',
    notes: 'Unconfirmed software license estimate',
    website_url: 'https://fastspring.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-14',
    user_id: 'default-user',
    merchant_name: 'Cursor AI Pro',
    category: 'Software & Tools',
    amount: 20.00,
    currency: 'USD',
    billing_interval: 1,
    billing_interval_unit: 'months',
    next_billing_date: 'Dec 02, 2026',
    payment_mode_label: 'SBI Visa •••• 2345',
    payment_mode_badge: 'Card AutoPay: Active',
    status: 'needs_review',
    confidence_status: 'unconfirmed_estimate',
    notes: 'Developer IDE monthly assistant',
    website_url: 'https://cursor.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_REMINDERS: Reminder[] = [
  {
    id: 'rem-1',
    user_id: 'default-user',
    subscription_id: 'sub-1',
    scheduled_at: new Date(Date.now() + 1 * 86400000).toISOString(),
    reminder_type: 'trial_expiry',
    delivery_channel: 'email',
    status: 'scheduled',
    timezone: 'UTC',
    notes: 'Figma trial ends in 3 days. Alerting 48 hours prior.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rem-2',
    user_id: 'default-user',
    subscription_id: 'sub-6',
    scheduled_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    reminder_type: 'renewal_notice',
    delivery_channel: 'in_app',
    status: 'scheduled',
    timezone: 'UTC',
    notes: 'Notion AI Plus monthly renewal coming up.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rem-3',
    user_id: 'default-user',
    subscription_id: 'sub-2',
    scheduled_at: new Date(Date.now() + 4 * 86400000).toISOString(),
    reminder_type: 'trial_expiry',
    delivery_channel: 'in_app',
    status: 'scheduled',
    timezone: 'UTC',
    notes: 'Adobe After Effects trial auto-conversion reminder.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_GUIDANCE_HISTORY: CancellationGuidanceHistory[] = [
  {
    id: 'gh-1',
    user_id: 'default-user',
    subscription_id: 'sub-3',
    merchant_name: 'Netflix',
    action_type: 'view_guidance',
    status: 'guidance_viewed',
    notes: 'Opened vendor direct cancellation settings page',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'gh-2',
    user_id: 'default-user',
    subscription_id: 'sub-2',
    merchant_name: 'Adobe Creative Cloud',
    action_type: 'revoke_autopay',
    status: 'mandate_revocation_marked',
    notes: 'Marked HDFC Card E-Mandate revoked in netbanking',
    confirmation_reference: 'MAND-REV-849201',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

// Local Storage Helper Functions
function getFromStorage<T>(key: string, initialData: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(initialData));
      return initialData;
    }
    return JSON.parse(raw);
  } catch {
    return initialData;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }
}

// Data Service APIs with unified fallback and Supabase support
export const db = {
  // --- Subscriptions ---
  async getSubscriptions(userId: string): Promise<Subscription[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, payment_source:payment_sources(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as Subscription[];
    }
    const all = getFromStorage<Subscription[]>('subscriptions', INITIAL_SUBSCRIPTIONS);
    const sources = getFromStorage<PaymentSource[]>('payment_sources', INITIAL_PAYMENT_SOURCES);
    return all
      .filter(s => s.user_id === userId || (userId === 'default-user' || userId === 'demo-user-123' ? s.user_id === 'default-user' : false))
      .map(s => {
        const ps = sources.find(p => p.id === s.payment_source_id);
        let modeLabel = s.payment_mode_label;
        let modeBadge = s.payment_mode_badge;

        if (!modeLabel) {
          if (ps) {
            modeLabel = ps.display_name;
          } else {
            modeLabel = s.currency === 'INR' ? 'UPI AutoPay (Google Pay)' : 'Corporate Card •••• 4092';
          }
        }
        // Correct legacy contradictory pairs (e.g. HDFC Visa text with UPI badge)
        if (modeBadge?.includes('UPI') && modeLabel.includes('Visa')) {
          modeLabel = 'UPI AutoPay (Google Pay)';
        }

        if (!modeBadge) {
          const isUpi = modeLabel.toLowerCase().includes('upi') || modeLabel.toLowerCase().includes('gpay') || modeLabel.toLowerCase().includes('phonepe');
          const isCard = modeLabel.toLowerCase().includes('visa') || modeLabel.toLowerCase().includes('card') || modeLabel.toLowerCase().includes('••••');
          modeBadge = isUpi ? 'UPI AutoPay: Active' : isCard ? 'Card Auto-Debit: Active' : 'AutoPay: Active';
        }

        return {
          ...s,
          payment_source: ps,
          payment_mode_label: modeLabel,
          payment_mode_badge: modeBadge,
        };
      });
  },

  async createSubscription(sub: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>): Promise<Subscription> {
    const now = new Date().toISOString();
    const newSub: Subscription = {
      ...sub,
      id: 'sub-' + Date.now(),
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([sub])
        .select()
        .single();
      if (!error && data) return data as Subscription;
    }

    const list = getFromStorage<Subscription[]>('subscriptions', INITIAL_SUBSCRIPTIONS);
    list.unshift(newSub);
    saveToStorage('subscriptions', list);
    return newSub;
  },

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as Subscription;
    }

    const list = getFromStorage<Subscription[]>('subscriptions', INITIAL_SUBSCRIPTIONS);
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
    saveToStorage('subscriptions', list);
    return list[idx];
  },

  async deleteSubscription(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('subscriptions').delete().eq('id', id);
      if (!error) return true;
    }

    const list = getFromStorage<Subscription[]>('subscriptions', INITIAL_SUBSCRIPTIONS);
    const filtered = list.filter(s => s.id !== id);
    saveToStorage('subscriptions', filtered);
    return true;
  },

  // --- Payment Sources ---
  async getPaymentSources(userId: string): Promise<PaymentSource[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('payment_sources')
        .select('*')
        .eq('user_id', userId)
        .order('display_name', { ascending: true });
      if (!error && data) return data as PaymentSource[];
    }
    const all = getFromStorage<PaymentSource[]>('payment_sources', INITIAL_PAYMENT_SOURCES);
    return all.filter(p => p.user_id === userId || (userId === 'default-user' || userId === 'demo-user-123' ? p.user_id === 'default-user' : false));
  },

  async createPaymentSource(source: Omit<PaymentSource, 'id' | 'created_at' | 'updated_at'>): Promise<PaymentSource> {
    const now = new Date().toISOString();
    const newPs: PaymentSource = {
      ...source,
      id: 'ps-' + Date.now(),
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('payment_sources')
        .insert([source])
        .select()
        .single();
      if (!error && data) return data as PaymentSource;
    }

    const list = getFromStorage<PaymentSource[]>('payment_sources', INITIAL_PAYMENT_SOURCES);
    list.push(newPs);
    saveToStorage('payment_sources', list);
    return newPs;
  },

  // --- Reminders ---
  async getReminders(userId: string): Promise<Reminder[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('reminders')
        .select('*, subscription:subscriptions(*)')
        .eq('user_id', userId)
        .order('scheduled_at', { ascending: true });
      if (!error && data) return data as Reminder[];
    }
    const all = getFromStorage<Reminder[]>('reminders', INITIAL_REMINDERS);
    const subs = await this.getSubscriptions(userId);
    return all
      .filter(r => r.user_id === userId || (userId === 'default-user' || userId === 'demo-user-123' ? r.user_id === 'default-user' : false))
      .map(r => ({
        ...r,
        subscription: subs.find(s => s.id === r.subscription_id),
      }));
  },

  async createReminder(reminder: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>): Promise<Reminder> {
    const now = new Date().toISOString();
    const newRem: Reminder = {
      ...reminder,
      id: 'rem-' + Date.now(),
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('reminders')
        .insert([reminder])
        .select()
        .single();
      if (!error && data) return data as Reminder;
    }

    const list = getFromStorage<Reminder[]>('reminders', INITIAL_REMINDERS);
    list.push(newRem);
    saveToStorage('reminders', list);
    return newRem;
  },

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as Reminder;
    }

    const list = getFromStorage<Reminder[]>('reminders', INITIAL_REMINDERS);
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
    saveToStorage('reminders', list);
    return list[idx];
  },

  async deleteReminder(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('reminders').delete().eq('id', id);
      if (!error) return true;
    }

    const list = getFromStorage<Reminder[]>('reminders', INITIAL_REMINDERS);
    const filtered = list.filter(r => r.id !== id);
    saveToStorage('reminders', filtered);
    return true;
  },

  // --- Cancellation History ---
  async getCancellationHistory(userId: string): Promise<CancellationGuidanceHistory[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('cancellation_guidance_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as CancellationGuidanceHistory[];
    }
    const all = getFromStorage<CancellationGuidanceHistory[]>('guidance_history', []);
    return all.filter(h => h.user_id === userId || (userId === 'default-user' || userId === 'demo-user-123' ? h.user_id === 'default-user' : false));
  },

  async logCancellationAction(action: Omit<CancellationGuidanceHistory, 'id' | 'created_at'>): Promise<CancellationGuidanceHistory> {
    const item: CancellationGuidanceHistory = {
      ...action,
      id: 'gh-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('cancellation_guidance_history')
        .insert([action])
        .select()
        .single();
      if (!error && data) return data as CancellationGuidanceHistory;
    }

    const list = getFromStorage<CancellationGuidanceHistory[]>('guidance_history', []);
    list.unshift(item);
    saveToStorage('guidance_history', list);
    return item;
  },

  // --- Preferences ---
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const defaultPrefs: NotificationPreferences = {
      id: 'pref-default',
      user_id: userId,
      email_enabled: true,
      in_app_enabled: true,
      sms_enabled: false,
      default_lead_days: 2,
      reminder_dispatch_time: '09:00',
      notify_on_trial_expiry: true,
      notify_on_renewal: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (data) return data as NotificationPreferences;
    }

    return getFromStorage<NotificationPreferences>('notification_prefs', defaultPrefs);
  },

  async updateNotificationPreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const existing = await this.getNotificationPreferences(userId);
    const updated = { ...existing, ...prefs, updated_at: new Date().toISOString() };

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('notification_preferences')
        .upsert({ ...updated, user_id: userId });
    }

    saveToStorage('notification_prefs', updated);
    return updated;
  },
};
