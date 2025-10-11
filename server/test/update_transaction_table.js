const { dbAsync } = require('../config/database');

/**
 * Chrysorrhoe: Update transaction table structure to add interest-related transaction types
 */
async function updateTransactionTable() {
  try {
    console.log('Chrysorrhoe: Connect to SQLite database');
    
    // Chrysorrhoe: Check if transaction table exists
    const tableExists = await dbAsync.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'"
    );
    
    if (!tableExists) {
      console.log('Chrysorrhoe: Transaction table does not exist, no update needed');
      process.exit(0);
    }
    
    // Chrysorrhoe: SQLite does not support direct modification of CHECK constraints, so we need to rebuild the table
    console.log('Chrysorrhoe: Start updating transaction table structure...');
    
    // 1. Create temporary table
    console.log('Chrysorrhoe: Create temporary table...');
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS transactions_temp (
        id TEXT PRIMARY KEY,
        from_wallet_id TEXT,
        to_wallet_id TEXT,
        amount REAL NOT NULL,
        transaction_type TEXT NOT NULL CHECK (transaction_type IN ('transfer', 'initial_deposit', 'interest_credit', 'interest_debit')),
        description TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (from_wallet_id) REFERENCES wallets(id),
        FOREIGN KEY (to_wallet_id) REFERENCES wallets(id)
      )
    `);
    
    // Chrysorrhoe: 2. Copy data to temporary table
    console.log('Chrysorrhoe: Copy data to temporary table...');
    await dbAsync.run(`
      INSERT INTO transactions_temp (id, from_wallet_id, to_wallet_id, amount, transaction_type, description, created_at)
      SELECT id, from_wallet_id, to_wallet_id, amount, transaction_type, description, created_at
      FROM transactions
    `);
    
    // Chrysorrhoe: 3. Drop original table
    console.log('Chrysorrhoe: Drop original table...');
    await dbAsync.run('DROP TABLE transactions');
    
    // Chrysorrhoe: 4. Rename temporary table
    console.log('Chrysorrhoe: Rename temporary table...');
    await dbAsync.run('ALTER TABLE transactions_temp RENAME TO transactions');
    
    // Chrysorrhoe: 5. Recreate indexes
    console.log('Chrysorrhoe: Recreate indexes...');
    await dbAsync.run('CREATE INDEX IF NOT EXISTS idx_transactions_from_wallet ON transactions(from_wallet_id)');
    await dbAsync.run('CREATE INDEX IF NOT EXISTS idx_transactions_to_wallet ON transactions(to_wallet_id)');
    await dbAsync.run('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)');
    await dbAsync.run('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type)');
    
    console.log('Chrysorrhoe: Transaction table structure update successful! Now supports interest_credit and interest_debit transaction types.');
    
  } catch (error) {
    console.error('Chrysorrhoe: Error updating transaction table structure:', error);
  } finally {
    process.exit(0);
  }
}

updateTransactionTable();