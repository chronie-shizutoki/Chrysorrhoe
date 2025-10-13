const path = require('path');
const fs = require('fs').promises;

// Supported language list
const SUPPORTED_LANGUAGES = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP'];
const DEFAULT_LANGUAGE = 'en-US';

// Translation cache
let translations = {};

/**
 * Initialize translation files
 */
async function initTranslations() {
  const localesDir = path.join(__dirname, 'locales');
  
  try {
    // Ensure the locales directory exists
    try {
      await fs.mkdir(localesDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    
    // Load all supported language files
    for (const lang of SUPPORTED_LANGUAGES) {
      const filePath = path.join(localesDir, `${lang}.json`);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        translations[lang] = JSON.parse(content);
      } catch (error) {
        console.warn(`Failed to load translation file for ${lang}: ${error.message}`);
        // If the file does not exist, create default translations
        translations[lang] = getDefaultTranslations(lang);
        await fs.writeFile(filePath, JSON.stringify(translations[lang], null, 2), 'utf8');
      }
    }
    
    console.log('Translation files loaded successfully');
  } catch (error) {
    console.error('Error initializing translations:', error);
  }
}

/**
 * Get default translations for a language
 * @param {string} lang - Language code
 * @returns {Object} Default translation object
 */
function getDefaultTranslations(lang) {
  const enTranslations = {
    errors: {
      // General errors
      serverError: 'Internal server error',
      resourceNotFound: 'Resource not found',
      routeNotFound: 'Route not found',
      authenticationRequired: 'Authentication required',
      accessDenied: 'Access denied',
      
      // Wallet-related errors
      walletNotFound: 'Wallet does not exist',
      usernameRequired: 'Username is required',
      usernameMustBeString: 'Username must be a string',
      usernameLength: 'Username length must be between 2-50 characters',
      usernameEnglishOnly: 'Username can only contain English letters',
      usernameExists: 'Username already exists',
      initialBalanceMustBeZero: 'Initial balance must be 0',
      failedToCreateWallet: 'Failed to create wallet',
      failedToFetchWallet: 'Failed to fetch wallet information',
      
      // Transfer-related errors
      senderWalletRequired: 'Sender wallet ID or username is required',
      receiverWalletRequired: 'Receiver wallet ID or username is required',
      senderWalletMismatch: 'Sender wallet ID does not match the provided username',
      receiverWalletMismatch: 'Receiver wallet ID does not match the provided username',
      cannotTransferToSelf: 'Cannot transfer to oneself',
      amountMustBePositive: 'Amount must be a number greater than 0',
      amountDecimalPlaces: 'Amount must be up to 2 decimal places',
      insufficientBalance: 'Insufficient balance',
      transferFailed: 'Transfer failed',
      systemError: 'System error, please try again later',
      
      // Pagination related errors
      pageMustBePositive: 'Page number must be a positive integer',
      limitRange: 'Limit must be between 1 and 100',
      
      // Third-party payment related errors
      thirdPartyPaymentFailed: 'Third-party payment failed',
      
      // Exchange rate related errors
      noExchangeRateRecord: 'No exchange rate record found',
      mustProvideCleanupDate: 'Must provide cleanup date',
      invalidDateFormat: 'Invalid date format',
      failedToRefreshExchangeRates: 'Failed to refresh exchange rates',
      failedToCleanupExchangeRates: 'Failed to clean up exchange rate records'
    }
  };
  
  // Return the corresponding translation based on the language
  const langMap = {
    'en-US': enTranslations,
    'zh-CN': {
      errors: {
        // 通用错误
        serverError: '服务器内部错误',
        resourceNotFound: '资源未找到',
        routeNotFound: '路由未找到',
        authenticationRequired: '需要身份验证',
        accessDenied: '访问被拒绝',
        
        // 钱包相关错误
        walletNotFound: '钱包不存在',
        usernameRequired: '用户名是必需的',
        usernameMustBeString: '用户名必须是字符串',
        usernameLength: '用户名长度必须在2-50个字符之间',
        usernameEnglishOnly: '用户名只能包含英文字母',
        usernameExists: '用户名已存在',
        initialBalanceMustBeZero: '初始余额必须为0',
        failedToCreateWallet: '创建钱包失败',
        failedToFetchWallet: '获取钱包信息失败',
        
        // 转账相关错误
        senderWalletRequired: '发送方钱包ID或用户名是必需的',
        receiverWalletRequired: '接收方钱包ID或用户名是必需的',
        senderWalletMismatch: '发送方钱包ID与提供的用户名不匹配',
        receiverWalletMismatch: '接收方钱包ID与提供的用户名不匹配',
        cannotTransferToSelf: '不能转账给自己',
        amountMustBePositive: '金额必须是大于0的数字',
        amountDecimalPlaces: '金额最多保留2位小数',
        insufficientBalance: '余额不足',
        transferFailed: '转账失败',
        systemError: '系统错误，请稍后再试',
        
        // 分页相关错误
        pageMustBePositive: '页码必须是正整数',
        limitRange: '限制数量必须在1到100之间',
        
        // 第三方支付相关错误
        thirdPartyPaymentFailed: '第三方支付失败',
        
        // 汇率相关错误
        noExchangeRateRecord: '未找到汇率记录',
        mustProvideCleanupDate: '必须提供清理日期',
        invalidDateFormat: '无效的日期格式',
        failedToRefreshExchangeRates: '刷新汇率失败',
        failedToCleanupExchangeRates: '清理汇率记录失败'
      }
    },
    'zh-TW': {
      errors: {
        // 通用错误
        serverError: '伺服器內部錯誤',
        resourceNotFound: '資源未找到',
        routeNotFound: '路由未找到',
        authenticationRequired: '需要身份驗證',
        accessDenied: '訪問被拒絕',
        
        // 錢包相關錯誤
        walletNotFound: '錢包不存在',
        usernameRequired: '使用者名稱是必需的',
        usernameMustBeString: '使用者名稱必須是字串',
        usernameLength: '使用者名稱長度必須在2-50個字元之間',
        usernameEnglishOnly: '使用者名稱只能包含英文字母',
        usernameExists: '使用者名稱已存在',
        initialBalanceMustBeZero: '初始餘額必須為0',
        failedToCreateWallet: '建立錢包失敗',
        failedToFetchWallet: '獲取錢包資訊失敗',
        
        // 轉賬相關錯誤
        senderWalletRequired: '發送方錢包ID或使用者名稱是必需的',
        receiverWalletRequired: '接收方錢包ID或使用者名稱是必需的',
        senderWalletMismatch: '發送方錢包ID與提供的使用者名稱不匹配',
        receiverWalletMismatch: '接收方錢包ID與提供的使用者名稱不匹配',
        cannotTransferToSelf: '不能轉賬給自己',
        amountMustBePositive: '金額必須是大於0的數字',
        amountDecimalPlaces: '金額最多保留2位小數',
        insufficientBalance: '餘額不足',
        transferFailed: '轉賬失敗',
        systemError: '系統錯誤，請稍後再試',
        
        // 分頁相關錯誤
        pageMustBePositive: '頁碼必須是正整數',
        limitRange: '限制數量必須在1到100之間',
        
        // 第三方支付相關錯誤
        thirdPartyPaymentFailed: '第三方支付失敗',
        
        // 匯率相關錯誤
        noExchangeRateRecord: '未找到匯率記錄',
        mustProvideCleanupDate: '必須提供清理日期',
        invalidDateFormat: '無效的日期格式',
        failedToRefreshExchangeRates: '刷新匯率失敗',
        failedToCleanupExchangeRates: '清理匯率記錄失敗'
      }
    },
    'ja-JP': {
      errors: {
        // 通用エラー
        serverError: 'サーバー内部エラー',
        resourceNotFound: 'リソースが見つかりません',
        routeNotFound: 'ルートが見つかりません',
        authenticationRequired: '認証が必要です',
        accessDenied: 'アクセスが拒否されました',
        
        // ウォレット関連のエラー
        walletNotFound: 'ウォレットが存在しません',
        usernameRequired: 'ユーザー名は必須です',
        usernameMustBeString: 'ユーザー名は文字列でなければなりません',
        usernameLength: 'ユーザー名の長さは2〜50文字でなければなりません',
        usernameEnglishOnly: 'ユーザー名には英字のみ使用できます',
        usernameExists: 'ユーザー名は既に存在します',
        initialBalanceMustBeZero: '初期残高は0でなければなりません',
        failedToCreateWallet: 'ウォレットの作成に失敗しました',
        failedToFetchWallet: 'ウォレット情報の取得に失敗しました',
        
        // 転送関連のエラー
        senderWalletRequired: '送信者のウォレットIDまたはユーザー名が必要です',
        receiverWalletRequired: '受信者のウォレットIDまたはユーザー名が必要です',
        senderWalletMismatch: '送信者のウォレットIDが提供されたユーザー名と一致しません',
        receiverWalletMismatch: '受信者のウォレットIDが提供されたユーザー名と一致しません',
        cannotTransferToSelf: '自分に送金することはできません',
        amountMustBePositive: '金額は0より大きい数字でなければなりません',
        amountDecimalPlaces: '金額は最大2桁の小数でなければなりません',
        insufficientBalance: '残高が不足しています',
        transferFailed: '送金に失敗しました',
        systemError: 'システムエラーが発生しました。後でもう一度お試しください',
        
        // ページネーション関連のエラー
        pageMustBePositive: 'ページ番号は正の整数でなければなりません',
        limitRange: '制限数は1から100の間でなければなりません',
        
        // サードパーティ決済関連のエラー
        thirdPartyPaymentFailed: 'サードパーティ決済に失敗しました',
        
        // 為替レート関連のエラー
        noExchangeRateRecord: '為替レートの記録が見つかりません',
        mustProvideCleanupDate: 'クリーンアップ日を指定する必要があります',
        invalidDateFormat: '無効な日付形式',
        failedToRefreshExchangeRates: '為替レートの更新に失敗しました',
        failedToCleanupExchangeRates: '為替レートのレコードのクリーンアップに失敗しました'
      }
    }
  };
  
  return langMap[lang] || enTranslations;
}

/**
 * Get user preferred language from request
 * @param {Object} req - Express request object
 * @returns {string} Language code
 */
function getLanguageFromRequest(req) {
  // Prefer language from query parameter
  if (req.query && req.query.lang) {
    const lang = req.query.lang;
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      return lang;
    }
  }
  
  // From request headers
  if (req.headers && req.headers['accept-language']) {
    const acceptLanguage = req.headers['accept-language'];
    const languages = acceptLanguage.split(',').map(lang => {
      const parts = lang.split(';');
      return {
        code: parts[0].trim(),
        quality: parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0
      };
    });
    
    // Sort by quality
    languages.sort((a, b) => b.quality - a.quality);
    
    // Find supported languages
    for (const lang of languages) {
      // Try exact match
      if (SUPPORTED_LANGUAGES.includes(lang.code)) {
        return lang.code;
      }
      
      // Try to match the primary part of the language code (e.g., en-US -> en)
      const primaryCode = lang.code.split('-')[0];
      const matchedLang = SUPPORTED_LANGUAGES.find(supportedLang => 
        supportedLang.startsWith(primaryCode)
      );
      
      if (matchedLang) {
        return matchedLang;
      }
    }
  }
  
  // Use English by default
  return DEFAULT_LANGUAGE;
}

/**
/**
 * Translation function
 * @param {Object} req - Express request object
 * @param {string} key - Translation key
 * @param {Object} options - Translation options
 * @returns {string} Translated text
 */
function t(req, key, options = {}) {
  const lang = getLanguageFromRequest(req);
  const translation = translations[lang];
  
  if (!translation) {
    console.warn(`No translation found for language: ${lang}`);
    return key;
  }
  
  // Parse dot-separated keys
  const keys = key.split('.');
  let value = translation;
  
  for (const k of keys) {
    if (value[k] === undefined) {
      console.warn(`Translation key not found: ${key} for language: ${lang}`);
      return key;
    }
    value = value[k];
  }
  
  // string interpolation
  if (typeof value === 'string' && options) {
    let result = value;
    for (const [k, v] of Object.entries(options)) {
      result = result.replace(new RegExp(`\{\{${k}\}\}`, 'g'), v);
    }
    return result;
  }
  
  return value;
}

module.exports = {
  initTranslations,
  t,
  getLanguageFromRequest
};