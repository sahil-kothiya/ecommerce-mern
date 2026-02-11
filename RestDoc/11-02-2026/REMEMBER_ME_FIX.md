# RememberMe Fix - Test Cases

## Changes Made

### ✅ Frontend Changes

1. **LoginPage.jsx**:
   - Added `.trim()` to email input
   - Added `.trim()` to password input
   - Added console logging to track rememberMe value

2. **authService.js**:
   - Added console logging before API call
   - Added console logging for response data

### ✅ Backend Changes

1. **AuthController.js**:
   - Improved boolean parsing: handles `true`, `"true"`, `1`
   - Added detailed logging of request body
   - Logs rememberMe value and type

### ✅ Documentation Updates

1. **copilot-instructions.md**:
   - Added "Testing & Debugging Best Practices" section
   - Input sanitization rules
   - Boolean handling for checkboxes
   - Request/response logging patterns

2. **form-input-validation.instructions.md** (NEW):
   - Complete guide for form input handling
   - Checkbox boolean handling
   - Backend boolean parsing
   - Testing checklist

## Test Cases

### Test 1: Login WITHOUT Remember Me

**Request:**

```json
{
  "email": "admin@enterprise-ecommerce.com",
  "password": "admin123!",
  "rememberMe": false
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "...",
    "accessToken": "...",
    "expiresIn": "15m"
    // NO refreshToken field
  }
}
```

**Expected Cookies (localhost:5001):**

- ✅ `accessToken` (expires in 15 minutes)
- ❌ NO `refreshToken`

**Expected Console Logs:**

```
Frontend: Login attempt: { email: '...', rememberMe: false, rememberMeType: 'boolean' }
Frontend: AuthService.login called with: { email: '...', rememberMe: false, type: 'boolean' }
Backend: Login request received: { email: '...', rememberMeRaw: false, rememberMeType: 'boolean', ... }
Backend: Controller Action: User Login { email: '...', userId: '...', rememberMe: false, hasRefreshToken: false }
```

---

### Test 2: Login WITH Remember Me (CHECKBOX CHECKED)

**Request:**

```json
{
  "email": "admin@enterprise-ecommerce.com",
  "password": "admin123!",
  "rememberMe": true
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Login successful - Remember me enabled",
  "data": {
    "user": { ... },
    "token": "...",
    "accessToken": "...",
    "expiresIn": "15m",
    "refreshToken": "...",
    "refreshExpiresIn": "30d"
  }
}
```

**Expected Cookies (localhost:5001):**

- ✅ `accessToken` (expires in 15 minutes)
- ✅ `refreshToken` (expires in 30 days)

**Expected Console Logs:**

```
Frontend: Login attempt: { email: '...', rememberMe: true, rememberMeType: 'boolean' }
Frontend: AuthService.login called with: { email: '...', rememberMe: true, type: 'boolean' }
Backend: Login request received: { email: '...', rememberMeRaw: true, rememberMeType: 'boolean', ... }
Backend: Controller Action: User Login { email: '...', userId: '...', rememberMe: true, hasRefreshToken: true }
```

---

### Test 3: API Testing (Postman/Thunder Client)

**Endpoint:** `POST http://localhost:5001/api/auth/login`

**Test 3a - String "true":**

```json
{
  "email": "admin@enterprise-ecommerce.com",
  "password": "admin123!",
  "rememberMe": "true"
}
```

**Expected:** Should work! Backend parses `"true"` as true.

**Test 3b - Number 1:**

```json
{
  "email": "admin@enterprise-ecommerce.com",
  "password": "admin123!",
  "rememberMe": 1
}
```

**Expected:** Should work! Backend parses `1` as true.

**Test 3c - Missing field:**

```json
{
  "email": "admin@enterprise-ecommerce.com",
  "password": "admin123!"
}
```

**Expected:** Should work with `rememberMe: false` (default).

---

## How to Verify

### Step 1: Clear Everything

```bash
# Clear browser cookies
# Chrome: DevTools > Application > Cookies > Clear All

# Clear browser console
# Console tab > Clear console (⌘K or Ctrl+L)

# Check backend logs are running
# Terminal should show log output
```

### Step 2: Test from UI

1. Go to `http://localhost:5173/login`
2. Enter credentials: `admin@enterprise-ecommerce.com` / `admin123!`
3. **CHECK the "Remember me" checkbox** ✓
4. Click "Sign In"

### Step 3: Check Browser Console

Should see:

```
Login attempt: { email: 'admin@...', rememberMe: true, rememberMeType: 'boolean' }
AuthService.login called with: { email: 'admin@...', rememberMe: true, type: 'boolean' }
Login response: { user: {...}, refreshToken: '...' }
```

### Step 4: Check Network Tab

1. DevTools > Network tab
2. Find the `login` request
3. Click on it > Payload tab
4. Should show:
   ```json
   {
     "email": "admin@enterprise-ecommerce.com",
     "password": "admin123!",
     "rememberMe": true
   }
   ```

### Step 5: Check Backend Logs

Terminal should show:

```
Login request received: { email: '...', rememberMeRaw: true, rememberMeType: 'boolean', body: {...} }
Controller Action: User Login { email: '...', userId: '...', rememberMe: true, hasRefreshToken: true }
```

### Step 6: Check Cookies

1. DevTools > Application > Cookies
2. Expand `http://localhost:5001` (NOT 5173!)
3. Should see:
   - `accessToken` with expiration ~15 minutes
   - `refreshToken` with expiration ~30 days

### Step 7: Test WITHOUT Checkbox

1. Logout
2. Return to login page
3. Enter credentials BUT **DON'T CHECK** the checkbox
4. Login
5. Check cookies - should ONLY see `accessToken`, NO `refreshToken`

---

## If Still Not Working

1. **Restart both servers** (frontend and backend)
2. **Hard refresh browser** (Ctrl+Shift+R or Cmd+Shift+R)
3. **Clear all cookies** from localhost:5001 and localhost:5173
4. **Check logs in both terminals** - do they show the rememberMe value?
5. **Test with Postman** - send exact JSON to rule out frontend issues

## Expected Log Flow (Full Stack)

```
[FRONTEND - LoginPage]
> Login attempt: { email: 'admin@...', rememberMe: true, rememberMeType: 'boolean' }

[FRONTEND - authService]
> AuthService.login called with: { email: 'admin@...', rememberMe: true, type: 'boolean' }

[BACKEND - AuthController]
> Login request received: { email: 'admin@...', rememberMeRaw: true, rememberMeType: 'boolean', body: {...} }

[BACKEND - AuthService]
> User logged in: admin@... (Remember Me)

[BACKEND - AuthController]
> Controller Action: User Login { email: 'admin@...', userId: '...', rememberMe: true, hasRefreshToken: true }

[FRONTEND - authService]
> Login response: { user: {...}, token: '...', refreshToken: '...', refreshExpiresIn: '30d' }
```

If you see `rememberMe: false` anywhere in these logs when the checkbox is checked, share the logs and we'll debug further!
