
-- Add profile fields without deleting existing profile data.
ALTER TABLE public.profiles
    ADD COLUMN avatar_url TEXT,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Store privileged roles separately from user-editable profiles.
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE private.user_roles (
    user_id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    role TEXT NOT NULL
        CHECK (role IN ('admin')),

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    assigned_by UUID
        REFERENCES auth.users(id)
        ON DELETE SET NULL
);

-- Prevent ordinary application roles from directly accessing
-- the administrator-role table.
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.user_roles FROM PUBLIC, anon, authenticated;

-- Remove the self-assignable role column.
ALTER TABLE public.profiles
    DROP COLUMN role;
