-- Allow creating articles without an uploaded image.
-- This is defensive: existing deployments might already have NULLs enabled.
BEGIN;

ALTER TABLE posts
  ALTER COLUMN image_url DROP NOT NULL;

COMMIT;

