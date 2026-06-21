-- SupplyVision AI - PostgreSQL Schema Definition

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organisations Table
CREATE TABLE IF NOT EXISTS organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) UNIQUE,
    plan VARCHAR(50) NOT NULL DEFAULT 'starter', -- starter | growth | enterprise
    max_suppliers INTEGER NOT NULL DEFAULT 25,
    whatsapp_numbers TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE, -- null for super_admin
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_in VARCHAR(20),
    role VARCHAR(50) NOT NULL, -- super_admin | sme_owner | sc_manager | warehouse_staff | auditor
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    preferred_lang VARCHAR(10) NOT NULL DEFAULT 'en', -- en | hi
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Index for authentication email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- Index for tenant isolation filtering
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);

-- Alert Events Table
CREATE TABLE IF NOT EXISTS alert_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL, -- Reference to Neo4j node
    node_type VARCHAR(50) NOT NULL, -- Supplier | Port | Route | Warehouse
    risk_score INTEGER NOT NULL, -- 0 to 100
    rupees_at_risk BIGINT NOT NULL, -- stored in rupees (or paise if decimals, let's store in rupees for ease)
    signals_json JSONB NOT NULL DEFAULT '[]', -- contributing signal items
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- open | in_progress | resolved | false_positive
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_org ON alert_events(org_id);
CREATE INDEX IF NOT EXISTS idx_alerts_node ON alert_events(node_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alert_events(status);

-- Recovery Plans Table
CREATE TABLE IF NOT EXISTS recovery_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alert_events(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    options_json JSONB NOT NULL, -- List of ranked RecoveryOption objects
    accepted_option_idx INTEGER, -- index in the options list (null if none)
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_alert ON recovery_plans(alert_id);
CREATE INDEX IF NOT EXISTS idx_recovery_org ON recovery_plans(org_id);

-- Audit Log Table (Append-Only)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g. 'accepted_recovery_plan', 'added_supplier', 'role_changed'
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    meta_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
