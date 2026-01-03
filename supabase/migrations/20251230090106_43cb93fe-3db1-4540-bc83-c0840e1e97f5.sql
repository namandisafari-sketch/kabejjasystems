-- Insert rental ID cards and payment proofs modules
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES 
  ('rental_id_cards', 'Rental ID Cards', 'Issue and manage tenant ID cards for identification and payment verification', 'CreditCard', 'rental', ARRAY['rental_management'], false, true, 75),
  ('rental_payment_proofs', 'Payment Proofs', 'Review and verify tenant payment submissions', 'Receipt', 'rental', ARRAY['rental_management'], false, true, 76)
ON CONFLICT (code) DO NOTHING;