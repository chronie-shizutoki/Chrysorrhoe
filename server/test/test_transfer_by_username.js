// Chrysorrhoe: Test transfer by username functionality
const { dbAsync } = require('../config/database');
const WalletRepository = require('../repositories/WalletRepository');
const TransactionRepository = require('../repositories/TransactionRepository');

// Chrysorrhoe: Import transfer-related modules and functions
const { validateTransfer } = require('../routes/transfers');
const executeTransfer = require('../routes/transfers').executeTransfer;

const walletRepo = new WalletRepository();
const transactionRepo = new TransactionRepository();

// Chrysorrhoe: Test account information
const testUsers = {
  sender: {
    username: 'test_sender',
    initialBalance: 1000.00
  },
  receiver: {
    username: 'test_receiver',
    initialBalance: 500.00
  }
};

// Chrysorrhoe: Transfer amount
const transferAmount = 200.00;

async function setupTestData() {
  console.log('Chrysorrhoe: Setting up test data...');
  
  try {
    // Chrysorrhoe: Begin transaction
    await dbAsync.beginTransaction();
    
    // Chrysorrhoe: Clean up test data
    await dbAsync.run('DELETE FROM wallets WHERE username IN (?, ?)', [
      testUsers.sender.username,
      testUsers.receiver.username
    ]);
    
    await dbAsync.run(`DELETE FROM transactions WHERE from_wallet_id IN (
      SELECT id FROM wallets WHERE username IN (?, ?)
    ) OR to_wallet_id IN (
      SELECT id FROM wallets WHERE username IN (?, ?)
    )`, [
      testUsers.sender.username,
      testUsers.receiver.username,
      testUsers.sender.username,
      testUsers.receiver.username
    ]);
    
    // Chrysorrhoe: Create test wallets
    await walletRepo.create({
      username: testUsers.sender.username,
      balance: testUsers.sender.initialBalance
    });
    
    await walletRepo.create({
      username: testUsers.receiver.username,
      balance: testUsers.receiver.initialBalance
    });
    
    // Chrysorrhoe: Commit transaction
    await dbAsync.commit();
    
    console.log('Chrysorrhoe: Test data setup completed');
    
  } catch (error) {
    await dbAsync.rollback();
    console.error('Chrysorrhoe: Error setting up test data:', error);
    throw error;
  }
}

async function testTransferByUsername() {
  console.log('\nChrysorrhoe: Testing transfer by username functionality...');
  
  try {
    // Chrysorrhoe: Create mock request and response objects
    const mockReq = {
      body: {
        fromUsername: testUsers.sender.username,
        toUsername: testUsers.receiver.username,
        amount: transferAmount,
        description: 'Chrysorrhoe: Test transfer by username'
      }
    };
    
    let mockRes = {
      statusCode: 200,
      responseBody: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseBody = data;
        return this;
      }
    };
    
    // Chrysorrhoe: Call transfer execution function directly 
    await executeTransfer(mockReq, mockRes);
    
    // Chrysorrhoe: Verify transfer success
    console.log('Chrysorrhoe: Transfer response status code:', mockRes.statusCode);
    console.log('Chrysorrhoe: Transfer response body:', JSON.stringify(mockRes.responseBody, null, 2));
    
    if (mockRes.statusCode === 201 && mockRes.responseBody && mockRes.responseBody.success) {
      console.log('✅ Chrysorrhoe: Transfer request successful');
      
      // Chrysorrhoe: Verify balance update
      const senderWallet = await walletRepo.findByUsername(testUsers.sender.username);
      const receiverWallet = await walletRepo.findByUsername(testUsers.receiver.username);
      
      const expectedSenderBalance = testUsers.sender.initialBalance - transferAmount;
      const expectedReceiverBalance = testUsers.receiver.initialBalance + transferAmount;
      
      console.log(`Chrysorrhoe: Sender balance: ${senderWallet.balance}, Expected: ${expectedSenderBalance}`);
      console.log(`Chrysorrhoe: Receiver balance: ${receiverWallet.balance}, Expected: ${expectedReceiverBalance}`);
      
      if (parseFloat(senderWallet.balance) === expectedSenderBalance && 
          parseFloat(receiverWallet.balance) === expectedReceiverBalance) {
        console.log('✅ Chrysorrhoe: Balance update correct');
        return true;
      } else {
        console.error('❌ Chrysorrhoe: Balance update error');
        return false;
      }
    } else {
      console.error('❌ Chrysorrhoe: Transfer request failed');
      return false;
    }
    
  } catch (error) {
    console.error('Chrysorrhoe: Error in transfer test:', error);
    return false;
  }
}

async function cleanupTestData() {
  console.log('\nChrysorrhoe: Cleaning up test data...');
  
  try {
    // Chrysorrhoe: Clean up test data
    await dbAsync.run(`DELETE FROM transactions WHERE from_wallet_id IN (
      SELECT id FROM wallets WHERE username IN (?, ?)
    ) OR to_wallet_id IN (
      SELECT id FROM wallets WHERE username IN (?, ?)
    )`, [
      testUsers.sender.username,
      testUsers.receiver.username,
      testUsers.sender.username,
      testUsers.receiver.username
    ]);
    
    await dbAsync.run('DELETE FROM wallets WHERE username IN (?, ?)', [
      testUsers.sender.username,
      testUsers.receiver.username
    ]);
    
    console.log('Chrysorrhoe: Test data cleanup completed');
    
  } catch (error) {
    console.error('Chrysorrhoe: Error cleaning up test data:', error);
  }
}

// To make the executeTransfer function importable, it needs to be exported in transfers.js
function prepareModules() {
  console.log('Chrysorrhoe: Preparing test modules...');
  
  // Due to Node.js module caching mechanism, we need to ensure the executeTransfer function is accessible
  // We don't make any modifications here because we call the executeTransfer function directly
  console.log('Chrysorrhoe: Test modules preparation completed');
}

// Chrysorrhoe: Run test
async function runTest() {
  try {
    // Chrysorrhoe: Prepare test modules
    prepareModules();
    
    // Chrysorrhoe: Set up test data
    await setupTestData();
    
    // Chrysorrhoe: Run test
    const testResult = await testTransferByUsername();
    
    // Chrysorrhoe: Clean up test data
    await cleanupTestData();
    
    console.log('\nChrysorrhoe: Test completed:', testResult ? 'Success' : 'Failure');
    process.exit(testResult ? 0 : 1);
    
  } catch (error) {
    console.error('Chrysorrhoe: Error running test:', error);
    
    try {
      // Chrysorrhoe: Try to clean up test data
      await cleanupTestData();
    } catch (cleanupError) {
      console.error('Chrysorrhoe: Error cleaning up test data:', cleanupError);
    }
    
    process.exit(1);
  }
}

// Chrysorrhoe: Run test
runTest();