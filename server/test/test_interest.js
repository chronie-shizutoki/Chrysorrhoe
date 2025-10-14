const interestScheduler = require('../services/InterestScheduler');
const { dbAsync } = require('../config/database');

/**
 * Test interest calculation functionality
 */
async function testInterestCalculation() {
  try {
    console.log('Connecting to SQLite database');
    
    // Check if the database tables are initialized
    const checkDb = await dbAsync.get('SELECT name FROM sqlite_master WHERE type="table" AND name="wallets"');
    if (!checkDb) {
      console.error('Error: Database tables not initialized');
      process.exit(1);
    }
    
    // Check if there are any wallet data
    const wallets = await dbAsync.all('SELECT * FROM wallets LIMIT 5');
    console.log(`Found ${wallets.length} wallets`);
    if (wallets.length > 0) {
      console.log('Example wallet data:', wallets[0]);
    }
    
    // Initialize interest log table
    console.log('Initializing interest log table...');
    const interestService = require('../services/InterestService');
    const service = new interestService();
    await service.initInterestLogTable();
    
    // Manually trigger interest calculation
    console.log('Manually triggering interest calculation...');
    const result = await interestScheduler.executeNow();
    
    console.log('Interest calculation result:', result);
    
    if (result.success) {
      console.log(`Successfully processed ${result.processedCount} wallets, total interest ${result.totalInterest.toFixed(2)}`);
      
      // Check the latest interest log record
      const log = await dbAsync.get('SELECT * FROM interest_logs ORDER BY created_at DESC LIMIT 1');
      if (log) {
        console.log('Latest interest log record:', log);
      }
    } else {
      console.error('Interest calculation failed:', result.message);
    }
    
    // Test interest reissue functionality
    console.log('Testing interest reissue functionality...');
    const reissueResult = await interestScheduler.checkMissingInterest();
    console.log('Interest reissue result:', reissueResult);
    
  } catch (error) {
    console.error('Error during interest calculation test:', error);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

testInterestCalculation();