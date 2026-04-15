-- Order flow columns for warehouse routing, payment tracking, and delivery operations
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS source_warehouse_id INTEGER;
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS destination_warehouse_id INTEGER;
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS intermediate_warehouse_ids VARCHAR(500);
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS warehouse_routing_path VARCHAR(1000);
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'RAZORPAY';
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS cod_amount FLOAT8;
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS cod_collected_by INTEGER;
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS cod_collection_timestamp TIMESTAMP;
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS final_delivery_boy_id INTEGER;
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS cash_settlement_id INTEGER;
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP;
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(10);
ALTER TABLE shopping_order ADD COLUMN IF NOT EXISTS delivery_otp_verified BOOLEAN DEFAULT FALSE;

-- Vendor city column for warehouse assignment logic
ALTER TABLE vendor ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- CashSettlement extra columns for tracking and batch operations
ALTER TABLE cash_settlement ADD COLUMN IF NOT EXISTS settlement_batch_number VARCHAR(50);
ALTER TABLE cash_settlement ADD COLUMN IF NOT EXISTS proof_photo_url VARCHAR(1000);
ALTER TABLE cash_settlement ADD COLUMN IF NOT EXISTS notes VARCHAR(500);
ALTER TABLE cash_settlement ADD COLUMN IF NOT EXISTS order_count INTEGER DEFAULT 0;
