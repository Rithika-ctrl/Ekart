-- Add numeric login credentials to warehouse table
-- Allows warehouse staff to log in with 8-digit ID and 6-digit numeric password

ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS warehouse_login_id VARCHAR(8);
ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS warehouse_login_password VARCHAR(255);
ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100);
ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(15);
ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS address VARCHAR(300);

CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_login_id ON warehouse(warehouse_login_id);
