ALTER TABLE public.exercise_languages ADD CONSTRAINT exercise_languages_id_exercise_id_unique UNIQUE (id, exercise_id);

CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises (id) ON DELETE CASCADE,
  idempotency_key UUID,
  language_id UUID NOT NULL,
  source_code TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('javascript', 'python', 'cpp')),
  runtime_version TEXT NOT NULL,
  execution_mode TEXT NOT NULL CHECK (execution_mode IN ('function', 'stdin')),
  entry_point TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN (
      'queued',
      'processing',
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
  execution_time_ms INTEGER CHECK (
    execution_time_ms IS NULL
    OR execution_time_ms >= 0
  ),
  memory_used_kb INTEGER CHECK (
    memory_used_kb IS NULL
    OR memory_used_kb >= 0
  ),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
  CONSTRAINT submissions_language_exercise_fk FOREIGN KEY (language_id, exercise_id) REFERENCES public.exercise_languages (id, exercise_id) ON DELETE CASCADE,
  CONSTRAINT submissions_source_code_nonempty CHECK (LENGTH (TRIM(source_code)) > 0),
  CONSTRAINT submissions_runtime_version_nonempty CHECK (LENGTH (TRIM(runtime_version)) > 0),
  CONSTRAINT submissions_user_idempotency_unique UNIQUE (user_id, idempotency_key),
  CONSTRAINT submissions_source_code_size CHECK (OCTET_LENGTH(source_code) <= 100000)
);

CREATE INDEX submissions_user_exercise_language_created_idx ON public.submissions (
  user_id,
  exercise_id,
  language_id,
  created_at DESC
);

CREATE INDEX submissions_exercise_created_idx ON public.submissions (exercise_id, created_at DESC);

CREATE INDEX submissions_status_created_idx ON public.submissions (status, created_at);

CREATE TABLE public.submission_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  submission_id UUID NOT NULL REFERENCES public.submissions (id) ON DELETE CASCADE,
  test_case_id UUID REFERENCES public.exercise_test_cases (id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  status TEXT NOT NULL CHECK (
    status IN (
      'passed',
      'failed',
      'runtime_error',
      'time_limit_exceeded',
      'memory_limit_exceeded'
    )
  ),
  execution_time_ms INTEGER CHECK (
    execution_time_ms IS NULL
    OR execution_time_ms >= 0
  ),
  actual_output JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
);

CREATE INDEX submission_test_results_submission_idx ON public.submission_test_results (submission_id, display_order);

CREATE INDEX submission_test_results_test_case_idx ON public.submission_test_results (test_case_id);

CREATE TABLE public.solution_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises (id) ON DELETE CASCADE,
  language_id UUID NOT NULL,
  revealed_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
  CONSTRAINT solution_reveals_language_exercise_fk FOREIGN KEY (language_id, exercise_id) REFERENCES public.exercise_languages (id, exercise_id) ON DELETE CASCADE
);

CREATE INDEX solution_reveals_user_exercise_language_idx ON public.solution_reveals (
  user_id,
  exercise_id,
  language_id,
  revealed_at DESC
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.submission_test_results ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.solution_reveals ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER submissions_updated_at BEFORE
UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.set_exercise_updated_at ();
