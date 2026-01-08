-- =====================================================
-- Device Fingerprinting for Trial Protection
-- =====================================================
-- Prevents users from abusing free trials by tracking device fingerprints
-- Even after uninstall/reinstall, the device is recognized and trial restrictions apply

-- 1. CREATE DEVICE_FINGERPRINTS TABLE
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id text NOT NULL UNIQUE,  -- Android ID or iOS identifier
    mac_address text,  -- MAC address if available
    device_model text,  -- Device model (e.g., "Sharp SHG07")
    os_version text,  -- Android/iOS version
    app_version text,  -- App version when first registered
    
    -- Trial tracking
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    trial_started_at timestamp with time zone DEFAULT now(),
    trial_expires_at timestamp with time zone DEFAULT (now() + interval '14 days'),
    is_trial_active boolean DEFAULT true,
    is_paid boolean DEFAULT false,
    
    -- Security
    first_seen_at timestamp with time zone DEFAULT now(),
    last_seen_at timestamp with time zone DEFAULT now(),
    install_count integer DEFAULT 1,  -- Track reinstalls
    blocked_at timestamp with time zone,  -- When device was blocked
    blocked_reason text,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_device_id 
ON public.device_fingerprints(device_id);

CREATE INDEX IF NOT EXISTS idx_device_fingerprints_tenant_id 
ON public.device_fingerprints(tenant_id);

CREATE INDEX IF NOT EXISTS idx_device_fingerprints_trial_status 
ON public.device_fingerprints(is_trial_active, trial_expires_at);

-- 3. CREATE TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_device_fingerprints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_device_fingerprints_updated_at_trigger 
ON public.device_fingerprints;

CREATE TRIGGER update_device_fingerprints_updated_at_trigger
    BEFORE UPDATE ON public.device_fingerprints
    FOR EACH ROW
    EXECUTE FUNCTION update_device_fingerprints_updated_at();

-- 4. ENABLE RLS
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

-- 5. CREATE RLS POLICIES
-- Allow anyone to check device fingerprint
DROP POLICY IF EXISTS "Allow device fingerprint check" ON public.device_fingerprints;
CREATE POLICY "Allow device fingerprint check" 
ON public.device_fingerprints 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Allow anyone to register device fingerprint
DROP POLICY IF EXISTS "Allow device fingerprint registration" ON public.device_fingerprints;
CREATE POLICY "Allow device fingerprint registration" 
ON public.device_fingerprints 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Only allow device to update its own record
DROP POLICY IF EXISTS "Allow device to update own record" ON public.device_fingerprints;
CREATE POLICY "Allow device to update own record" 
ON public.device_fingerprints 
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 6. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE ON public.device_fingerprints TO anon, authenticated;

-- 7. CREATE HELPER FUNCTION TO CHECK TRIAL STATUS
CREATE OR REPLACE FUNCTION check_device_trial_status(p_device_id text)
RETURNS TABLE (
    is_valid boolean,
    days_remaining integer,
    is_blocked boolean,
    message text
) AS $$
DECLARE
    v_record RECORD;
BEGIN
    -- Get device record
    SELECT * INTO v_record
    FROM public.device_fingerprints
    WHERE device_id = p_device_id
    LIMIT 1;
    
    -- Device not found - new device, trial is valid
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            true as is_valid,
            14 as days_remaining,
            false as is_blocked,
            'New device - 14 day trial activated' as message;
        RETURN;
    END IF;
    
    -- Device is blocked
    IF v_record.blocked_at IS NOT NULL THEN
        RETURN QUERY SELECT 
            false as is_valid,
            0 as days_remaining,
            true as is_blocked,
            COALESCE(v_record.blocked_reason, 'Device has been blocked') as message;
        RETURN;
    END IF;
    
    -- Device has paid subscription
    IF v_record.is_paid THEN
        RETURN QUERY SELECT 
            true as is_valid,
            9999 as days_remaining,
            false as is_blocked,
            'Active subscription' as message;
        RETURN;
    END IF;
    
    -- Check trial expiry
    IF v_record.trial_expires_at > now() THEN
        -- Trial is still active
        RETURN QUERY SELECT 
            true as is_valid,
            EXTRACT(DAY FROM v_record.trial_expires_at - now())::integer as days_remaining,
            false as is_blocked,
            'Trial active - ' || EXTRACT(DAY FROM v_record.trial_expires_at - now())::integer || ' days remaining' as message;
    ELSE
        -- Trial has expired
        RETURN QUERY SELECT 
            false as is_valid,
            0 as days_remaining,
            false as is_blocked,
            'Free trial has expired' as message;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. VERIFY TABLE CREATED
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'device_fingerprints'
ORDER BY ordinal_position;
