/**
 * Definition of local storage data structure
 * Defines the data models for wallets and transactions for browser local storage
 */

// Storage key constants
export const STORAGE_KEYS = {
  WALLETS: 'wallets',
  TRANSACTIONS: 'transactions',
  CURRENT_WALLET: 'current_wallet',
  APP_SETTINGS: 'app_settings'
};

// Wallet data model
export const WalletSchema = {
  id: '', // UUID string
  username: '', // Unique username identifier
  balance: 0, // Balance amount, numeric type
  createdAt: '', // Creation time, ISO string
  updatedAt: '' // Update time, ISO string
};

// Transaction data model
export const TransactionSchema = {
  id: '', // UUID string
  fromWalletId: null, // Sender wallet ID, null for initial deposit
  toWalletId: null, // Receiver wallet ID, null for extraction
  amount: 0, // Transaction amount
  transactionType: '', // Transaction type: 'transfer', 'initial_deposit'
  description: '', // Transaction description
  createdAt: '' // Creation time, ISO string
};

// Application settings model
export const AppSettingsSchema = {
  language: 'en-US', // Current language
  theme: 'light', // Theme setting
  currency: 'USD' // Currency type
};

// Data validation functions
export const validateWallet = (wallet) => {
  const errors = [];
  
  if (!wallet.id || typeof wallet.id !== 'string') {
    errors.push('Invalid wallet ID');
  }
  
  if (!wallet.username || typeof wallet.username !== 'string' || wallet.username.length < 1) {
    errors.push('Invalid username');
  }
  
  if (typeof wallet.balance !== 'number' || wallet.balance < 0) {
    errors.push('Balance must be a non-negative number');
  }
  
  if (!wallet.createdAt || !wallet.updatedAt) {
    errors.push('Invalid timestamp');
  }
  
  return errors;
};

export const validateTransaction = (transaction) => {
  const errors = [];
  
  if (!transaction.id || typeof transaction.id !== 'string') {
    errors.push('Invalid transaction ID');
  }
  
  if (typeof transaction.amount !== 'number' || transaction.amount <= 0) {
    errors.push('Transaction amount must be a positive number');
  }
  
  if (!['transfer', 'initial_deposit'].includes(transaction.transactionType)) {
    errors.push('Invalid transaction type');
  }
  
  if (!transaction.createdAt) {
    errors.push('Invalid timestamp');
  }
  
  return errors;
};

// Generate a UUID
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Create a new wallet object
export const createWallet = (username, initialBalance = 0) => {
  const now = new Date().toISOString();
  return {
    id: generateUUID(),
    username: username.trim(),
    balance: Number(initialBalance),
    createdAt: now,
    updatedAt: now
  };
};

// Create a new transaction object
export const createTransaction = (fromWalletId, toWalletId, amount, type = 'transfer', description = '') => {
  return {
    id: generateUUID(),
    fromWalletId,
    toWalletId,
    amount: Number(amount),
    transactionType: type,
    description: description.trim(),
    createdAt: new Date().toISOString()
  };
};