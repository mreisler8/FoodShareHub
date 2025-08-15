# Development Authentication Guide

## Local Development Authentication

### Current Status
Authentication system is functional but database connectivity is intermittent. The app uses session-based authentication with PostgreSQL session storage.

### Test Credentials (When Database Available)

**Test Personas for E2E Validation:**

#### User A (Owner)
- **Username**: `user-a` 
- **Email**: `usera@test.com`
- **Password**: `password123`
- **Role**: List creator/owner
- **Purpose**: Creates lists, tests ownership permissions

#### User B (Follower) 
- **Username**: `user-b`
- **Email**: `userb@test.com` 
- **Password**: `password123`
- **Role**: Follows User A
- **Purpose**: Tests follower access to public/followers lists

#### User C (Circle Member)
- **Username**: `user-c`
- **Email**: `userc@test.com`
- **Password**: `password123` 
- **Role**: Member of test circle C1
- **Purpose**: Tests circle-based list access

#### User D (No Relation)
- **Username**: `user-d`
- **Email**: `userd@test.com`
- **Password**: `password123`
- **Role**: No relationship to other users
- **Purpose**: Tests anonymous/public-only access

### Creating Test Personas

**Seed Script** (when database is available):
```bash
# Create test personas with relationships
npm run db:seed:personas
```

This creates the 4 test users above with proper relationships:
- User B follows User A
- User C is member of circle C1  
- Sample lists with different visibility levels
- Proper access control test data

### Manual Login Process

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Navigate to Login**: `http://localhost:5000/login`

3. **Use Test Credentials**: Login with any of the test personas above

4. **Verify Authentication**: 
   ```bash
   curl -b cookies.txt http://localhost:5000/api/me
   ```
   Should return user data instead of 401

### API Testing with Authentication

**Save Session Cookie**:
```bash
# Login and save session
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usera@test.com","password":"password123"}'

# Use authenticated session
curl -b cookies.txt http://localhost:5000/api/lists
```

### Session Storage Details

- **Backend**: PostgreSQL session store via `connect-pg-simple`
- **Session Duration**: 24 hours default
- **Cookie Name**: `connect.sid`
- **Security**: httpOnly, secure in production

### Troubleshooting Authentication

#### Issue: 401 "Not authenticated" responses
**Causes:**
1. Database connectivity issues (most common)
2. Session expired
3. Missing session cookie
4. CORS issues in development

**Solutions:**
1. **Check Database**: Verify Neon endpoint is enabled
2. **Fresh Login**: Clear cookies and re-authenticate
3. **Check Headers**: Ensure `credentials: 'include'` in fetch requests
4. **Session Validation**: Check `/api/me` endpoint

#### Issue: Database connection failures
**Error**: "The endpoint has been disabled"
**Solution**: Database needs to be re-enabled through Neon dashboard

#### Issue: Session not persisting
**Causes:**
1. CORS configuration  
2. SameSite cookie issues
3. HTTPS/HTTP mismatch

**Check Configuration**:
```typescript
// Should be in server session config
cookie: {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000
}
```

### Feature Flag Development

Current flags for Lists MVP testing:
- `LISTS_VISIBILITY_V2=true` - V2 visibility system
- `LISTS_SAVE_STATUS_V1=true` - New save endpoints  
- `DEV_TEST_PERSONAS=true` - Test persona creation

### E2E Testing Flow

Once authenticated:
1. **Create List** (User A): Test all visibility levels
2. **Add Items**: Verify add/reorder functionality  
3. **Save/Unsave** (User B): Test cross-user save states
4. **Access Control** (User C/D): Verify visibility restrictions
5. **Persistence**: Refresh pages, verify state consistency

### Development Notes

- Authentication state persists across server restarts if sessions remain in DB
- Session cleanup happens automatically after expiration
- Test personas are recreated on each seed run
- Use browser dev tools to inspect session cookies and API responses