# Access Revocation System Documentation

## Overview
Your private access system now supports instant revocation of user access. You can block any user at any time by updating their access code in the Replit Database.

## How It Works

### Database Format
Each access code is stored with this structure:
```json
{
  "code": "ACCESS_CODE",
  "used": true/false,
  "valid": true/false,
  "usedAt": "2024-06-21T19:12:00.000Z",
  "createdAt": "2024-06-21T19:10:00.000Z",
  "description": "Access code description"
}
```

### Access States
- **Fresh Code**: `{ "used": false, "valid": true }` - Can be used once
- **Used Valid**: `{ "used": true, "valid": true }` - User has access
- **Revoked**: `{ "used": true, "valid": false }` - Access blocked instantly

## Revoking Access

### Method 1: Manual Database Update
1. Open Replit Database
2. Find the key: `access_code_[CODE]`
3. Update the value to: `{ "used": true, "valid": false }`
4. Users will be blocked within 30 seconds

### Method 2: Using Script
```bash
node revoke-access.js [ACCESS_CODE]
```

## API Endpoints

### POST /api/verify-code
Verifies a fresh access code and grants initial access.
- Rejects if `valid: false`
- Rejects if already used
- Marks code as `{ "used": true, "valid": true }` on success

### POST /api/check-access
Validates existing user access in real-time.
- Checks if access has been revoked
- Used by frontend every 30 seconds
- Returns `{ "success": false }` if revoked

## Frontend Behavior

### Access Validation
- Checks access every 30 seconds while app is running
- Automatically logs out revoked users
- Shows "Access denied or revoked" message

### URL Handling
- Accepts codes via `/?access=CODE` parameter
- Cleans URL after successful access
- Stores access state in localStorage

## Testing the System

### Create Test Code
```bash
node update-access-codes.js
```

### Test Revocation Flow
1. Visit: `/?access=DEMO_REVOKE_2024`
2. Access granted - user enters app
3. Run: `node revoke-access.js DEMO_REVOKE_2024`
4. Within 30 seconds, user sees "Access denied or revoked"
5. User cannot re-enter without new valid code

## Available Test Codes
- `DEMO_REVOKE_2024` - Fresh test code
- `REVOKE2024` - Used but valid
- `ACCESS2024` - Used but valid
- All existing codes updated with `valid: true`

## Security Features

### Instant Revocation
- No server restart required
- Changes take effect within 30 seconds
- Works across all devices and browsers

### One-Time Use
- Codes can only be verified once
- Prevents sharing of used codes
- Each successful access marks code as used

### Real-Time Validation
- Continuous access checking
- Automatic logout on revocation
- No manual refresh required

## Example Usage

```javascript
// Create new access code
await db.set('access_code_NEWCODE', {
  code: 'NEWCODE',
  used: false,
  valid: true,
  createdAt: new Date().toISOString(),
  description: 'New access code'
});

// Revoke access instantly
await db.set('access_code_NEWCODE', {
  code: 'NEWCODE',
  used: true,
  valid: false,
  revokedAt: new Date().toISOString()
});
```

Your access system now provides complete control over user access with instant revocation capabilities.