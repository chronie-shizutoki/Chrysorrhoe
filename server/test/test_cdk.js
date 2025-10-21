const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('jest');
const cdkService = require('../services/CdkService');
const { dbAsync } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

// Mock data for testing
const testCdkKey = 'test1-2345-abcd-6789-efgh-ijkl';
const testUsername = 'test_user_for_cdk';
let originalCdks = null;

describe('CDK Service Tests', () => {
  beforeEach(async () => {
    // Save original CDKs data for restoration after tests
    const cdksFilePath = path.join(__dirname, '..', 'data', 'cdks.json');
    const data = await fs.readFile(cdksFilePath, 'utf8');
    originalCdks = JSON.parse(data);
    
    // Create test user wallet if not exists
    try {
      const existingWallet = await dbAsync.get(
        'SELECT * FROM wallets WHERE username = ?',
        [testUsername]
      );
      
      if (!existingWallet) {
        await dbAsync.run(
          'INSERT INTO wallets (id, username, balance, created_at) VALUES (?, ?, ?, ?)',
          ['test-wallet-id', testUsername, 0, new Date().toISOString()]
        );
      } else {
        // Reset balance for testing
        await dbAsync.run(
          'UPDATE wallets SET balance = 0 WHERE username = ?',
          [testUsername]
        );
      }
    } catch (error) {
      console.error('Error setting up test wallet:', error);
    }
    
    // Add test CDK
    await cdkService.addCdk({
      key: testCdkKey,
      amount: 100,
      currency: 'USD',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days expiry
    });
  });
  
  afterEach(async () => {
    // Restore original CDKs data
    const cdksFilePath = path.join(__dirname, '..', 'data', 'cdks.json');
    await fs.writeFile(cdksFilePath, JSON.stringify(originalCdks, null, 2), 'utf8');
    
    // Reload CDKs in service
    await cdkService.loadCdks();
  });
  
  it('should validate CDK format correctly', () => {
    // Valid format
    assert.strictEqual(cdkService.validateCdkFormat('abcd-1234-efgh-5678-ijkl-9012'), true);
    
    // Invalid formats
    assert.strictEqual(cdkService.validateCdkFormat('abcd-1234'), false); // Too short
    assert.strictEqual(cdkService.validateCdkFormat('abcd1234efgh5678ijkl9012'), false); // No hyphens
    assert.strictEqual(cdkService.validateCdkFormat('abcd-1234-efgh-5678-ijkl-9012-extra'), false); // Too long
    assert.strictEqual(cdkService.validateCdkFormat('abcd-1234-efgh-5678-ijkl-901@'), false); // Invalid character
  });
  
  it('should find CDK by key', () => {
    const cdk = cdkService.findCdkByKey(testCdkKey);
    assert.ok(cdk);
    assert.strictEqual(cdk.key, testCdkKey);
    assert.strictEqual(cdk.amount, 100);
  });
  
  it('should validate active CDK successfully', () => {
    const cdk = cdkService.findCdkByKey(testCdkKey);
    const validation = cdkService.validateCdk(cdk);
    assert.strictEqual(validation.success, true);
  });
  
  it('should redeem CDK successfully', async () => {
    // Get initial balance
    const walletBefore = await dbAsync.get(
      'SELECT balance FROM wallets WHERE username = ?',
      [testUsername]
    );
    
    // Redeem CDK
    const result = await cdkService.redeemCdk(testCdkKey, testUsername);
    
    // Check result
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.amount, 100);
    
    // Check wallet balance
    const walletAfter = await dbAsync.get(
      'SELECT balance FROM wallets WHERE username = ?',
      [testUsername]
    );
    
    assert.strictEqual(parseFloat(walletAfter.balance), parseFloat(walletBefore.balance) + 100);
    
    // Check CDK status
    const cdk = cdkService.findCdkByKey(testCdkKey);
    assert.strictEqual(cdk.status, 'USED');
    assert.strictEqual(cdk.used_by, testUsername);
  });
  
  it('should reject already used CDK', async () => {
    // First redemption
    await cdkService.redeemCdk(testCdkKey, testUsername);
    
    // Second redemption should fail
    try {
      await cdkService.redeemCdk(testCdkKey, testUsername);
      assert.fail('Should have thrown an error for already used CDK');
    } catch (error) {
      assert.ok(error.message.includes('CDK code has already been used'));
    }
  });
  
  it('should reject invalid CDK format', async () => {
    try {
      await cdkService.redeemCdk('invalid-format', testUsername);
      assert.fail('Should have thrown an error for invalid CDK format');
    } catch (error) {
      assert.ok(error.message.includes('Invalid CDK format'));
    }
  });
  
  it('should reject non-existent CDK', async () => {
    try {
      await cdkService.redeemCdk('non-exist-1234-abcd-5678-efgh-ijkl', testUsername);
      assert.fail('Should have thrown an error for non-existent CDK');
    } catch (error) {
      assert.ok(error.message.includes('CDK code not found'));
    }
  });
});

console.log('CDK tests have been set up. Run with: mocha server/test/test_cdk.js');