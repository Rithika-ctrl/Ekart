-- Migration: Add COD (Cash on Delivery) payment tracking columns to shopping_order table
-- Date: 2026-04-13
-- Description: Adds columns to track COD payment collection status, amount, and timestamp

ALTER TABLE shopping_order 
ADD COLUMN IF NOT EXISTS cod_collection_status VARCHAR(30) DEFAULT 'NOT_APPLICABLE';

ALTER TABLE shopping_order 
ADD COLUMN IF NOT EXISTS cod_amount_collected FLOAT8 DEFAULT 0;

ALTER TABLE shopping_order 
ADD COLUMN IF NOT EXISTS cod_collection_timestamp TIMESTAMP DEFAULT NULL;

-- Create index on cod_collection_status for faster queries on COD orders
CREATE INDEX IF NOT EXISTS idx_order_cod_status ON shopping_order(cod_collection_status);
