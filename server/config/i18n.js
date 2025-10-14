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
  "errors": {
    // General errors
    serverError: 'An internal server error occurred',
    resourceNotFound: 'The requested resource was not found',
    routeNotFound: 'The requested route was not found',
    authenticationRequired: 'Authentication is required to access this resource',
    accessDenied: 'You do not have permission to access this resource',
    
    // Wallet-related errors
    walletNotFound: 'Wallet not found',
    usernameRequired: 'Username is required',
    usernameMustBeString: 'Username must be a text value',
    usernameLength: 'Username must be between 2 and 50 characters',
    usernameEnglishOnly: 'Username can only contain English letters',
    usernameExists: 'This username is already taken',
    initialBalanceMustBeZero: 'Initial balance must be set to 0',
    failedToCreateWallet: 'Unable to create wallet',
    failedToFetchWallet: 'Unable to retrieve wallet information',
    
    // Transfer-related errors
    senderWalletRequired: 'Please provide sender wallet ID or username',
    receiverWalletRequired: 'Please provide recipient wallet ID or username',
    senderWalletMismatch: 'Sender wallet ID doesn\'t match the username provided',
    receiverWalletMismatch: 'Recipient wallet ID doesn\'t match the username provided',
    cannotTransferToSelf: 'Transfers to your own wallet are not allowed',
    amountMustBePositive: 'Amount must be greater than zero',
    amountDecimalPlaces: 'Amount can have up to 2 decimal places',
    insufficientBalance: 'Your account has insufficient funds',
    transferFailed: 'The transfer could not be completed',
    systemError: 'A system error occurred. Please try again later',
    
    // Pagination related errors
    pageMustBePositive: 'Page number must be a positive number',
    limitRange: 'Page size must be between 1 and 100',
    
    // Third-party payment related errors
    thirdPartyPaymentFailed: 'Payment processing failed',
    
    // Exchange rate related errors
    noExchangeRateRecord: 'No exchange rate data available',
    mustProvideCleanupDate: 'Please specify a date for cleanup',
    invalidDateFormat: 'The date format is invalid',
    failedToRefreshExchangeRates: 'Unable to update exchange rates',
    failedToCleanupExchangeRates: 'Unable to clean up exchange rate history'
  }
};
  
  // Return the corresponding translation based on the language
  const langMap = {
    'en-US': enTranslations,
    'zh-CN': {
      errors: {
    // 通用错误
    serverError: '服务器发生内部错误',
    resourceNotFound: '请求的资源不存在',
    routeNotFound: '请求的路由不存在',
    authenticationRequired: '需要登录才能访问此资源',
    accessDenied: '您没有权限访问此资源',
    
    // 钱包相关错误
    walletNotFound: '钱包不存在',
    usernameRequired: '请输入用户名',
    usernameMustBeString: '用户名必须是文本格式',
    usernameLength: '用户名长度需在2-50个字符之间',
    usernameEnglishOnly: '用户名只能包含英文字母',
    usernameExists: '该用户名已被使用',
    initialBalanceMustBeZero: '初始余额必须设置为0',
    failedToCreateWallet: '无法创建钱包',
    failedToFetchWallet: '无法获取钱包信息',
    
    // 转账相关错误
    senderWalletRequired: '请提供发送方钱包ID或用户名',
    receiverWalletRequired: '请提供接收方钱包ID或用户名',
    senderWalletMismatch: '发送方钱包ID与用户名不匹配',
    receiverWalletMismatch: '接收方钱包ID与用户名不匹配',
    cannotTransferToSelf: '不能向自己的钱包转账',
    amountMustBePositive: '金额必须大于零',
    amountDecimalPlaces: '金额最多支持2位小数',
    insufficientBalance: '账户余额不足',
    transferFailed: '转账操作未能完成',
    systemError: '系统发生错误，请稍后重试',
    
    // 分页相关错误
    pageMustBePositive: '页码必须是正数',
    limitRange: '每页数量需在1到100之间',
    
    // 第三方支付相关错误
    thirdPartyPaymentFailed: '支付处理失败',
    
    // 汇率相关错误
    noExchangeRateRecord: '暂无汇率数据',
    mustProvideCleanupDate: '请指定清理日期',
    invalidDateFormat: '日期格式不正确',
    failedToRefreshExchangeRates: '无法更新汇率数据',
    failedToCleanupExchangeRates: '无法清理汇率历史记录'
  }
},

'zh-TW': {
  errors: {
    // 通用錯誤
    serverError: '伺服器發生內部錯誤',
    resourceNotFound: '請求的資源不存在',
    routeNotFound: '請求的路由不存在',
    authenticationRequired: '需要登入才能存取此資源',
    accessDenied: '您沒有權限存取此資源',
    
    // 錢包相關錯誤
    walletNotFound: '錢包不存在',
    usernameRequired: '請輸入使用者名稱',
    usernameMustBeString: '使用者名稱必須是文字格式',
    usernameLength: '使用者名稱長度需在2-50個字元之間',
    usernameEnglishOnly: '使用者名稱只能包含英文字母',
    usernameExists: '該使用者名稱已被使用',
    initialBalanceMustBeZero: '初始餘額必須設定為0',
    failedToCreateWallet: '無法建立錢包',
    failedToFetchWallet: '無法取得錢包資訊',
    
    // 轉帳相關錯誤
    senderWalletRequired: '請提供發送方錢包ID或使用者名稱',
    receiverWalletRequired: '請提供接收方錢包ID或使用者名稱',
    senderWalletMismatch: '發送方錢包ID與使用者名稱不符',
    receiverWalletMismatch: '接收方錢包ID與使用者名稱不符',
    cannotTransferToSelf: '無法向自己的錢包轉帳',
    amountMustBePositive: '金額必須大於零',
    amountDecimalPlaces: '金額最多支援2位小數',
    insufficientBalance: '帳戶餘額不足',
    transferFailed: '轉帳操作未能完成',
    systemError: '系統發生錯誤，請稍後重試',
    
    // 分頁相關錯誤
    pageMustBePositive: '頁碼必須是正數',
    limitRange: '每頁數量需在1到100之間',
    
    // 第三方支付相關錯誤
    thirdPartyPaymentFailed: '支付處理失敗',
    
    // 匯率相關錯誤
    noExchangeRateRecord: '暫無匯率資料',
    mustProvideCleanupDate: '請指定清理日期',
    invalidDateFormat: '日期格式不正確',
    failedToRefreshExchangeRates: '無法更新匯率資料',
    failedToCleanupExchangeRates: '無法清理匯率歷史記錄'
  }
},

'ja-JP': {
  errors: {
    // 一般エラー
    serverError: 'サーバー内部でエラーが発生しました',
    resourceNotFound: '要求されたリソースが見つかりません',
    routeNotFound: '要求されたルートが見つかりません',
    authenticationRequired: 'このリソースにアクセスするには認証が必要です',
    accessDenied: 'このリソースへのアクセス権限がありません',
    
    // ウォレット関連エラー
    walletNotFound: 'ウォレットが見つかりません',
    usernameRequired: 'ユーザー名を入力してください',
    usernameMustBeString: 'ユーザー名は文字列で指定してください',
    usernameLength: 'ユーザー名は2文字以上50文字以内で入力してください',
    usernameEnglishOnly: 'ユーザー名は英字のみ使用できます',
    usernameExists: 'このユーザー名は既に使用されています',
    initialBalanceMustBeZero: '初期残高は0に設定する必要があります',
    failedToCreateWallet: 'ウォレットを作成できませんでした',
    failedToFetchWallet: 'ウォレット情報を取得できませんでした',
    
    // 送金関連エラー
    senderWalletRequired: '送金元のウォレットIDまたはユーザー名を指定してください',
    receiverWalletRequired: '送金先のウォレットIDまたはユーザー名を指定してください',
    senderWalletMismatch: '送金元のウォレットIDとユーザー名が一致しません',
    receiverWalletMismatch: '送金先のウォレットIDとユーザー名が一致しません',
    cannotTransferToSelf: '自分自身のウォレットへの送金はできません',
    amountMustBePositive: '金額は0より大きい値を指定してください',
    amountDecimalPlaces: '金額は小数点以下2桁までで指定してください',
    insufficientBalance: '残高が不足しています',
    transferFailed: '送金を完了できませんでした',
    systemError: 'システムエラーが発生しました。しばらく経ってから再度お試しください',
    
    // ページネーション関連エラー
    pageMustBePositive: 'ページ番号は正の数を指定してください',
    limitRange: '表示件数は1から100の間で指定してください',
    
    // サードパーティ決済関連エラー
    thirdPartyPaymentFailed: '決済処理に失敗しました',
    
    // 為替レート関連エラー
    noExchangeRateRecord: '為替レートデータがありません',
    mustProvideCleanupDate: '削除対象の日付を指定してください',
    invalidDateFormat: '日付の形式が正しくありません',
    failedToRefreshExchangeRates: '為替レートを更新できませんでした',
    failedToCleanupExchangeRates: '為替レート履歴を削除できませんでした'
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
  // Handle null request by using default language
  const lang = req ? getLanguageFromRequest(req) : DEFAULT_LANGUAGE;
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