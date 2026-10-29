-- Keep the database rule aligned with JavaScript's String.prototype.trim().
ALTER TABLE public.lessons
ADD CONSTRAINT lessons_published_content_nonempty_check
CHECK (
    status <> 'published'
    OR btrim(
        content,
        chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) ||
        chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) ||
        chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) ||
        chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) ||
        chr(8239) || chr(8287) || chr(12288) || chr(65279)
    ) <> ''
);
