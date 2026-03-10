ALTER TABLE shopping_order MODIFY COLUMN delivery_charge DOUBLE NOT NULL DEFAULT 0.0;
ALTER TABLE shopping_order MODIFY COLUMN replacement_requested BIT NOT NULL DEFAULT 0;