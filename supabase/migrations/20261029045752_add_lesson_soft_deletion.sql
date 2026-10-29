ALTER TABLE public.lessons
ADD COLUMN deleted_at TIMESTAMPTZ,
ADD COLUMN purge_after TIMESTAMPTZ;

ALTER TABLE public.lessons
ADD CONSTRAINT lessons_soft_delete_consistency_check
CHECK (
    (deleted_at IS NULL AND purge_after IS NULL)
    OR
    (
        deleted_at IS NOT NULL
        AND purge_after IS NOT NULL
        AND purge_after >= deleted_at
    )
);