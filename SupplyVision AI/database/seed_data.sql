-- SupplyVision AI - Database Seed File

-- Seed Organisations
-- 1. Tamil Knitwear Exports (Textile SME)
-- 2. Pune Precision Parts (Auto Component SME)
INSERT INTO organisations (id, name, gstin, plan, max_suppliers, whatsapp_numbers, is_active)
VALUES 
('7c9e6679-7425-40de-944b-e07fc1f90ae7', 'Tamil Knitwear Exports', '33ABCDE1234F2Z0', 'starter', 25, ARRAY['+919876543210', '+919876543211'], TRUE),
('d2a3c77d-78cf-49b0-9b0d-b4cb6bf7135e', 'Pune Precision Parts', '27XYZAB5678C1Z2', 'growth', 75, ARRAY['+919988776655'], TRUE)
ON CONFLICT (gstin) DO NOTHING;

-- Seed Users
-- Passwords are hashed representation of "password" using bcrypt
-- Password Hash: $2b$12$dE7m85mG29sRzBihF/W8k.HlyX0Ww7k5YvjQWzJ7y2v62dK6w38iW (plain: password)
INSERT INTO users (id, org_id, email, phone_in, role, full_name, password_hash, preferred_lang, is_active)
VALUES
-- Platform level admin
('550e8400-e29b-41d4-a716-446655440000', NULL, 'admin@supplyvision.ai', '+919999999999', 'super_admin', 'Super Admin Root', '$2b$12$dE7m85mG29sRzBihF/W8k.HlyX0Ww7k5YvjQWzJ7y2v62dK6w38iW', 'en', TRUE),

-- Tamil Knitwear Exports Users (Tirupur Cluster)
-- SME Owner (Ramesh)
('1a3b5c7d-9e0f-4a3b-8c7d-9e0f4a3b8c7d', '7c9e6679-7425-40de-944b-e07fc1f90ae7', 'ramesh@tamilknitwear.com', '+919876543210', 'sme_owner', 'Ramesh MillOwner', '$2b$12$dE7m85mG29sRzBihF/W8k.HlyX0Ww7k5YvjQWzJ7y2v62dK6w38iW', 'hi', TRUE),
-- SC Manager (Priya)
('2b4c6d8e-0f1a-4b3c-9d8e-0f1a2b3c4d5e', '7c9e6679-7425-40de-944b-e07fc1f90ae7', 'priya@tamilknitwear.com', '+919876543211', 'sc_manager', 'Priya Procurement', '$2b$12$dE7m85mG29sRzBihF/W8k.HlyX0Ww7k5YvjQWzJ7y2v62dK6w38iW', 'en', TRUE),
-- Warehouse Staff (Suresh)
('3c5d7e9f-1a2b-4c3d-0e1f-2a3b4c5d6e7f', '7c9e6679-7425-40de-944b-e07fc1f90ae7', 'suresh@tamilknitwear.com', '+919876543212', 'warehouse_staff', 'Suresh Storekeeper', '$2b$12$dE7m85mG29sRzBihF/W8k.HlyX0Ww7k5YvjQWzJ7y2v62dK6w38iW', 'hi', TRUE),
-- Auditor (CA Anjali)
('4d6e8f0a-2b3c-4d5e-1f2a-3b4c5d6e7f8a', '7c9e6679-7425-40de-944b-e07fc1f90ae7', 'anjali@ca-associates.in', '+919876543213', 'auditor', 'CA Anjali Auditor', '$2b$12$dE7m85mG29sRzBihF/W8k.HlyX0Ww7k5YvjQWzJ7y2v62dK6w38iW', 'en', TRUE)
ON CONFLICT (email) DO NOTHING;
