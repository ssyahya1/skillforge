CREATE TABLE public.exercise_progress_attempts (
    submission_id UUID PRIMARY KEY REFERENCES public.submissions(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    final_status TEXT NOT NULL CHECK (
        final_status IN (
            'accepted',
            'wrong_answer',
            'runtime_error',
            'compilation_error',
            'time_limit_exceeded',
            'memory_limit_exceeded',
            'internal_error',
            'cancelled'
        )
    ),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX exercise_progress_attempts_enrollment_exercise_idx ON public.exercise_progress_attempts(enrollment_id, exercise_id);

CREATE OR REPLACE FUNCTION public.validate_exercise_progress_attempt()
 RETURNS TRIGGER
 LANGUAGE plpgsql
  AS $$
  BEGIN
   IF NOT EXISTS (
    SELECT
        1
    FROM
        public.submissions s
        JOIN public.course_enrollments ce ON ce.id = NEW.enrollment_id
        JOIN public.exercises e ON e.id = NEW.exercise_id
        JOIN public.lessons l ON l.id = e.lesson_id
    WHERE
        s.id = NEW.submission_id
        AND s.user_id = ce.user_id
        AND s.exercise_id = NEW.exercise_id
        AND ce.course_id = l.course_id
        AND s.status = NEW.final_status
        AND ce.status = 'active'
) THEN RAISE EXCEPTION 'Submission, enrollment, and exercise do not match' USING ERRCODE = '23514';

END IF;

RETURN NEW;

END;

$$;

CREATE TRIGGER validate_exercise_progress_attempt_trigger BEFORE
INSERT
    ON public.exercise_progress_attempts FOR EACH ROW EXECUTE FUNCTION public.validate_exercise_progress_attempt();

ALTER TABLE
    public.lesson_progress
ADD
    CONSTRAINT lesson_progress_completed_content_check CHECK (
        status <> 'completed'
        OR content_completed_at IS NOT NULL
    );

ALTER TABLE
    public.exercise_progress_attempts ENABLE ROW LEVEL SECURITY;