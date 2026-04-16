-- Add test warehouse with credentials
INSERT INTO warehouse (name, city, state, warehouse_login_id, warehouse_login_password, served_pin_codes, active)
VALUES ('Bangalore Hub', 'Bengaluru', 'Karnataka', '48676451', '920985', '560001,560002,560003', true);

-- Add sample delivery boys for testing
INSERT INTO delivery_boy (name, email, mobile, password, verified, admin_approved, active, warehouse_id)
VALUES 
  ('Suresh Kumar', 'suresh@ekart.com', 9876543210, 'aes:password123', true, true, true, 1),
  ('Ravi Sharma', 'ravi@ekart.com', 9988776655, 'aes:password123', true, true, true, 1);
