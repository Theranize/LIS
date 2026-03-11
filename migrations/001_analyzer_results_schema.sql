-- ============================================================================
-- Analyzer Results Table Migration
-- 
-- This migration extends the analyzer_results table to support:
-- - Deduplication via unique constraint (analyzer_id, sample_id, test_code)
-- - Result consumption tracking (consumed flag + consumed_at timestamp)
-- - Better indexing for query performance
-- ============================================================================

-- Drop existing table if needed (BACKUP FIRST!)
-- DROP TABLE IF EXISTS analyzer_results;

-- Create or modify analyzer_results table
CREATE TABLE IF NOT EXISTS analyzer_results (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  -- Identifiers
  patient_id VARCHAR(50),
  analyzer_id VARCHAR(100) NOT NULL DEFAULT 'ANALYZER_001',
  sample_id VARCHAR(100) NOT NULL,
  
  -- Test Information
  test_code VARCHAR(50) NOT NULL,
  test_name VARCHAR(255),
  
  -- Result Data
  result_value VARCHAR(50),
  unit VARCHAR(50),
  reference_range VARCHAR(100),
  normal_flag CHAR(1) DEFAULT 'N', -- N=Normal, A=Abnormal, C=Critical
  
  -- Timestamps
  result_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Consumption tracking
  consumed TINYINT(1) DEFAULT 0, -- 0 = new/unconsumed, 1 = consumed
  consumed_at TIMESTAMP NULL,
  
  -- Unique constraint: prevent duplicates for same analyzer/sample/test combination
  UNIQUE KEY uk_analyzer_sample_test (analyzer_id, sample_id, test_code),
  
  -- Indexes for common queries
  INDEX idx_analyzer_id (analyzer_id),
  INDEX idx_sample_id (sample_id),
  INDEX idx_test_code (test_code),
  INDEX idx_consumed (consumed),
  INDEX idx_created_at (created_at),
  INDEX idx_patient_id (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Post-Migration Steps:
-- ============================================================================
-- 1. BACKUP your existing analyzer_results table
-- 2. Run this migration in your database
-- 3. Verify the new columns exist:
--    SELECT * FROM analyzer_results LIMIT 1;
-- 4. Restart the LIS server
-- 5. Test API endpoints:
--    GET http://localhost:3000/api/analyzer-results/unconsumed
-- ============================================================================
