CREATE TABLE  IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT course_enrollments_user_course_unique UNIQUE (user_id, course_id),
    CONSTRAINT course_enrollments_completed_at_check CHECK (
        (
            status = 'completed'
            AND completed_at IS NOT NULL
        )
        OR (
            status <> 'completed'
            AND completed_at IS NULL
        )
    )
);

CREATE TABLE  IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    content_completed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT lesson_progress_enrollment_lesson_unique UNIQUE (enrollment_id, lesson_id),
    CONSTRAINT lesson_progress_completed_at_check CHECK (
        (
            status = 'completed'
            AND completed_at IS NOT NULL
        )
        OR (
            status = 'in_progress'
            AND completed_at IS NULL
        )
    )
);

CREATE TABLE  IF NOT EXISTS public.exercise_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0),
    completed_at TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT exercise_progress_enrollment_exercise_unique UNIQUE (enrollment_id, exercise_id),
    CONSTRAINT exercise_progress_completed_at_check CHECK (
        (
            status = 'completed'
            AND completed_at IS NOT NULL
        )
        OR (
            status = 'in_progress'
            AND completed_at IS NULL
        )
    )
);

CREATE INDEX IF NOT EXISTS course_enrollments_user_status_idx ON public.course_enrollments(user_id, status);

CREATE INDEX IF NOT EXISTS course_enrollments_course_idx ON public.course_enrollments(course_id);

CREATE INDEX IF NOT EXISTS lesson_progress_enrollment_idx ON public.lesson_progress(enrollment_id);

CREATE INDEX IF NOT EXISTS lesson_progress_lesson_idx ON public.lesson_progress(lesson_id);

CREATE INDEX IF NOT EXISTS exercise_progress_enrollment_idx ON public.exercise_progress(enrollment_id);

CREATE INDEX IF NOT EXISTS exercise_progress_exercise_idx ON public.exercise_progress(exercise_id);

CREATE
OR REPLACE FUNCTION public.validate_lesson_progress_course() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NOT EXISTS (
    SELECT
        1
    FROM
        public.course_enrollments ce
        JOIN public.lessons l ON l.id = NEW.lesson_id
    WHERE
        ce.id = NEW.enrollment_id
        AND ce.course_id = l.course_id
) THEN RAISE EXCEPTION 'Lesson does not belong to the enrolled course' USING ERRCODE = '23514';

END IF;

RETURN NEW;

END;

$$;

CREATE TRIGGER validate_lesson_progress_course_trigger BEFORE
INSERT
    OR
UPDATE
    OF enrollment_id,
    lesson_id ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.validate_lesson_progress_course();

CREATE
OR REPLACE FUNCTION public.validate_exercise_progress_course() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NOT EXISTS (
    SELECT
        1
    FROM
        public.course_enrollments ce
        JOIN public.exercises e ON e.id = NEW.exercise_id
        JOIN public.lessons l ON l.id = e.lesson_id
    WHERE
        ce.id = NEW.enrollment_id
        AND ce.course_id = l.course_id
) THEN RAISE EXCEPTION 'Exercise does not belong to the enrolled course' USING ERRCODE = '23514';

END IF;

RETURN NEW;

END;

$$;

CREATE TRIGGER validate_exercise_progress_course_trigger BEFORE
INSERT
    OR
UPDATE
    OF enrollment_id,
    exercise_id ON public.exercise_progress FOR EACH ROW EXECUTE FUNCTION public.validate_exercise_progress_course();

CREATE
OR REPLACE FUNCTION public.set_student_progress_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW();

RETURN NEW;

END;

$$;

CREATE TRIGGER course_enrollments_updated_at_trigger BEFORE
UPDATE
    ON public.course_enrollments FOR EACH ROW EXECUTE FUNCTION public.set_student_progress_updated_at();

CREATE TRIGGER lesson_progress_updated_at_trigger BEFORE
UPDATE
    ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.set_student_progress_updated_at();

CREATE TRIGGER exercise_progress_updated_at_trigger BEFORE
UPDATE
    ON public.exercise_progress FOR EACH ROW EXECUTE FUNCTION public.set_student_progress_updated_at();

ALTER TABLE
    public.course_enrollments ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    public.lesson_progress ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    public.exercise_progress ENABLE ROW LEVEL SECURITY;