-- RecurSight Seed Data
-- Reference data matching Figma screenshots

-- Note: Replace with authenticated user UUID when running manually, or used for local supabase testing
-- Example user UUID: '00000000-0000-0000-0000-000000000000'

DO $$
DECLARE
    demo_user_id UUID := 'a0000000-0000-0000-0000-000000000001';
    ps_chase UUID;
    ps_hdfc UUID;
    ps_icici_upi UUID;
    sub_netflix UUID;
    sub_figma UUID;
    sub_adobe UUID;
    sub_canva UUID;
    sub_notion UUID;
    sub_claude UUID;
    sub_perplexity UUID;
    sub_fastspring UUID;
BEGIN
    -- Only seed if the demo user exists in profiles or auth
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = demo_user_id) THEN
        -- Insert Payment Sources
        INSERT INTO public.payment_sources (id, user_id, provider_name, display_name, source_type, last_four, is_active)
        VALUES 
            (uuid_generate_v4(), demo_user_id, 'Chase Bank', 'Chase Sapphire Reserve', 'credit_card', '4821', true)
            RETURNING id INTO ps_chase;

        INSERT INTO public.payment_sources (id, user_id, provider_name, display_name, source_type, last_four, is_active)
        VALUES 
            (uuid_generate_v4(), demo_user_id, 'HDFC Bank', 'HDFC Diners Club', 'credit_card', '4291', true)
            RETURNING id INTO ps_hdfc;

        INSERT INTO public.payment_sources (id, user_id, provider_name, display_name, source_type, last_four, is_active)
        VALUES 
            (uuid_generate_v4(), demo_user_id, 'ICICI Bank', 'ICICI UPI AutoPay', 'upi_autopay', '9012', true)
            RETURNING id INTO ps_icici_upi;

        -- Insert Subscriptions
        INSERT INTO public.subscriptions (
            id, user_id, merchant_name, category, amount, currency, billing_interval, billing_interval_unit, 
            next_billing_date, trial_start_date, trial_end_date, payment_source_id, status, confidence_status, notes
        ) VALUES 
            (uuid_generate_v4(), demo_user_id, 'Figma Organization', 'Design', 15.00, 'USD', 1, 'months', 
             CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE - INTERVAL '11 days', CURRENT_DATE + INTERVAL '3 days', ps_chase, 'trial', 'verified', 'Design seat allocation')
            RETURNING id INTO sub_figma;

        INSERT INTO public.subscriptions (
            id, user_id, merchant_name, category, amount, currency, billing_interval, billing_interval_unit, 
            next_billing_date, trial_start_date, trial_end_date, payment_source_id, status, confidence_status, notes
        ) VALUES 
            (uuid_generate_v4(), demo_user_id, 'Adobe After Effects', 'Design', 14.95, 'USD', 1, 'months', 
             CURRENT_DATE + INTERVAL '6 days', CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE + INTERVAL '6 days', ps_hdfc, 'trial', 'verified', 'Motion graphics suite')
            RETURNING id INTO sub_adobe;

        INSERT INTO public.subscriptions (
            id, user_id, merchant_name, category, amount, currency, billing_interval, billing_interval_unit, 
            next_billing_date, payment_source_id, status, confidence_status, notes
        ) VALUES 
            (uuid_generate_v4(), demo_user_id, 'Netflix Premium', 'Entertainment', 19.99, 'USD', 1, 'months', 
             CURRENT_DATE + INTERVAL '12 days', ps_chase, 'active', 'verified', '4K UHD 4 Screen stream')
            RETURNING id INTO sub_netflix;

        INSERT INTO public.subscriptions (
            id, user_id, merchant_name, category, amount, currency, billing_interval, billing_interval_unit, 
            next_billing_date, payment_source_id, status, confidence_status, notes
        ) VALUES 
            (uuid_generate_v4(), demo_user_id, 'Claude Pro', 'AI Assist', 20.00, 'USD', 1, 'months', 
             CURRENT_DATE + INTERVAL '18 days', ps_chase, 'active', 'verified', 'Anthropic reasoning models')
            RETURNING id INTO sub_claude;

        INSERT INTO public.subscriptions (
            id, user_id, merchant_name, category, amount, currency, billing_interval, billing_interval_unit, 
            next_billing_date, payment_source_id, status, confidence_status, notes
        ) VALUES 
            (uuid_generate_v4(), demo_user_id, 'Canva Pro', 'Design', 12.99, 'USD', 1, 'months', 
             CURRENT_DATE + INTERVAL '22 days', ps_hdfc, 'active', 'verified', 'Marketing collaterals')
            RETURNING id INTO sub_canva;

        INSERT INTO public.subscriptions (
            id, user_id, merchant_name, category, amount, currency, billing_interval, billing_interval_unit, 
            next_billing_date, payment_source_id, status, confidence_status, notes
        ) VALUES 
            (uuid_generate_v4(), demo_user_id, 'Notion AI Plus', 'Productivity', 10.00, 'USD', 1, 'months', 
             CURRENT_DATE + INTERVAL '5 days', ps_hdfc, 'active', 'verified', 'Team wiki and workspace')
            RETURNING id INTO sub_notion;

        INSERT INTO public.subscriptions (
            id, user_id, merchant_name, category, amount, currency, billing_interval, billing_interval_unit, 
            next_billing_date, payment_source_id, status, confidence_status, notes
        ) VALUES 
            (uuid_generate_v4(), demo_user_id, 'Perplexity Pro', 'AI Assist', 20.00, 'USD', 1, 'months', 
             CURRENT_DATE + INTERVAL '27 days', ps_icici_upi, 'active', 'verified', 'Search and research')
            RETURNING id INTO sub_perplexity;

        INSERT INTO public.subscriptions (
            id, user_id, merchant_name, category, amount, currency, billing_interval, billing_interval_unit, 
            next_billing_date, payment_source_id, status, confidence_status, notes
        ) VALUES 
            (uuid_generate_v4(), demo_user_id, 'FastSpring (Paddle / MacPaw)', 'Software & Tools', 54.99, 'USD', 1, 'years', 
             CURRENT_DATE + INTERVAL '28 days', ps_chase, 'needs_review', 'unconfirmed_estimate', 'Identified via statement string')
            RETURNING id INTO sub_fastspring;

        -- Insert Reminders
        INSERT INTO public.reminders (user_id, subscription_id, scheduled_at, reminder_type, delivery_channel, status)
        VALUES 
            (demo_user_id, sub_figma, NOW() + INTERVAL '1 day', 'trial_expiry', 'email', 'scheduled'),
            (demo_user_id, sub_notion, NOW() + INTERVAL '3 days', 'renewal_notice', 'in_app', 'scheduled'),
            (demo_user_id, sub_adobe, NOW() + INTERVAL '4 days', 'trial_expiry', 'in_app', 'scheduled');

        -- Insert Guidance History
        INSERT INTO public.cancellation_guidance_history (user_id, subscription_id, merchant_name, action_type, status, notes)
        VALUES 
            (demo_user_id, sub_netflix, 'Netflix', 'view_guidance', 'guidance_viewed', 'Opened official cancellation settings portal'),
            (demo_user_id, sub_adobe, 'Adobe Creative Cloud', 'view_guidance', 'guidance_viewed', 'Checked plan retention offer');
    END IF;
END $$;
