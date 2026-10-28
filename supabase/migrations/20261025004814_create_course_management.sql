
-- SkillForge: Course management schema

CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    language TEXT NOT NULL
        CHECK (language IN ('javascript', 'python', 'cpp')),
    difficulty TEXT NOT NULL
        CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    access_tier TEXT NOT NULL DEFAULT 'free'
        CHECK (access_tier IN ('free', 'premium')),
    created_by UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL
        REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    video_url TEXT,
    code_examples JSONB NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(code_examples) = 'array'),
    position INTEGER NOT NULL CHECK (position >= 0),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT lessons_course_slug_unique UNIQUE (course_id, slug),
    CONSTRAINT lessons_course_position_unique UNIQUE (course_id, position)
);

CREATE TABLE public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL
        REFERENCES public.lessons(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    instructions TEXT NOT NULL,
    starter_code TEXT NOT NULL DEFAULT '',
    solution_code TEXT,
    test_cases JSONB NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(test_cases) = 'array'),
    difficulty TEXT NOT NULL DEFAULT 'beginner'
        CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    position INTEGER NOT NULL CHECK (position >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT exercises_lesson_position_unique UNIQUE (lesson_id, position)
);

-- Indexes for common lookups and foreign-key relationships
CREATE INDEX courses_status_access_idx
    ON public.courses (status, access_tier);

CREATE INDEX courses_created_by_idx
    ON public.courses (created_by);

CREATE INDEX lessons_course_id_idx
    ON public.lessons (course_id);

CREATE INDEX exercises_lesson_id_idx
    ON public.exercises (lesson_id);

-- Do not expose unpublished course content to anonymous or
-- authenticated clients. The Express API will manage access.
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- No client-facing policies are added here.
-- Access will be implemented deliberately in the API/RLS design.
