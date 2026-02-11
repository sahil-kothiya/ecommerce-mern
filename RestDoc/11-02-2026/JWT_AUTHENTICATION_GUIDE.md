# 🔐 JWT Authentication & Remember Me Guide

## Overview

This application implements a secure JWT-based authentication system with **dual-token architecture**:

- **Access Token**: Short-lived (15 minutes) for API requests
- **Refresh Token**: Long-lived (30 days) for "Remember Me" functionality

## 🌟 Features

✅ **Secure JWT Authentication**
✅ **Remember Me Functionality**
✅ **Automatic Token Refresh**
✅ **Token Revocation on Logout**
✅ **Password Hashing with bcrypt**
✅ **Role-Based Access Control**

---

## 📡 API Endpoints

### 1. **Register** - Create New Account

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m"
  }
}
```

---

### 2. **Login** - Authenticate User

#### Standard Login (15 minutes session)

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@enterprise-ecommerce.com",
  "password": "admin123!"
}
```

#### Login with Remember Me (30 days session)

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@enterprise-ecommerce.com",
  "password": "admin123!",
  "rememberMe": true
}
```

**Response (with Remember Me):**

```json
{
  "success": true,
  "message": "Login successful - Remember me enabled",
  "data": {
    "user": {
      "_id": "...",
      "name": "Admin User",
      "email": "admin@enterprise-ecommerce.com",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshExpiresIn": "30d"
  }
}
```

---

### 3. **Refresh Token** - Get New Access Token

When your access token expires (after 15 minutes), use the refresh token to get a new one:

```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m",
    "user": {
      "_id": "...",
      "name": "Admin User",
      "email": "admin@enterprise-ecommerce.com"
    }
  }
}
```

---

### 4. **Logout** - End Session

```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

> **Note:** Logout revokes the refresh token stored in the database, making it invalid for future use.

---

### 5. **Get Profile** - Fetch Current User

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 🔄 Client-Side Implementation

### Storage Strategy

```javascript
// After successful login
const handleLogin = async (email, password, rememberMe = false) => {
  const response = await fetch("http://localhost:5001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe }),
  });

  const { data } = await response.json();

  // Store access token (sessionStorage for regular, localStorage for remember me)
  if (rememberMe) {
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
  } else {
    sessionStorage.setItem("accessToken", data.accessToken);
  }

  // Store user data
  localStorage.setItem("user", JSON.stringify(data.user));
};
```

### Automatic Token Refresh

```javascript
// Axios interceptor example
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If access token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          const { data } = await axios.post("/api/auth/refresh-token", {
            refreshToken,
          });

          // Update access token
          localStorage.setItem("accessToken", data.data.accessToken);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return axios(originalRequest);
        } catch (refreshError) {
          // Refresh token expired - logout user
          localStorage.clear();
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  },
);
```

### Making Authenticated Requests

```javascript
// Fetch API
const getProfile = async () => {
  const token =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");

  const response = await fetch("http://localhost:5001/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
};
```

---

## 🔒 Security Features

### 1. **Password Requirements**

- Minimum 6 characters
- Must contain at least one letter
- Must contain at least one number

### 2. **Token Security**

- Access tokens expire after 15 minutes
- Refresh tokens expire after 30 days
- Refresh tokens stored in database (can be revoked)
- HMAC-SHA256 signing algorithm

### 3. **Password Storage**

- Passwords hashed with bcrypt
- Salt rounds: 12 (configurable)
- Never stored in plain text

### 4. **Token Payload**

**Access Token:**

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "role": "admin",
  "email": "admin@example.com",
  "type": "access",
  "iat": 1709294400,
  "exp": 1709295300
}
```

**Refresh Token:**

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "type": "refresh",
  "iat": 1709294400,
  "exp": 1711886400
}
```

---

## ⚙️ Configuration

### Environment Variables

```env
# Short-lived access token (recommended: 15m-1h)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRE=15m

# Long-lived refresh token (recommended: 7d-30d)
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this-in-production-min-32-chars
JWT_REFRESH_EXPIRE=30d
```

### Token Duration Options

- `15m` - 15 minutes
- `1h` - 1 hour
- `7d` - 7 days
- `30d` - 30 days

---

## 🧪 Testing with Postman/Thunder Client

### 1. Login with Remember Me

```json
POST http://localhost:5001/api/auth/login

{
  "email": "admin@enterprise-ecommerce.com",
  "password": "admin123!",
  "rememberMe": true
}
```

### 2. Copy Access Token

Save the `accessToken` from response

### 3. Make Authenticated Request

```
GET http://localhost:5001/api/auth/me
Authorization: Bearer <paste-access-token-here>
```

### 4. Refresh Token (after 15 minutes)

```json
POST http://localhost:5001/api/auth/refresh-token

{
  "refreshToken": "<paste-refresh-token-here>"
}
```

---

## 🐛 Common Issues & Solutions

### Issue: "Token expired"

**Solution:** Use the refresh token endpoint to get a new access token

### Issue: "Invalid refresh token"

**Solution:** Refresh token has expired or been revoked. User must login again.

### Issue: "No token provided"

**Solution:** Include `Authorization: Bearer <token>` header in your request

### Issue: Refresh token not working after logout

**Solution:** This is expected behavior. Logout revokes the refresh token. User must login again.

---

## 📊 Token Lifecycle

```
┌─────────────┐
│   Login     │ ────────────┐
│ (rememberMe)│             │
└─────────────┘             ▼
                    ┌──────────────────┐
                    │ Access Token     │
                    │ (15 minutes)     │
                    │ Refresh Token    │
                    │ (30 days)        │
                    └──────────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
            ┌──────────────┐  ┌──────────────┐
            │ Make API     │  │ Access Token │
            │ Requests     │  │ Expires      │
            └──────────────┘  └──────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ Refresh Token   │
                            │ Endpoint        │
                            └─────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ New Access      │
                            │ Token (15 min)  │
                            └─────────────────┘
```

---

## 🎯 Best Practices

1. **Always use HTTPS in production** to prevent token interception
2. **Store refresh tokens securely** (httpOnly cookies recommended for web)
3. **Implement token rotation** for enhanced security
4. **Use environment-specific token durations**
   - Development: Longer tokens (easier testing)
   - Production: Shorter tokens (better security)
5. **Log security events** (login, logout, token refresh)
6. **Implement rate limiting** on auth endpoints (already included)
7. **Never expose tokens in URLs** or logs

---

## 📚 Additional Resources

- [JWT.io](https://jwt.io/) - Decode and verify JWT tokens
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)

---

## 🤝 Support

For issues or questions about authentication:

1. Check this guide first
2. Review error messages in server logs
3. Verify token format and expiration
4. Check Authorization header format

Happy coding! 🚀
