#!/usr/bin/env node

/**
 * i18n Translation Checker
 * This script checks for missing and unused translations in both client and server
 */

const fs = require('fs');
const path = require('path');

// Project root directory
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Supported languages
const SUPPORTED_LANGUAGES = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP'];
const DEFAULT_LANGUAGE = 'en-US';

/**
 * Main function
 */
async function main() {
  console.log('\n===== i18n Translation Checker =====\n');
  
  // Check client translations
  console.log('Checking client translations...');
  await checkTranslations(
    path.join(PROJECT_ROOT, 'client', 'src', 'i18n', 'locales'),
    path.join(PROJECT_ROOT, 'client', 'src')
  );
  
  // Check server translations
  console.log('\nChecking server translations...');
  await checkTranslations(
    path.join(PROJECT_ROOT, 'server', 'config', 'locales'),
    path.join(PROJECT_ROOT, 'server')
  );
  
  console.log('\n===== Check Complete =====\n');
}

/**
 * Check translations for missing keys and unused keys
 * @param {string} localesDir - Directory containing translation files
 * @param {string} codeDir - Directory to search for used translations
 */
async function checkTranslations(localesDir, codeDir) {
  try {
    // Load all translation files
    const translations = {};
    for (const lang of SUPPORTED_LANGUAGES) {
      const filePath = path.join(localesDir, `${lang}.json`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        translations[lang] = JSON.parse(content);
      } else {
        console.log(`Warning: Translation file not found for ${lang}`);
        translations[lang] = {};
      }
    }
    
    // Get all translation keys from default language
    const defaultKeys = getAllKeys(translations[DEFAULT_LANGUAGE]);
    
    // Check for missing translations in other languages
    checkMissingTranslations(defaultKeys, translations);
    
    // Find all used translation keys in code
    const usedKeys = await findUsedKeys(codeDir);
    
    // Check for unused translations
    checkUnusedTranslations(defaultKeys, usedKeys, DEFAULT_LANGUAGE);
    
  } catch (error) {
    console.error('Error checking translations:', error);
  }
}

/**
 * Get all nested keys from an object
 * @param {Object} obj - Object to extract keys from
 * @param {string} prefix - Prefix for nested keys
 * @returns {Array} Array of all keys
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      keys = [...keys, ...getAllKeys(value, newKey)];
    } else {
      keys.push(newKey);
    }
  }
  
  return keys;
}

/**
 * Check for missing translations in languages other than default
 * @param {Array} defaultKeys - Keys from default language
 * @param {Object} translations - All translations
 */
function checkMissingTranslations(defaultKeys, translations) {
  let hasMissing = false;
  
  for (const [lang, translationObj] of Object.entries(translations)) {
    if (lang === DEFAULT_LANGUAGE) continue;
    
    const missingKeys = [];
    for (const key of defaultKeys) {
      if (!getValueByPath(translationObj, key)) {
        missingKeys.push(key);
      }
    }
    
    if (missingKeys.length > 0) {
      hasMissing = true;
      console.log(`\nMissing translations in ${lang}:`);
      missingKeys.forEach(key => console.log(`  - ${key}`));
    }
  }
  
  if (!hasMissing) {
    console.log('✓ No missing translations found');
  }
}

/**
 * Find all used translation keys in code
 * @param {string} codeDir - Directory to search
 * @returns {Set} Set of used keys
 */
async function findUsedKeys(codeDir) {
  const usedKeys = new Set();
  const files = await getAllFiles(codeDir);
  
  // Regex patterns to find translation keys
  const patterns = [
    /t\(["'](\w+(?:\.\w+)*)["']/g, // t('key') or t("key")
    /\{\{\s*t\(["'](\w+(?:\.\w+)*)["']/g, // {{ t('key') }} in JSX
    /translate\(["'](\w+(?:\.\w+)*)["']/g, // translate('key')
    /__\(["'](\w+(?:\.\w+)*)["']/g, // __('key')
    /i18n\.t\(["'](\w+(?:\.\w+)*)["']/g // i18n.t('key')
  ];
  
  for (const file of files) {
    // Skip node_modules, dist, build directories
    if (file.includes('node_modules') || file.includes('dist') || file.includes('build')) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          usedKeys.add(match[1]);
        }
      }
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  }
  
  return usedKeys;
}

/**
 * Get all files in a directory recursively
 * @param {string} dir - Directory to search
 * @returns {Array} Array of file paths
 */
async function getAllFiles(dir) {
  const results = [];
  
  function traverse(currentPath) {
    const files = fs.readdirSync(currentPath);
    
    for (const file of files) {
      const fullPath = path.join(currentPath, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else {
        // Only check relevant file types
        if (/\.(js|jsx|ts|tsx|html|vue)$/.test(file)) {
          results.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return results;
}

/**
 * Check for unused translations
 * @param {Array} defaultKeys - All keys in default language
 * @param {Set} usedKeys - Keys used in code
 * @param {string} defaultLang - Default language code
 */
function checkUnusedTranslations(defaultKeys, usedKeys, defaultLang) {
  const unusedKeys = defaultKeys.filter(key => !usedKeys.has(key));
  
  if (unusedKeys.length > 0) {
    console.log(`\nUnused translations in ${defaultLang}:`);
    unusedKeys.forEach(key => console.log(`  - ${key}`));
    console.log(`\nTotal unused keys: ${unusedKeys.length}`);
  } else {
    console.log('✓ No unused translations found');
  }
}

/**
 * Get value from object using dot notation path
 * @param {Object} obj - Object to search
 * @param {string} path - Path to value
 * @returns {*} Value found at path or undefined
 */
function getValueByPath(obj, path) {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

// Run the main function
main().catch(console.error);