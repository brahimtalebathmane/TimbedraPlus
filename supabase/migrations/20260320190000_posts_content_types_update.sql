-- Enforce `posts.content_type` to match the admin + frontend selector.
-- Stores the exact Arabic labels (including slashes/spaces) required by the product.

BEGIN;

-- 1) Migrate legacy stored values.
UPDATE posts SET content_type = 'خبر' WHERE content_type = 'news';
UPDATE posts SET content_type = 'بورتريه' WHERE content_type = 'portrait';
UPDATE posts SET content_type = 'سياحة' WHERE content_type = 'tourism';
UPDATE posts SET content_type = 'فيديو' WHERE content_type = 'video';

-- 2) Normalize any null/unknown values to the default.
UPDATE posts
SET content_type = 'خبر'
WHERE content_type IS NULL OR content_type NOT IN (
  'خبر',
  'بورتريه',
  'سياحة',
  'فيديو',
  'صورة',
  'تحليل / رأي',
  'ثقافة وفنون',
  'رياضة منوعة',
  'تكنولوجيا / علوم',
  'أسلوب حياة / Lifestyle',
  'منوعات / ترفيه',
  'ترند / سوشيال'
);

-- 3) Enforce allowed values via CHECK constraint.
ALTER TABLE posts ALTER COLUMN content_type SET DEFAULT 'خبر';

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_type_check;
ALTER TABLE posts
  ADD CONSTRAINT posts_content_type_check
  CHECK (content_type IN (
    'خبر',
    'بورتريه',
    'سياحة',
    'فيديو',
    'صورة',
    'تحليل / رأي',
    'ثقافة وفنون',
    'رياضة منوعة',
    'تكنولوجيا / علوم',
    'أسلوب حياة / Lifestyle',
    'منوعات / ترفيه',
    'ترند / سوشيال'
  ));

COMMIT;

