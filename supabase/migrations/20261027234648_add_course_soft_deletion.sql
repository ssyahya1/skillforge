
-- Add soft-deletion fields to courses.
-- IF NOT EXISTS makes this safe for the columns already added
-- manually in the remote Supabase database.

ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS purge_after TIMESTAMPTZ;

-- Add the constraint only if it does not already exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'courses_deletion_timestamps_check'
          AND conrelid = 'public.courses'::regclass
    ) THEN
        ALTER TABLE public.courses
        ADD CONSTRAINT courses_deletion_timestamps_check
        CHECK (
            (deleted_at IS NULL AND purge_after IS NULL)
            OR
            (
                deleted_at IS NOT NULL
                AND purge_after IS NOT NULL
                AND purge_after >= deleted_at
            )
        );
    END IF;
END
$$;
