
-- 1. Create a private schema for trusted role assignments.
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Prevent client roles from accessing the private schema.
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- 3. Store admin assignments separately from user-editable profiles.
CREATE TABLE private.user_roles (
    user_id UUID PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role = 'admin'),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID
        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Preserve existing admin assignments before removing profiles.role.
INSERT INTO private.user_roles (user_id, role, assigned_by)
SELECT id, 'admin', NULL
FROM public.profiles
WHERE role = 'admin'
ON CONFLICT (user_id) DO NOTHING;


-- 4. Explicitly revoke client access to the role-assignment table.
REVOKE ALL ON TABLE private.user_roles
FROM PUBLIC, anon, authenticated;

-- 5. Remove broad table-level privileges from client roles.
REVOKE ALL ON TABLE public.profiles
FROM anon, authenticated;

-- 6. Allow authenticated users to read their own profile.
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- 7. Allow authenticated users to create their own profile.
GRANT INSERT (id, display_name)
ON TABLE public.profiles TO authenticated;

-- 8. Allow authenticated users to update their display name only.
GRANT UPDATE (display_name)
ON TABLE public.profiles TO authenticated;

-- 9. Remove the insecure, user-editable role column.
ALTER TABLE public.profiles DROP COLUMN role;

-- 10. Add profile fields useful for the application.
ALTER TABLE public.profiles
    ADD COLUMN avatar_url TEXT,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
