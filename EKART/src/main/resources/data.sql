ALTER TABLE shopping_order MODIFY COLUMN delivery_charge DOUBLE NOT NULL DEFAULT 0.0;
ALTER TABLE shopping_order MODIFY COLUMN replacement_requested BIT NOT NULL DEFAULT 0;
-- ── Category seed data ──────────────────────────────────────────────────────
-- Run only if categories table is empty (INSERT IGNORE handles duplicates)

-- Parent categories
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(1,  'Food & Beverages',       '🍎', 1, true,  NULL),
(2,  'Home & Living',          '🏠', 2, true,  NULL),
(3,  'Health & Emergency',     '💊', 3, true,  NULL),
(4,  'Electronics',            '💻', 4, true,  NULL),
(5,  'Beauty & Personal Care', '💄', 5, true,  NULL),
(6,  'Stationery & Office',    '📚', 6, true,  NULL),
(7,  'Fashion & Clothing',     '👕', 7, true,  NULL),
(8,  'Sports & Fitness',       '⚽', 8, true,  NULL),
(9,  'Toys & Kids',            '🧸', 9, true,  NULL),
(10, 'Grocery & Staples',      '🛒', 10, true, NULL);

-- Sub-categories under Food & Beverages (parent_id = 1)
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(101, 'Chips',          '🥔', 1, false, 1),
(102, 'Chocolates',     '🍫', 2, false, 1),
(103, 'Wafers',         '🍪', 3, false, 1),
(104, 'Biscuits',       '🍘', 4, false, 1),
(105, 'Ice Cream',      '🍦', 5, false, 1),
(106, 'Beverages',      '🧃', 6, false, 1),
(107, 'Snacks',         '🍿', 7, false, 1),
(108, 'Sweets',         '🍬', 8, false, 1),
(109, 'Dairy Products', '🥛', 9, false, 1),
(110, 'Bakery',         '🍞', 10, false, 1);

-- Sub-categories under Home & Living (parent_id = 2)
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(201, 'House Hold',    '🏡', 1, false, 2),
(202, 'Home Goods',    '🛋️', 2, false, 2),
(203, 'Kitchen',       '🍳', 3, false, 2),
(204, 'Cleaning',      '🧹', 4, false, 2),
(205, 'Decor',         '🖼️', 5, false, 2),
(206, 'Bedding',       '🛏️', 6, false, 2);

-- Sub-categories under Health & Emergency (parent_id = 3)
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(301, 'Emergency',      '🚨', 1, false, 3),
(302, 'Medicines',      '💉', 2, false, 3),
(303, 'Supplements',    '💊', 3, false, 3),
(304, 'Personal Care',  '🪥', 4, false, 3),
(305, 'First Aid',      '🩺', 5, false, 3);

-- Sub-categories under Electronics (parent_id = 4)
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(401, 'Electronics',   '⚡', 1, false, 4),
(402, 'Mobile',        '📱', 2, false, 4),
(403, 'Laptop',        '💻', 3, false, 4),
(404, 'Accessories',   '🔌', 4, false, 4),
(405, 'Audio',         '🎧', 5, false, 4),
(406, 'Cameras',       '📷', 6, false, 4);

-- Sub-categories under Beauty & Personal Care (parent_id = 5)
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(501, 'Beauty Products','💅', 1, false, 5),
(502, 'Skincare',       '🧴', 2, false, 5),
(503, 'Haircare',       '💇', 3, false, 5),
(504, 'Makeup',         '💄', 4, false, 5),
(505, 'Fragrances',     '🌸', 5, false, 5);

-- Sub-categories under Stationery & Office (parent_id = 6)
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(601, 'Stationary',    '✏️', 1, false, 6),
(602, 'Books',         '📖', 2, false, 6),
(603, 'Office Supplies','📎', 3, false, 6);

-- Sub-categories under Fashion & Clothing (parent_id = 7)
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(701, 'Men\'s Wear',   '👔', 1, false, 7),
(702, 'Women\'s Wear', '👗', 2, false, 7),
(703, 'Kids Wear',     '👶', 3, false, 7),
(704, 'Footwear',      '👟', 4, false, 7),
(705, 'Accessories',   '👜', 5, false, 7);

-- Sub-categories under Sports & Fitness (parent_id = 8)
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(801, 'Sports',        '🏅', 1, false, 8),
(802, 'Fitness',       '🏋️', 2, false, 8),
(803, 'Outdoor',       '⛺', 3, false, 8);

-- Sub-categories under Toys & Kids (parent_id = 9)
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(901, 'Toys',          '🧸', 1, false, 9),
(902, 'Board Games',   '🎲', 2, false, 9),
(903, 'Baby Products', '🍼', 3, false, 9);

-- Sub-categories under Grocery & Staples (parent_id = 10)
INSERT IGNORE INTO category (id, name, emoji, display_order, parent, parent_id) VALUES
(1001, 'Daily Products', '🛒', 1, false, 10),
(1002, 'Rice & Grains',  '🌾', 2, false, 10),
(1003, 'Oils & Spices',  '🫙', 3, false, 10),
(1004, 'Pulses',         '🫘', 4, false, 10);