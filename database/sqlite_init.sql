-- SQLite Chrysorrhoe Database Initialization Script
-- Used to create the necessary tables and indices for the Chrysorrhoe wallet application

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  balance REAL NOT NULL DEFAULT 0.00,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  from_wallet_id TEXT,
  to_wallet_id TEXT,
  amount REAL NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('transfer', 'initial_deposit', 'interest_credit', 'interest_debit', 'third_party_payment', 'third_party_receipt')),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_wallet_id) REFERENCES wallets(id),
  FOREIGN KEY (to_wallet_id) REFERENCES wallets(id)
);

-- Create exchange rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  rate REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indices to optimize query performance
CREATE INDEX IF NOT EXISTS idx_wallets_username ON wallets(username);

CREATE INDEX IF NOT EXISTS idx_transactions_from_wallet ON transactions(from_wallet_id);

CREATE INDEX IF NOT EXISTS idx_transactions_to_wallet ON transactions(to_wallet_id);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

-- Create trigger to automatically update updated_at field in wallets table
CREATE TRIGGER IF NOT EXISTS update_wallets_updated_at
  AFTER UPDATE ON wallets
  FOR EACH ROW
BEGIN
  UPDATE wallets SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Create interest_logs table to track interest payment processing
CREATE TABLE IF NOT EXISTS interest_logs (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  total_wallets INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  total_interest REAL DEFAULT 0.00,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create trigger to automatically update updated_at field in interest_logs table
CREATE TRIGGER IF NOT EXISTS update_interest_logs_updated_at
  AFTER UPDATE ON interest_logs
  FOR EACH ROW
BEGIN
  UPDATE interest_logs SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Create index for interest_logs table
CREATE INDEX IF NOT EXISTS idx_interest_logs_status ON interest_logs(status);
CREATE INDEX IF NOT EXISTS idx_interest_logs_period ON interest_logs(period);