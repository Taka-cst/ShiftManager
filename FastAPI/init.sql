-- 文字セットの設定
ALTER DATABASE shift_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 初期設定データの挿入
INSERT INTO settings ('key', value) VALUES 
('dow_monday', 'false'),
('dow_tuesday', 'true'),
('dow_wednesday', 'false'),
('dow_thursday', 'false'),
('dow_friday', 'true'),
('dow_saturday', 'false'),
('dow_sunday', 'false');
