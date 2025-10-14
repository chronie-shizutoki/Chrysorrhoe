const fs = require('fs');
const path = require('path');
const { db, dbAsync } = require('./database');

/**
 * Database Initialization Module
 * Responsible for creating table structures, indices, and triggers
 */

// Ensure the data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Data directory created:', dataDir);
  }
};

// Read the SQL initialization script
const readInitScript = () => {
  const sqlPath = path.join(__dirname, '..', '..', 'database', 'sqlite_init.sql');
  try {
    return fs.readFileSync(sqlPath, 'utf8');
  } catch (error) {
    console.error('Error reading initialization script:', error.message);
    return null;
  }
};

// Execute the SQL script
const executeSqlScript = async (sqlScript) => {
  // Remove comments and empty lines
  const cleanScript = sqlScript
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('--');
    })
    .join('\n');

  // Use a more intelligent way to split SQL statements
  const statements = [];
  let currentStatement = '';
  let inTrigger = false;
  let braceCount = 0;

  for (const line of cleanScript.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    currentStatement += line + '\n';

    // Check if entering a trigger
    if (trimmed.toUpperCase().includes('CREATE TRIGGER')) {
      inTrigger = true;
    }

    // In triggers, count braces
    if (inTrigger) {
      for (const char of trimmed) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      
      // Check if it's a BEGIN/END block in triggers
      if (trimmed.toUpperCase() === 'BEGIN') {
        braceCount++;
      } else if (trimmed.toUpperCase() === 'END;') {
        braceCount--;
      }
    }

    // Check if it's a statement end in triggers
    if (trimmed.endsWith(';')) {
      if (!inTrigger || (inTrigger && braceCount <= 0)) {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inTrigger = false;
        braceCount = 0;
      }
    }
  }

  // If there are remaining statements
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  // Execute each statement
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await dbAsync.run(statement);
        const preview = statement.replace(/\s+/g, ' ').substring(0, 50);
        console.log('SQL statement executed successfully:', preview + '...');
      } catch (error) {
        const preview = statement.replace(/\s+/g, ' ').substring(0, 50);
        console.error('SQL statement execution failed:', preview + '...', error.message);
        console.error('Complete statement:', statement);
        throw error;
      }
    }
  }
};

// Verify Table Structures
const verifyTables = async () => {
  try {
    // Check wallets table
    const walletsInfo = await dbAsync.get("SELECT name FROM sqlite_master WHERE type='table' AND name='wallets'");
    if (!walletsInfo) {
      throw new Error('Wallets table does not exist');
    }

    // Check transactions table
    const transactionsInfo = await dbAsync.get("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'");
    if (!transactionsInfo) {
      throw new Error('Transactions table does not exist');
    }

    // Check indices
    const indexes = await dbAsync.all("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'");
    console.log('Created indices:', indexes.map(idx => idx.name));

    console.log('Database table structure verification successful');
    return true;
  } catch (error) {
    console.error('Database table structure verification failed:', error.message);
    return false;
  }
};

// Get Database Statistics
const getDatabaseStats = async () => {
  try {
    const walletCount = await dbAsync.get('SELECT COUNT(*) as count FROM wallets');
    const transactionCount = await dbAsync.get('SELECT COUNT(*) as count FROM transactions');
    
    return {
      wallets: walletCount.count,
      transactions: transactionCount.count
    };
  } catch (error) {
    console.error('Database statistics retrieval failed:', error.message);
    return null;
  }
};

// Main Initialization Function
const initializeDatabase = async () => {
  try {
    console.log('Starting database initialization...');
    
    // 1. Ensure data directory exists
    ensureDataDirectory();
    
    // 2. Read initialization script
    const sqlScript = readInitScript();
    if (!sqlScript) {
      throw new Error('Error reading initialization script');
    }
    
    // 3. Execute initialization script
    await executeSqlScript(sqlScript);
    
    // 4. Verify table structures
    const isValid = await verifyTables();
    if (!isValid) {
      throw new Error('Database table structure verification failed');
    }
    
    // 5. Display statistics
    const stats = await getDatabaseStats();
    if (stats) {
      console.log('Database statistics:', stats);
    }
    
    console.log('Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    return false;
  }
};

// Reset Database (Delete all data)
const resetDatabase = async () => {
  try {
    console.log('Starting database reset...');
    
    await dbAsync.run('DELETE FROM transactions');
    await dbAsync.run('DELETE FROM wallets');
    
    console.log('Database reset completed successfully');
    return true;
  } catch (error) {
    console.error('Database reset failed:', error.message);
    return false;
  }
};

module.exports = {
  initializeDatabase,
  resetDatabase,
  getDatabaseStats,
  verifyTables
};