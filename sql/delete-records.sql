-- Delete all records from delivery_boy and warehouse tables (keep tables intact)
DELETE FROM delivery_boy;
DELETE FROM warehouse;

-- Reset sequences
ALTER SEQUENCE delivery_boy_id_seq RESTART WITH 1;
ALTER SEQUENCE warehouse_id_seq RESTART WITH 1;
