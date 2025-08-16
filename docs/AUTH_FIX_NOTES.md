# Auth Hotfix Notes

## Changes Made (August 16, 2025)

### Problem Fixed
- Authentication system was broken due to improper password hashing (scrypt with missing salt)
- Users could not log in, preventing Lists MVP validation

### Solution Implemented
- **Replaced scrypt with bcryptjs** for secure password hashing
- **Fixed registration endpoint** with proper validation and error handling
- **Fixed login endpoint** to use bcrypt.compare for password verification
- **Added comprehensive tests** in `tests/auth.spec.ts`

### Code Changes
1. **server/auth.ts**: 
   - Replaced `scrypt` imports with `bcryptjs`
   - Updated `hashPassword()` to use `bcrypt.hash()` with 12 salt rounds
   - Updated `comparePasswords()` to use `bcrypt.compare()`
   - Enhanced registration validation (email format, duplicate checking)

2. **tests/auth.spec.ts**: Added test coverage for:
   - Registration with valid/invalid data
   - Login with correct/incorrect credentials
   - Session management and cookie handling
   - Protected route access

### Rollback Instructions
If issues arise:
1. Revert `server/auth.ts` to use scrypt-based hashing
2. Update existing user passwords (requires password reset)
3. Remove `bcryptjs` dependency

### Validation Results
✅ Registration: Returns 201 with user data (password excluded)  
✅ Login: Returns 200 with session cookie  
✅ Protected routes: /api/me accessible after login  
✅ Error handling: 401/409/400 status codes working correctly