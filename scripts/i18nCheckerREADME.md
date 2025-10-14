# i18n Translation Checker

This tool checks for missing and unused translations in both client and server codebases.

## Features

- Checks for missing translations across all supported languages
- Identifies unused translation keys in the codebase
- Works with both client and server translation files
- Easy to integrate into development workflow

## Supported Languages

- English (en-US) - Default reference language
- Simplified Chinese (zh-CN)
- Traditional Chinese (zh-TW)
- Japanese (ja-JP)

## How It Works

1. **Missing Translations Check**:
   - Uses the default language (en-US) as the reference
   - Compares all other language files against the reference
   - Reports any keys that exist in the reference but are missing in other languages

2. **Unused Translations Check**:
   - Scans all source code files for translation key usage
   - Identifies keys that are defined in translations but not used in code
   - Helps keep translation files clean and up-to-date

## Usage

Run the checker from the project root directory:

```bash
npm run i18n:check
```

## Output Example

```
===== i18n Translation Checker =====

Checking client translations...
✓ No missing translations found

Unused translations in en-US:
  - wallet.title
  - messages.unknown_error

Total unused keys: 2

Checking server translations...

Missing translations in zh-CN:
  - errors.transaction_failed
  - info.exchange_rate_updated

✓ No unused translations found

===== Check Complete =====
```

## How to Fix Issues

### Missing Translations
1. Open the translation file for the language with missing keys
2. Add the missing keys with appropriate translations
3. Run the checker again to verify all keys are present

### Unused Translations
1. Review the list of unused keys
2. If the keys are truly not needed, remove them from the translation files
3. If the keys are actually used but not detected, check if they're using a different pattern than what the checker looks for

## Customization

To modify the checker's behavior, edit the `i18nChecker.js` file:

- Adjust the `SUPPORTED_LANGUAGES` array to include or exclude languages
- Change the `DEFAULT_LANGUAGE` to use a different reference language
- Update the regex patterns in the `findUsedKeys` function to match your codebase's translation usage patterns

## Integration into Development Workflow

Consider adding this check to:

- Pre-commit hooks to catch translation issues before they're committed
- CI/CD pipelines to ensure translation consistency across all environments
- Regular development checks to maintain translation quality

## Notes

- The checker scans files with extensions: `.js`, `.jsx`, `.ts`, `.tsx`, `.html`, `.vue`
- It skips `node_modules`, `dist`, and `build` directories to improve performance
- The checker uses the following patterns to detect translation usage:
  - `t('key')` or `t("key")`
  - `{{ t('key') }}` in JSX
  - `translate('key')`
  - `__('key')`
  - `i18n.t('key')`

If your project uses a different pattern for translations, you'll need to update the regex patterns in the script.