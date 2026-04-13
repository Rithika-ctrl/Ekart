-- Create dedicated schema for analytics/reporting data.
CREATE SCHEMA IF NOT EXISTS reporting;

-- Drop existing table if it exists with incompatible schema, then recreate
DROP TABLE IF EXISTS reporting.sales_record;

-- Dedicated reporting table in reporting schema.
CREATE TABLE IF NOT EXISTS reporting.sales_record (
    id BIGSERIAL PRIMARY KEY,
    order_id INTEGER,
    order_date TIMESTAMP,
    order_total DOUBLE PRECISION,
    delivery_charge DOUBLE PRECISION,
    product_id INTEGER,
    product_name VARCHAR(255),
    category VARCHAR(255),
    item_price DOUBLE PRECISION,
    quantity INTEGER,
    vendor_id INTEGER,
    vendor_name VARCHAR(255),
    customer_id INTEGER,
    customer_name VARCHAR(255)
);

-- Useful indexes for analytics queries.
CREATE INDEX IF NOT EXISTS idx_sales_record_vendor_id ON reporting.sales_record(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sales_record_order_date ON reporting.sales_record(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_record_category ON reporting.sales_record(category);
CREATE INDEX IF NOT EXISTS idx_sales_record_order_id ON reporting.sales_record(order_id);
