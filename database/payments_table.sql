-- Create fees table for storing monthly payment data according to the new schema
CREATE TABLE IF NOT EXISTS public.fees (
    id TEXT NOT NULL,
    "Jan" TEXT[] NULL,
    "Feb" TEXT[] NULL,
    "Mar" TEXT[] NULL,
    "Apr" TEXT[] NULL,
    "May" TEXT[] NULL,
    "Jun" TEXT[] NULL,
    "Jul" TEXT[] NULL,
    "Aug" TEXT[] NULL,
    "Sept" TEXT[] NULL,
    "Oct" TEXT[] NULL,
    "Nov" TEXT[] NULL,
    "Dec" TEXT[] NULL,
    fees_total NUMERIC NULL,
    CONSTRAINT fees_pkey PRIMARY KEY (id),
    CONSTRAINT fees_fees_total_key UNIQUE (fees_total),
    CONSTRAINT fees_id_fkey FOREIGN KEY (id) REFERENCES courses (id) ON UPDATE CASCADE ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create users table if it doesn't exist (according to the provided schema)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    name TEXT NOT NULL DEFAULT 'Guest'::TEXT,
    email TEXT NOT NULL DEFAULT 'guest@email.com'::TEXT,
    role TEXT NOT NULL DEFAULT 'guest'::TEXT,
    phone_no TEXT NOT NULL DEFAULT '+9190000000000'::TEXT,
    alternative_phone_no TEXT NULL,
    address TEXT NOT NULL DEFAULT '46, ABC Road, Unnoyoner Pod, Kolkata-700003'::TEXT,
    dob DATE NOT NULL DEFAULT '2006-01-01'::DATE,
    univ_name TEXT NOT NULL DEFAULT 'Manushmara University'::TEXT,
    enrollment_date DATE NULL,
    current_sem SMALLINT NULL,
    last_promotion_date DATE NULL,
    expertise TEXT NULL DEFAULT ''::TEXT,
    hire_date DATE NULL,
    user_image TEXT NOT NULL DEFAULT 'https://ideogram.ai/assets/image/lossless/response/SkOxfnd_TdKmbNfTZ1ObbA'::TEXT,
    gender TEXT NULL DEFAULT '''Other''::text'::TEXT,
    requested_role TEXT NULL DEFAULT ''::TEXT,
    CONSTRAINT users_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create storage bucket for payment screenshots if it doesn't exist
-- Note: This needs to be run in the Supabase Storage section, not SQL editor
-- INSERT INTO storage.buckets (id, name, public) VALUES ('inside-inspiration-academy-assets', 'inside-inspiration-academy-assets', true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS fees_id_idx ON fees(id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

-- Enable Row Level Security (RLS)
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for fees table
-- Allow authenticated users to read their own course fees
CREATE POLICY "Users can view their course fees" ON fees
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

-- Allow authenticated users to update fees (for payment submissions)
CREATE POLICY "Users can update fees for payment" ON fees
    FOR UPDATE USING (
        auth.uid() IS NOT NULL
    );

-- Allow insertion of new fees records
CREATE POLICY "Allow fees insertion" ON fees
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- Allow admins to view and modify all fees
CREATE POLICY "Admins can manage all fees" ON fees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text 
            AND role IN ('admin', 'teacher')
        )
    );

-- Create policies for users table
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid()::text);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid()::text);

-- Allow user registration (insert)
CREATE POLICY "Allow user registration" ON users
    FOR INSERT WITH CHECK (id = auth.uid()::text);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text 
            AND role IN ('admin', 'teacher')
        )
    );

-- Create function to handle payment status updates (for admin use)
CREATE OR REPLACE FUNCTION update_payment_status(
    course_id_param TEXT,
    month_param TEXT,
    user_id_param TEXT,
    new_status TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_data JSONB[];
    updated_data JSONB[];
    payment_record JSONB;
    i INTEGER;
BEGIN
    -- Get current month data
    EXECUTE format('SELECT "%s" FROM fees WHERE id = $1', month_param)
    INTO current_data
    USING course_id_param;
    
    IF current_data IS NULL THEN
        RETURN FALSE;
    END IF;
    
    updated_data := ARRAY[]::JSONB[];
    
    -- Update the specific user's payment status
    FOR i IN 1..array_length(current_data, 1) LOOP
        payment_record := current_data[i];
        
        IF payment_record->>'user_id' = user_id_param THEN
            payment_record := jsonb_set(payment_record, '{status}', to_jsonb(new_status));
        END IF;
        
        updated_data := array_append(updated_data, payment_record);
    END LOOP;
    
    -- Update the fees table
    EXECUTE format('UPDATE fees SET "%s" = $1 WHERE id = $2', month_param)
    USING updated_data, course_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON fees TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT EXECUTE ON FUNCTION update_payment_status TO authenticated;

-- Create a view for admin payment verification
CREATE OR REPLACE VIEW payment_verification_view AS
SELECT 
    f.id as course_id,
    c.full_name as course_name,
    c.codename,
    f.fees_total,
    CASE 
        WHEN f."Jan" IS NOT NULL THEN jsonb_build_object('month', 'Jan', 'payments', f."Jan")
        WHEN f."Feb" IS NOT NULL THEN jsonb_build_object('month', 'Feb', 'payments', f."Feb")
        WHEN f."Mar" IS NOT NULL THEN jsonb_build_object('month', 'Mar', 'payments', f."Mar")
        WHEN f."Apr" IS NOT NULL THEN jsonb_build_object('month', 'Apr', 'payments', f."Apr")
        WHEN f."May" IS NOT NULL THEN jsonb_build_object('month', 'May', 'payments', f."May")
        WHEN f."Jun" IS NOT NULL THEN jsonb_build_object('month', 'Jun', 'payments', f."Jun")
        WHEN f."Jul" IS NOT NULL THEN jsonb_build_object('month', 'Jul', 'payments', f."Jul")
        WHEN f."Aug" IS NOT NULL THEN jsonb_build_object('month', 'Aug', 'payments', f."Aug")
        WHEN f."Sept" IS NOT NULL THEN jsonb_build_object('month', 'Sept', 'payments', f."Sept")
        WHEN f."Oct" IS NOT NULL THEN jsonb_build_object('month', 'Oct', 'payments', f."Oct")
        WHEN f."Nov" IS NOT NULL THEN jsonb_build_object('month', 'Nov', 'payments', f."Nov")
        WHEN f."Dec" IS NOT NULL THEN jsonb_build_object('month', 'Dec', 'payments', f."Dec")
    END as payment_data
FROM fees f
JOIN courses c ON f.id = c.id
WHERE f."Jan" IS NOT NULL OR f."Feb" IS NOT NULL OR f."Mar" IS NOT NULL OR f."Apr" IS NOT NULL OR 
      f."May" IS NOT NULL OR f."Jun" IS NOT NULL OR f."Jul" IS NOT NULL OR f."Aug" IS NOT NULL OR 
      f."Sept" IS NOT NULL OR f."Oct" IS NOT NULL OR f."Nov" IS NOT NULL OR f."Dec" IS NOT NULL;

-- Grant permissions for the view
GRANT SELECT ON payment_verification_view TO authenticated;

-- Create function to get user payment history
CREATE OR REPLACE FUNCTION get_user_payment_history(user_id_param TEXT)
RETURNS TABLE (
    course_id TEXT,
    course_name TEXT,
    month TEXT,
    transaction_id TEXT,
    status TEXT,
    screenshot_url TEXT
) AS $$
DECLARE
    month_names TEXT[] := ARRAY['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    month_name TEXT;
    payment_data JSONB[];
    payment JSONB;
BEGIN
    FOR month_name IN SELECT unnest(month_names) LOOP
        FOR course_id, course_name, payment_data IN 
            EXECUTE format('
                SELECT f.id, c.full_name, f."%s"
                FROM fees f
                JOIN courses c ON f.id = c.id
                WHERE f."%s" IS NOT NULL
            ', month_name, month_name)
        LOOP
            IF payment_data IS NOT NULL THEN
                FOR payment IN SELECT jsonb_array_elements(to_jsonb(payment_data)) LOOP
                    IF payment->>'user_id' = user_id_param THEN
                        RETURN QUERY SELECT 
                            course_id,
                            course_name,
                            month_name,
                            payment->>'txn_id',
                            payment->>'status',
                            payment->>'ss_uploaded_path';
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION get_user_payment_history TO authenticated;
