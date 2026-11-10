CREATE TABLE public.submission_execution_checkpoints (
  submission_id UUID NOT NULL REFERENCES public.submissions (id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES public.exercise_test_cases (id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  state TEXT NOT NULL CHECK (
    state IN ('submitting', 'submitted', 'completed', 'ambiguous')
  ),
  judge0_token TEXT,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
  PRIMARY KEY (submission_id, test_case_id),
  CHECK (judge0_token IS NULL OR LENGTH (TRIM(judge0_token)) > 0),
  CHECK (state <> 'submitted' OR judge0_token IS NOT NULL),
  CHECK (state <> 'completed' OR result IS NOT NULL)
);

CREATE INDEX submission_execution_checkpoints_state_idx
  ON public.submission_execution_checkpoints (state, updated_at);

ALTER TABLE public.submission_execution_checkpoints ENABLE ROW LEVEL SECURITY;
