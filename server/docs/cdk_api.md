# CDK API Documentation

## Overview
This document describes the CDK (Code Key) API endpoints that allow users to redeem codes for currency. The CDK system provides a secure way to distribute and redeem virtual currency through pre-generated codes.

## CDK Format
CDKs must follow the format of 6 groups of 4 alphanumeric characters separated by hyphens:
`XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`

Example: `a1b2-c3d4-z5x6-c7f8-j8jk-4d5f`

## API Endpoints

### 1. Redeem a CDK

**POST /api/cdks/redeem**

Redeems a CDK code and adds the corresponding amount to the user's wallet balance.

#### Request Body
```json
{
  "code": "a1b2-c3d4-z5x6-c7f8-j8jk-4d5f",
  "username": "test_user"
}
```

#### Response
- **Success (200 OK)**
  ```json
  {
    "success": true,
    "message": "CDK redeemed successfully",
    "data": {
      "amount": 100,
      "currency": "USD"
    }
  }
  ```

- **Error (400/404/500)**
  ```json
  {
    "success": false,
    "message": "Error message"
  }
  ```

### 2. Validate a CDK

**POST /api/cdks/validate**

Validates a CDK code without redeeming it. Useful for checking if a code is valid before attempting redemption.

#### Request Body
```json
{
  "code": "a1b2-c3d4-z5x6-c7f8-j8jk-4d5f"
}
```

#### Response
- **Success (200 OK)**
  ```json
  {
    "success": true,
    "message": "CDK code is valid",
    "data": {
      "amount": 100,
      "currency": "USD",
      "expires_at": "2024-12-31T23:59:59Z"
    }
  }
  ```

- **Error (400/404/500)**
  ```json
  {
    "success": false,
    "message": "Error message"
  }
  ```

### 3. Add a New CDK (Admin)

**POST /api/cdks**

Adds a new CDK code to the system. This endpoint should be secured for admin use only in production.

#### Request Body
```json
{
  "key": "newcd-key1-2345-abcd-6789-efgh",
  "amount": 500,
  "currency": "USD",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

#### Response
- **Success (201 Created)**
  ```json
  {
    "success": true,
    "message": "CDK added successfully"
  }
  ```

- **Error (400/409/500)**
  ```json
  {
    "success": false,
    "message": "Error message"
  }
  ```

## CDK Data Storage
CDKs are stored in a JSON file located at `server/data/cdks.json`. Each CDK entry contains the following fields:

- `key`: The CDK code
- `amount`: The amount to be redeemed
- `currency`: The currency code
- `status`: Current status ("ACTIVE" or "USED")
- `created_at`: Creation timestamp
- `expires_at`: Expiry timestamp
- `used_at`: (Optional) Redemption timestamp
- `used_by`: (Optional) Username of the user who redeemed the CDK

## Security Considerations

1. All CDK validation and redemption logic is performed server-side to prevent tampering.
2. CDKs can only be redeemed once and are marked as "USED" after redemption.
3. CDKs have an expiration date for additional security.
4. The admin endpoint for adding CDKs should be secured with proper authentication and authorization in production.
5. Transactions are atomic to ensure wallet balances are correctly updated and CDKs are properly marked as used.

## Testing
A test file for the CDK service is available at `server/test/test_cdk.js`. You can run it using:

```bash
mocha server/test/test_cdk.js
```