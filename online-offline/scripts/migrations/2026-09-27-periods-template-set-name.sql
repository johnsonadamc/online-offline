-- 2026-09-27 — template sets (src/magazine/core/templateSets.ts).
-- NULL or 'base' = base templates; otherwise the folder name under src/magazine/templates/sets/.
-- The generator reads this column tolerantly: before this runs, generation falls back to base.
-- A --set=<name> flag on scripts/test-generator.ts overrides it.
ALTER TABLE periods ADD COLUMN IF NOT EXISTS template_set_name text NULL;
