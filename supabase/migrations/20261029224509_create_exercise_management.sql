
-- 1. Upgrade the existing exercises table
-- Existing exercise table is empty, so adding NOT NULL columns
-- does not require a data backfill.

ALTER TABLE public.exercises
ADD COLUMN slug VARCHAR(180) NOT NULL,
ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE public.exercises
ADD CONSTRAINT exercises_status_check
CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE public.exercises
ADD CONSTRAINT exercises_lesson_slug_unique
UNIQUE (lesson_id, slug);

ALTER TABLE public.exercises
ADD CONSTRAINT exercises_slug_not_empty
CHECK (LENGTH(TRIM(slug)) > 0);


-- 2. Language-specific exercise configurations

CREATE TABLE public.exercise_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    exercise_id UUID NOT NULL
        REFERENCES public.exercises(id) ON DELETE CASCADE,

    language TEXT NOT NULL
        CHECK (language IN ('javascript', 'python', 'cpp')),

    runtime_version TEXT NOT NULL,

    execution_mode TEXT NOT NULL
        CHECK (execution_mode IN ('function', 'stdin')),

    starter_code TEXT NOT NULL,

    entry_point TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT exercise_languages_exercise_language_unique
        UNIQUE (exercise_id, language),

    CONSTRAINT exercise_languages_runtime_version_nonempty
        CHECK (LENGTH(TRIM(runtime_version)) > 0),

    CONSTRAINT exercise_languages_starter_code_nonempty
        CHECK (LENGTH(TRIM(starter_code)) > 0)
);


-- 3. Exercise test cases
-- Hidden and visible cases are stored separately from exercises.

CREATE TABLE public.exercise_test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    exercise_id UUID NOT NULL
        REFERENCES public.exercises(id) ON DELETE CASCADE,

    input_data JSONB NOT NULL,

    expected_output JSONB NOT NULL,

    visibility TEXT NOT NULL
        CHECK (visibility IN ('visible', 'hidden')),

    display_order INTEGER NOT NULL DEFAULT 0
        CHECK (display_order >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 4. Private reference solutions
-- Solutions belong to a language configuration.
-- A separate private table prevents accidental inclusion
-- in student-facing language queries.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE private.exercise_language_solutions (
    language_id UUID PRIMARY KEY
        REFERENCES public.exercise_languages(id) ON DELETE CASCADE,

    solution_code TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT exercise_language_solutions_code_nonempty
        CHECK (LENGTH(TRIM(solution_code)) > 0)
);


-- 5. Indexes

-- The composite index replaces the existing lesson-only index.
DROP INDEX IF EXISTS public.exercises_lesson_id_idx;

CREATE INDEX exercises_lesson_status_position_idx
ON public.exercises (lesson_id, status, position);

CREATE INDEX exercise_languages_exercise_id_idx
ON public.exercise_languages (exercise_id);

CREATE INDEX exercise_test_cases_exercise_visibility_order_idx
ON public.exercise_test_cases (
    exercise_id,
    visibility,
    display_order
);


-- 6. Enable Row Level Security

-- Existing exercises table already has RLS enabled.
ALTER TABLE public.exercise_languages
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exercise_test_cases
ENABLE ROW LEVEL SECURITY;

ALTER TABLE private.exercise_language_solutions
ENABLE ROW LEVEL SECURITY;

-- No student-facing policies are created here.
-- Express repositories are responsible for controlled access.
-- The current PostgreSQL pool uses the postgres role, which
-- normally bypasses RLS.


-- 7. Updated-at trigger function

CREATE OR REPLACE FUNCTION public.set_exercise_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- 8. Updated-at triggers

CREATE TRIGGER exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.set_exercise_updated_at();

CREATE TRIGGER exercise_languages_updated_at
BEFORE UPDATE ON public.exercise_languages
FOR EACH ROW
EXECUTE FUNCTION public.set_exercise_updated_at();

CREATE TRIGGER exercise_test_cases_updated_at
BEFORE UPDATE ON public.exercise_test_cases
FOR EACH ROW
EXECUTE FUNCTION public.set_exercise_updated_at();

CREATE TRIGGER exercise_language_solutions_updated_at
BEFORE UPDATE ON private.exercise_language_solutions
FOR EACH ROW
EXECUTE FUNCTION public.set_exercise_updated_at();


-- 9. Remove obsolete exercise-level fields
-- Starter code and solutions now belong to language configurations.
-- Test cases now belong to exercise_test_cases.

ALTER TABLE public.exercises
DROP COLUMN starter_code,
DROP COLUMN solution_code,
DROP COLUMN test_cases;
