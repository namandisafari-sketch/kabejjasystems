-- Add school-specific fee receipt settings columns
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS show_stamp_area boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS stamp_title text DEFAULT 'Official Stamp',
ADD COLUMN IF NOT EXISTS show_verification_qr boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_school_motto boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS school_motto text,
ADD COLUMN IF NOT EXISTS show_term_info boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_class_info boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_balance_info boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS receipt_title text DEFAULT 'OFFICIAL FEE PAYMENT RECEIPT',
ADD COLUMN IF NOT EXISTS signature_title text DEFAULT 'Authorized Signature',
ADD COLUMN IF NOT EXISTS show_signature_line boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS receipt_copies integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS watermark_text text;