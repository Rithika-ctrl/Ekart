-- Fix for warehouse_change_request table
-- Add DEFAULT CURRENT_TIMESTAMP to requested_at column

ALTER TABLE warehouse_change_request 
MODIFY COLUMN requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- Optional: Also make resolved_at nullable if it isn't already
ALTER TABLE warehouse_change_request 
MODIFY COLUMN resolved_at TIMESTAMP DEFAULT NULL;
