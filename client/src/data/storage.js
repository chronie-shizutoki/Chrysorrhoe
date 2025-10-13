/**
 * Local Storage Manager
 * Provides a wrapper for browser localStorage with CRUD operations
 */

import { STORAGE_KEYS, AppSettingsSchema } from './schema.js';
import i18n from '../i18n/config';

class StorageManager {
  constructor() {
    this.isAvailable = this.checkStorageAvailability();
  }

  // Check if localStorage is available
  checkStorageAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn(i18n.t('messages.localStorageNotAvailable'));
      return false;
    }
  }

  // Get data from localStorage
  get(key) {
    if (!this.isAvailable) return null;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(i18n.t('messages.localStorageReadFailed', { key }), error);
      return null;
    }
  }

  // Set data in localStorage
  set(key, value) {
    if (!this.isAvailable) return false;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(i18n.t('messages.localStorageSaveFailed', { key }), error);
      return false;
    }
  }

  // Remove data from localStorage
  remove(key) {
    if (!this.isAvailable) return false;
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(i18n.t('messages.localStorageRemoveFailed', { key }), error);
      return false;
    }
  }

  // Clear all application data from localStorage
  clear() {
    if (!this.isAvailable) return false;
    
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error(i18n.t('messages.localStorageClearFailed'), error);
      return false;
    }
  }

  // Get all wallets from localStorage
  getWallets() {
    return this.get(STORAGE_KEYS.WALLETS) || [];
  }

  // Save wallet list to localStorage
  setWallets(wallets) {
    return this.set(STORAGE_KEYS.WALLETS, wallets);
  }

  // Get all transactions from localStorage
  getTransactions() {
    return this.get(STORAGE_KEYS.TRANSACTIONS) || [];
  }

  // Save transaction list to localStorage
  setTransactions(transactions) {
    return this.set(STORAGE_KEYS.TRANSACTIONS, transactions);
  }

  // Get current wallet ID from localStorage
  getCurrentWalletId() {
    return this.get(STORAGE_KEYS.CURRENT_WALLET);
  }

  // Set current wallet ID in localStorage
  setCurrentWalletId(walletId) {
    return this.set(STORAGE_KEYS.CURRENT_WALLET, walletId);
  }

  // Get application settings from localStorage
  getAppSettings() {
    const settings = this.get(STORAGE_KEYS.APP_SETTINGS);
    return settings ? { ...AppSettingsSchema, ...settings } : AppSettingsSchema;
  }

  // Save application settings to localStorage
  setAppSettings(settings) {
    const currentSettings = this.getAppSettings();
    const newSettings = { ...currentSettings, ...settings };
    return this.set(STORAGE_KEYS.APP_SETTINGS, newSettings);
  }

  // Initialize localStorage with default data if empty
  initializeStorage() {
    // Check if initialization is needed
    const wallets = this.getWallets();
    const transactions = this.getTransactions();
    const settings = this.getAppSettings();

    // If there is no data, create empty data structures
    if (wallets.length === 0) {
      this.setWallets([]);
    }
    
    if (transactions.length === 0) {
      this.setTransactions([]);
    }

    // Ensure settings exist
    this.setAppSettings(settings);

    console.log(i18n.t('messages.localStorageInitialized'));
    return true;
  }

  // Export data (for backup)
  exportData() {
    return {
      wallets: this.getWallets(),
      transactions: this.getTransactions(),
      settings: this.getAppSettings(),
      exportDate: new Date().toISOString()
    };
  }

  // Import data (for recovery)
  importData(data) {
    try {
      if (data.wallets) this.setWallets(data.wallets);
      if (data.transactions) this.setTransactions(data.transactions);
      if (data.settings) this.setAppSettings(data.settings);
      return true;
    } catch (error) {
      console.error(i18n.t('messages.dataImportFailed'), error);
      return false;
    }
  }

  // Get storage usage information
  getStorageInfo() {
    if (!this.isAvailable) return null;

    const data = this.exportData();
    const dataSize = JSON.stringify(data).length;
    
    return {
      isAvailable: this.isAvailable,
      dataSize: dataSize,
      walletCount: data.wallets.length,
      transactionCount: data.transactions.length
    };
  }
}

// Create singleton instance
export const storageManager = new StorageManager();
export default storageManager;