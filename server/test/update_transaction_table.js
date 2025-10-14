const { dbAsync } = require('../config/database');

/**
 * Update transaction table structure to add interest-related transaction types
 */
async function updateTransactionTable() {
  try {
    console.log('Connect to SQLite database');
    
    // Check if transaction table exists
    const tableExists = await dbAsync.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'"
    );
    
    if (!tableExists) {
      console.log('Transaction table does not exist, no update needed');
      process.exit(0);
    }
    
    // SQLite does not support direct modification of CHECK constraints, so we need to rebuild the table
    console.log('Start updating transaction table structure...');
    
    // 1. Create temporary table
    console.log('Create temporary table...');
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
    
    // 2. Copy data to temporary table
    console.log('Copy data to temporary table...'); 
    await dbAsync.run(`
      INSERT INTO transactions_temp (id, from_wallet_id, to_wallet_id, amount, transaction_type, description, created_at)
      SELECT id, from_wallet_id, to_wallet_id, amount, transaction_type, description, created_at
      FROM transactions
    `);
    
    // 3. Drop original table
    console.log('Drop original table...');
    await dbAsync.run('DROP TABLE transactions');
    
    // 4. Rename temporary table
    console.log('Rename temporary table...');
    await dbAsync.run('ALTER TABLE transactions_temp RENAME TO transactions');
    
    // 5. Recreate indexes
    console.log('Recreate indexes...');
    await dbAsync.run('CREATE INDEX IF NOT EXISTS idx_transactions_from_wallet ON transactions(from_wallet_id)');
    await dbAsync.run('CREATE INDEX IF NOT EXISTS idx_transactions_to_wallet ON transactions(to_wallet_id)');
    await dbAsync.run('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)');
    await dbAsync.run('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type)');
    
    console.log('Transaction table structure update successful! Now supports interest_credit and interest_debit transaction types.');
    
  } catch (error) {
    console.error('Error updating transaction table structure:', error);
  } finally {
    process.exit(0);
  }
}

updateTransactionTable();