-- =====================================================
-- KABEJJA SYSTEMS - SIMPLE TEST DATA
-- =====================================================
-- Just creates 7 test tenants
-- Run in Supabase SQL Editor
-- =====================================================

INSERT INTO tenants (id, name, business_type, email, phone, address, status) VALUES
('11111111-1111-1111-1111-111111111111', 'Bright Future Academy', 'school', 'school@test.kabejja.com', '+256700111111', 'Kampala, Uganda', 'active'),
('22222222-2222-2222-2222-222222222222', 'SuperMart Uganda', 'retail', 'retail@test.kabejja.com', '+256700222222', 'Ntinda, Kampala', 'active'),
('33333333-3333-3333-3333-333333333333', 'Tasty Bites Restaurant', 'restaurant', 'restaurant@test.kabejja.com', '+256700333333', 'Kololo, Kampala', 'active'),
('44444444-4444-4444-4444-444444444444', 'Paradise Lodge', 'hotel', 'hotel@test.kabejja.com', '+256700444444', 'Jinja Road, Kampala', 'active'),
('55555555-5555-5555-5555-555555555555', 'Glamour Beauty Salon', 'salon', 'salon@test.kabejja.com', '+256700555555', 'Garden City, Kampala', 'active'),
('66666666-6666-6666-6666-666666666666', 'HealthPlus Clinic', 'healthcare', 'healthcare@test.kabejja.com', '+256700666666', 'Nakawa, Kampala', 'active'),
('77777777-7777-7777-7777-777777777777', 'AutoFix Garage', 'garage', 'garage@test.kabejja.com', '+256700777777', 'Ndeeba, Kampala', 'active')
ON CONFLICT (id) DO NOTHING;

SELECT 
    '✅ 7 Test tenants created!' as status,
    'Now create Firebase Auth users with these emails and password: Test123!' as next_step,
    'You can add products/customers later through the app UI' as note;
