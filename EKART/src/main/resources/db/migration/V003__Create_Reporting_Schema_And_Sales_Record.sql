-- Create dedicated schema for analytics/reporting data.
CREATE SCHEMA IF NOT EXISTS reporting;

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

-- One-time migration of legacy rows from public schema if present.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' AND t.table_name = 'sales_record'
    ) THEN
        EXECUTE '
            INSERT INTO reporting.sales_record (
                id,
                order_id,
                order_date,
                order_total,
                delivery_charge,
                product_id,
                product_name,
                category,
                item_price,
                quantity,
                vendor_id,
                vendor_name,
                customer_id,
                customer_name
            )
            SELECT
                p.id,
                p.order_id,
                p.order_date,
                p.order_total,
                p.delivery_charge,
                p.product_id,
                p.product_name,
                p.category,
                p.item_price,
                p.quantity,
                p.vendor_id,
                p.vendor_name,
                p.customer_id,
                p.customer_name
            FROM public.sales_record p
            WHERE NOT EXISTS (
                SELECT 1
                FROM reporting.sales_record r
                WHERE r.id = p.id
            )
        ';
    END IF;
END
$$;

-- Keep sequence aligned after id-preserving migration.
SELECT setval(
    pg_get_serial_sequence('reporting.sales_record', 'id'),
    COALESCE((SELECT MAX(id) FROM reporting.sales_record), 1),
    true
);
