-- Initialize ContextBridge database with required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a test user and project for development/demo
-- This will only run if tables exist (after migrations)
DO $$
BEGIN
    -- Check if users table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        -- Insert demo user if not exists
        INSERT INTO users (id, email, password_hash, first_name, last_name, email_verified, created_at, updated_at)
        VALUES (
            '550e8400-e29b-41d4-a716-446655440001',
            'demo@contextbridge.com',
            '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewTuAJhd.id8.k/u', -- password: demo123456
            'Demo',
            'User',
            true,
            NOW(),
            NOW()
        ) ON CONFLICT (email) DO NOTHING;
        
        -- Insert demo project if not exists
        INSERT INTO projects (id, user_id, name, description, tags, status, last_activity_at, created_at, updated_at)
        VALUES (
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440001',
            'My First AI Project',
            'A sample project to demonstrate ContextBridge functionality',
            '["demo", "sample", "getting-started"]',
            'active',
            NOW(),
            NOW(),
            NOW()
        ) ON CONFLICT (id) DO NOTHING;
    END IF;
END
$$;