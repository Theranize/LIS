-- ============================================================================
-- Migration: Make lab_id nullable in analyzer_results
-- 
-- Issue: lab_id column has NOT NULL constraint but not all analyzers have lab_id assigned
-- Solution: Change column to NULL and provide sensible defaults
-- ============================================================================

-- Make lab_id nullable (if it's currently NOT NULL)
ALTER TABLE analyzer_results 
MODIFY COLUMN lab_id INT NULL DEFAULT NULL;

-- Or if you need to set a default value for existing NULL-like values:
-- UPDATE analyzer_results SET lab_id = 1 WHERE lab_id IS NULL;

-- Verify the change
-- DESC analyzer_results;
-- SELECT DISTINCT lab_id FROM analyzer_results;

-- ============================================================================
-- This migration allows:
-- 1. Analyzers without lab_id configured to still insert results
-- 2. Results to be NULL if lab_id is not specified
-- 3. Gradual migration to multi-lab setup
-- ============================================================================
