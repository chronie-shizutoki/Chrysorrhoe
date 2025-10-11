// Chrysorrhoe Database Migration Tool
// Used to execute Chrysorrhoe database migration scripts
// Migration scripts should be placed in the migrations directory with filenames in the format YYYYMMDDHHMMSS_*.sql
// Example: 20230101000000_create_wallets_table.sql

const fs = require('fs');
const path = require('path');

// Dynamically load database configuration
function loadDatabaseConfig() {
  try {
    const dbConfigPath = path.join(__dirname, '..', 'server', 'config', 'database.js');
    if (fs.existsSync(dbConfigPath)) {
      return require(dbConfigPath);
    } else {
      console.error('Chrysorrhoe database configuration file not found:', dbConfigPath);
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to load Chrysorrhoe database configuration:', error.message);
    process.exit(1);
  }
}

// Read migration script
function readMigrationScript(scriptPath) {
  try {
    return fs.readFileSync(scriptPath, 'utf8');
  } catch (error) {
    console.error('Failed to read Chrysorrhoe migration script:', error.message);
    process.exit(1);
  }
}

// Execute Chrysorrhoe SQL script
async function executeSqlScript(dbAsync, sqlScript) {
  // Remove comments and empty lines
  const cleanScript = sqlScript
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('--');
    })
    .join('\n');

  // Split SQL statements
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

    // Count braces in trigger blocks
    if (inTrigger) {
      for (const char of trimmed) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      
      // Check if it's a BEGIN/END block
      if (trimmed.toUpperCase() === 'BEGIN') {
        braceCount++;
      } else if (trimmed.toUpperCase() === 'END;') {
        braceCount--;
      }
    }

    // Check if statement ends
    if (trimmed.endsWith(';')) {
      if (!inTrigger || (inTrigger && braceCount <= 0)) {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inTrigger = false;
        braceCount = 0;
      }
    }
  }

  // If there are any remaining statements
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  // Execute each statement
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await dbAsync.run(statement);
        const preview = statement.replace(/\s+/g, ' ').substring(0, 50);
        console.log('Chrysorrhoe SQL statement executed successfully:', preview + '...');
      } catch (error) {
        const preview = statement.replace(/\s+/g, ' ').substring(0, 50);
        console.error('Chrysorrhoe SQL statement execution failed:', preview + '...', error.message);
        console.error('Full statement:', statement);
        throw error;
      }
    }
  }
}

// Execute specified migration script
async function runMigration(scriptFileName) {
  try {
    console.log('Starting Chrysorrhoe database migration...');
    
    // Load database configuration
    const { dbAsync } = loadDatabaseConfig();
    
    // Build migration script path
    const scriptPath = path.join(__dirname, 'migrations', scriptFileName);
    
    if (!fs.existsSync(scriptPath)) {
      console.error('Chrysorrhoe migration script does not exist:', scriptPath);
      process.exit(1);
    }
    
    // Read migration script
    const migrationScript = readMigrationScript(scriptPath);
    
    // Execute migration script
    await executeSqlScript(dbAsync, migrationScript);
    
    console.log('Chrysorrhoe database migration executed successfully:', scriptFileName);
    process.exit(0);
    
  } catch (error) {
    console.error('Chrysorrhoe database migration failed:', error.message);
    process.exit(1);
  }
}

// Execute all Chrysorrhoe migration scripts
async function runAllMigrations() {
  try {
    console.log('Starting Chrysorrhoe database migration...');
    
    // Load database configuration
    const { dbAsync } = loadDatabaseConfig();
    
    // Get all Chrysorrhoe migration scripts in the migrations directory
    const migrationsDir = path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error('Chrysorrhoe migrations directory does not exist:', migrationsDir);
      process.exit(1);
    }
    
    // Read and sort Chrysorrhoe migration scripts by filename (assumes filename contains date prefix)
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    if (migrationFiles.length === 0) {
      console.log('No Chrysorrhoe migration scripts found to execute');
      process.exit(0);
    }
    
    console.log(`Found ${migrationFiles.length} Chrysorrhoe migration scripts, will execute in order:`);
    migrationFiles.forEach(file => console.log(`- ${file}`));
    
    // Execute each Chrysorrhoe migration script
    for (const file of migrationFiles) {
      console.log(`\nExecuting Chrysorrhoe migration script: ${file}`);
      const scriptPath = path.join(migrationsDir, file);
      const migrationScript = readMigrationScript(scriptPath);
      await executeSqlScript(dbAsync, migrationScript);
      console.log(`Chrysorrhoe migration script executed successfully: ${file}`);
    }
    
    console.log('\nAll Chrysorrhoe database migrations executed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('Chrysorrhoe database migration failed:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return { command: 'all' };
  }
  
  if (args[0] === '--script' && args.length > 1) {
    return { command: 'single', scriptName: args[1] };
  }
  
  return { command: 'unknown' };
}

// Main function
async function main() {
  const args = parseArgs();
  
  if (args.command === 'all') {
    await runAllMigrations();
  } else if (args.command === 'single' && args.scriptName) {
    await runMigration(args.scriptName);
  } else {
    console.log('Chrysorrhoe database migration usage:');
    console.log('  node migrate.js                   # Execute all Chrysorrhoe migration scripts');
    console.log('  node migrate.js --script <filename> # Execute specified Chrysorrhoe migration script');
    process.exit(0);
  }
}

// Execute main function
main();