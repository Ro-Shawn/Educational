CREATE DATABASE IF NOT EXISTS yuba_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yuba_db;

CREATE TABLE members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT DEFAULT NULL,
  join_date DATE NOT NULL,
  role ENUM('member','admin','superadmin') NOT NULL DEFAULT 'member',
  position VARCHAR(100) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  exit_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_member_id (member_id),
  INDEX idx_role (role),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE deposits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  deposit_month VARCHAR(7) NOT NULL COMMENT 'YYYY-MM format in BS',
  paid_date DATE DEFAULT NULL,
  status ENUM('paid','unpaid') NOT NULL DEFAULT 'unpaid',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  INDEX idx_member_id (member_id),
  INDEX idx_status (status),
  INDEX idx_deposit_month (deposit_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  loan_amount DECIMAL(12,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  total_payable DECIMAL(12,2) NOT NULL,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('active','closed') NOT NULL DEFAULT 'active',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  INDEX idx_member_id (member_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  fine_type VARCHAR(50) NOT NULL DEFAULT 'late_deposit',
  reference_id INT DEFAULT NULL COMMENT 'Deposit ID if related',
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT DEFAULT NULL,
  fine_date DATE NOT NULL,
  is_paid TINYINT(1) NOT NULL DEFAULT 0,
  paid_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  INDEX idx_member_id (member_id),
  INDEX idx_is_paid (is_paid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT DEFAULT NULL,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reference_id INT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  transaction_date DATE NOT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL,
  INDEX idx_member_id (member_id),
  INDEX idx_type (type),
  INDEX idx_transaction_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  temporary_password VARCHAR(255) DEFAULT NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  resolved_by INT DEFAULT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES members(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_member_id (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (`key`, `value`) VALUES
('monthly_deposit_amount', '1000'),
('fine_amount', '50'),
('fine_grace_day', '6');

INSERT INTO members (member_id, first_name, last_name, email, phone, join_date, role, position, password_hash, is_active) VALUES
('9999999999', 'Roshan', 'Admin', 'roshan@yuba.com', '9999999999', CURDATE(), 'superadmin', 'Chairperson', '$2y$10$DiQJOrTDFg7/H2gOoD9TeOFHU8DNAK1OLgYFbI9VkmltpPPpkvMaG', 1),
('9999999998', 'Admin', 'User', 'admin@yuba.com', '9999999998', CURDATE(), 'admin', 'Secretary', '$2y$10$U6p41dvwK1b41/EZqTqneeeZnXwKdr.vZb3RCFxtjOIF9GrXGQiAy', 1);

-- 5 dummy members (passwords: 9812345670, 9812345671, ... uses phone as password)
INSERT INTO members (member_id, first_name, last_name, phone, join_date, role, position, password_hash, is_active) VALUES
('9812345670', 'Ram', 'Sharma', '9812345670', '2024-01-15', 'member', 'Member', '$2y$10$zaiBTgYZodvHgm9gpckwKOCKE8JKJOcXY/dLl6lUu7qiWrGFrwtYG', 1),
('9812345671', 'Sita', 'Devi', '9812345671', '2024-02-01', 'member', 'Treasurer', '$2y$10$01F0IwfBtPJAap8zXlEA5eSvpzl6MtC1Ixu5X8pRgBLlAg2XKyKMW', 1),
('9812345672', 'Hari', 'Prasad', '9812345672', '2024-03-10', 'member', 'Secretary', '$2y$10$Bf/TZdl7vr0ibnDV3cRQfuGV14eAid6X/32eQ.XPjTCmzDgo/BnHO', 1),
('9812345673', 'Gita', 'Tamang', '9812345673', '2024-04-05', 'member', 'Member', '$2y$10$X66F8m9WJ0noTm5Bzk9skey6gSqTjLUlrkY.GsoW2de.1z8g5Wrtq', 1),
('9812345674', 'Krishna', 'Thapa', '9812345674', '2024-05-20', 'member', 'Vice-Chairperson', '$2y$10$IgsbBI3WeA3WKOu2cX41Eex75KJTdxfvb3A2ZNj3DVOjO6FF/iEAG', 1);

-- Dummy deposits
INSERT INTO deposits (member_id, amount, deposit_month, paid_date, status) VALUES
(3, 1000, '2081-01', '2024-06-15', 'paid'),
(3, 1000, '2081-02', '2024-07-20', 'paid'),
(4, 1000, '2081-01', '2024-06-10', 'paid'),
(4, 1000, '2081-02', NULL, 'unpaid'),
(5, 1000, '2081-01', '2024-06-25', 'paid'),
(5, 1000, '2081-02', '2024-07-28', 'paid'),
(6, 1000, '2081-01', '2024-06-05', 'paid'),
(6, 1000, '2081-02', NULL, 'unpaid'),
(7, 1000, '2081-01', '2024-06-30', 'paid'),
(7, 1000, '2081-02', '2024-07-30', 'paid');

-- Dummy transactions
INSERT INTO transactions (member_id, type, amount, description, transaction_date, created_by) VALUES
(3, 'deposit', 1000, 'Monthly deposit 2081-01', '2024-06-15', 1),
(3, 'deposit', 1000, 'Monthly deposit 2081-02', '2024-07-20', 1),
(4, 'deposit', 1000, 'Monthly deposit 2081-01', '2024-06-10', 1),
(5, 'deposit', 1000, 'Monthly deposit 2081-01', '2024-06-25', 1),
(5, 'deposit', 1000, 'Monthly deposit 2081-02', '2024-07-28', 1),
(6, 'deposit', 1000, 'Monthly deposit 2081-01', '2024-06-05', 1),
(7, 'deposit', 1000, 'Monthly deposit 2081-01', '2024-06-30', 1),
(7, 'deposit', 1000, 'Monthly deposit 2081-02', '2024-07-30', 1),
(3, 'loan_payment', 500, 'Loan installment', '2024-08-01', 1),
(5, 'fine_paid', 50, 'Late deposit fine', '2024-08-05', 1);
