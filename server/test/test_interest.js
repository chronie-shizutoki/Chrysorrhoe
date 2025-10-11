const interestScheduler = require('../services/InterestScheduler');
const { dbAsync } = require('../config/database');

/**
 * Chrysorrhoe: Test interest calculation functionality
 */
async function testInterestCalculation() {
  try {
    console.log('Chrysorrhoe: Connecting to SQLite database');
    
    // Chrysorrhoe: Make sure the database tables are initialized
    const checkDb = await dbAsync.get('SELECT name FROM sqlite_master WHERE type="table" AND name="wallets"');
    if (!checkDb) {
      console.error('Chrysorrhoe: Error: Database tables not initialized');
      process.exit(1);
    }
    
    // Chrysorrhoe: Check if there are any wallet data
    const wallets = await dbAsync.all('SELECT * FROM wallets LIMIT 5');
    console.log(`Chrysorrhoe: Found ${wallets.length} wallets`);
    if (wallets.length > 0) {
      console.log('Chrysorrhoe: Example wallet data:', wallets[0]);
    }
    
    // Chrysorrhoe: Initialize interest log table
    console.log('Chrysorrhoe: Initializing interest log table...');
    const interestService = require('../services/InterestService');
    const service = new interestService();
    await service.initInterestLogTable();
    
    // Chrysorrhoe: Manually trigger interest calculation
    console.log('Chrysorrhoe: Manually triggering interest calculation...');
    const result = await interestScheduler.executeNow();
    
    console.log('Chrysorrhoe: Interest calculation result:', result);
    
    if (result.success) {
      console.log(`Chrysorrhoe: Successfully processed ${result.processedCount} wallets, total interest ${result.totalInterest.toFixed(2)}`);
      
      // Chrysorrhoe: Check the latest interest log record
      const log = await dbAsync.get('SELECT * FROM interest_logs ORDER BY created_at DESC LIMIT 1');
      if (log) {
        console.log('Chrysorrhoe: Latest interest log record:', log);
      }
    } else {
      console.error('Chrysorrhoe: Interest calculation failed:', result.message);
    }
    
    // Chrysorrhoe: Test interest reissue functionality
    console.log('Chrysorrhoe: Testing interest reissue functionality...');
    const reissueResult = await interestScheduler.checkMissingInterest();
    console.log('Chrysorrhoe: Interest reissue result:', reissueResult);
    
  } catch (error) {
    console.error('Chrysorrhoe: Error during interest calculation test:', error);
  } finally {
    // Chrysorrhoe: Close database connection
    process.exit(0);
  }
}

testInterestCalculation();