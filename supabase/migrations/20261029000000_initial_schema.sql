-- RecurSight Subscription Tracker Schema Migration
-- Version: 20261029000000
-- Generated for PostgreSQL 15+ / Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    preferred_currency TEXT NOT NULL DEFAULT 'USD',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    theme_preference TEXT NOT NULL DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'system')),
    phone_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PAYMENT SOURCES TABLE
CREATE TABLE IF NOT EXISTS public.payment_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL, -- e.g. 'HDFC Bank', 'Chase', 'Google Pay UPI'
    display_name TEXT NOT NULL, -- e.g. 'HDFC Credit Card', 'Chase Sapphire'
    source_type TEXT NOT NULL CHECK (source_type IN ('credit_card', 'debit_card', 'upi_autopay', 'net_banking', 'paypal', 'apple_pay', 'other')),
    last_four VARCHAR(4),
    external_reference TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Productivity', 'Streaming & Ent', 'Entertainment', 'Design', 
        'AI Assist', 'Software & Dev', 'Software & Tools', 'Utilities & Cloud', 
        'Fitness & Health', 'Other Misc', 'Other'
    )),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    billing_interval INT NOT NULL DEFAULT 1 CHECK (billing_interval > 0),
    billing_interval_unit TEXT NOT NULL CHECK (billing_interval_unit IN ('days', 'weeks', 'months', 'years')),
    next_billing_date DATE,
    trial_start_date DATE,
    trial_end_date DATE,
    payment_source_id UUID REFERENCES public.payment_sources(id) ON DELETE SET NULL,
    mandate_reference TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'paused', 'cancelled', 'needs_review')),
    confidence_status TEXT NOT NULL DEFAULT 'verified' CHECK (confidence_status IN ('verified', 'unconfirmed_estimate', 'candidate')),
    notes TEXT,
    website_url TEXT,
    cancellation_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DOCUMENTS (INVOICES / STATEMENTS)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    raw_ocr_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. EXTRACTED TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.extracted_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    merchant_name TEXT NOT NULL,
    transaction_description TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    transaction_date DATE,
    suggested_cadence TEXT DEFAULT 'monthly',
    suggested_category TEXT DEFAULT 'Software & Tools',
    confidence_score NUMERIC(5, 2) DEFAULT 0.85,
    possible_duplicate BOOLEAN NOT NULL DEFAULT false,
    matched_subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    is_recurring_candidate BOOLEAN NOT NULL DEFAULT true,
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'confirmed', 'rejected', 'ignored')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. REMINDERS TABLE
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('renewal_notice', 'trial_expiry', 'autopay_alert', 'price_change', 'custom')),
    delivery_channel TEXT NOT NULL DEFAULT 'in_app' CHECK (delivery_channel IN ('in_app', 'email', 'sms')),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
    timezone TEXT NOT NULL DEFAULT 'UTC',
    idempotency_key TEXT UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    default_lead_days INT NOT NULL DEFAULT 2 CHECK (default_lead_days >= 0),
    reminder_dispatch_time TIME NOT NULL DEFAULT '09:00:00',
    notify_on_trial_expiry BOOLEAN NOT NULL DEFAULT true,
    notify_on_renewal BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. NOTIFICATION DELIVERY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app', 'sms')),
    delivery_status TEXT NOT NULL CHECK (delivery_status IN ('queued', 'delivered', 'failed', 'blocked')),
    provider_reference TEXT,
    error_message TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

-- 9. CANCELLATION GUIDANCE HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.cancellation_guidance_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    merchant_name TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('cancel_vendor', 'revoke_autopay', 'pause_requested', 'view_guidance')),
    status TEXT NOT NULL CHECK (status IN ('guidance_viewed', 'mandate_revocation_marked', 'cancellation_confirmed_by_user', 'abandoned')),
    confirmation_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_subs_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subs_next_billing ON public.subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subs_trial_end ON public.subscriptions(trial_end_date);
CREATE INDEX IF NOT EXISTS idx_reminders_user_sched ON public.reminders(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);
CREATE INDEX IF NOT EXISTS idx_docs_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_extracted_user ON public.extracted_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);

-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_guidance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ROW LEVEL SECURITY POLICIES (Users can only access their own records)

-- profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- payment_sources policies
DROP POLICY IF EXISTS "Users can view own payment sources" ON public.payment_sources;
CREATE POLICY "Users can view own payment sources" ON public.payment_sources FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own payment sources" ON public.payment_sources;
CREATE POLICY "Users can insert own payment sources" ON public.payment_sources FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own payment sources" ON public.payment_sources;
CREATE POLICY "Users can update own payment sources" ON public.payment_sources FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own payment sources" ON public.payment_sources;
CREATE POLICY "Users can delete own payment sources" ON public.payment_sources FOR DELETE USING (auth.uid() = user_id);

-- subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions FOR DELETE USING (auth.uid() = user_id);

-- documents policies
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- extracted_transactions policies
DROP POLICY IF EXISTS "Users can view own extracted transactions" ON public.extracted_transactions;
CREATE POLICY "Users can view own extracted transactions" ON public.extracted_transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own extracted transactions" ON public.extracted_transactions;
CREATE POLICY "Users can insert own extracted transactions" ON public.extracted_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own extracted transactions" ON public.extracted_transactions;
CREATE POLICY "Users can update own extracted transactions" ON public.extracted_transactions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own extracted transactions" ON public.extracted_transactions;
CREATE POLICY "Users can delete own extracted transactions" ON public.extracted_transactions FOR DELETE USING (auth.uid() = user_id);

-- reminders policies
DROP POLICY IF EXISTS "Users can view own reminders" ON public.reminders;
CREATE POLICY "Users can view own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own reminders" ON public.reminders;
CREATE POLICY "Users can insert own reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own reminders" ON public.reminders;
CREATE POLICY "Users can update own reminders" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own reminders" ON public.reminders;
CREATE POLICY "Users can delete own reminders" ON public.reminders FOR DELETE USING (auth.uid() = user_id);

-- notification_preferences policies
DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own notification preferences" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own notification preferences" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own notification preferences" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);

-- notification_delivery_logs policies
DROP POLICY IF EXISTS "Users can view own delivery logs" ON public.notification_delivery_logs;
CREATE POLICY "Users can view own delivery logs" ON public.notification_delivery_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own delivery logs" ON public.notification_delivery_logs;
CREATE POLICY "Users can insert own delivery logs" ON public.notification_delivery_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- cancellation_guidance_history policies
DROP POLICY IF EXISTS "Users can view own cancellation history" ON public.cancellation_guidance_history;
CREATE POLICY "Users can view own cancellation history" ON public.cancellation_guidance_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own cancellation history" ON public.cancellation_guidance_history;
CREATE POLICY "Users can insert own cancellation history" ON public.cancellation_guidance_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- audit_logs policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AUTOMATIC TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_payment_sources_updated_at ON public.payment_sources;
CREATE TRIGGER update_payment_sources_updated_at BEFORE UPDATE ON public.payment_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_reminders_updated_at ON public.reminders;
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AUTOMATIC PROFILE CREATION ON USER SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, preferred_currency, timezone, theme_preference)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'INR',
        'Asia/Kolkata',
        'light'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.notification_preferences (user_id, email_enabled, in_app_enabled, sms_enabled, default_lead_days)
    VALUES (NEW.id, true, true, false, 2)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STORAGE BUCKET CONFIGURATION FOR INVOICES
-- Creates private 'invoices' bucket in Supabase storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES: scoped to authenticated user folder
DROP POLICY IF EXISTS "Users can upload own invoices" ON storage.objects;
CREATE POLICY "Users can upload own invoices" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own invoices" ON storage.objects;
CREATE POLICY "Users can view own invoices" ON storage.objects
    FOR SELECT USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own invoices" ON storage.objects;
CREATE POLICY "Users can delete own invoices" ON storage.objects
    FOR DELETE USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
