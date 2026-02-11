# 🔐 ADMIN LOGIN CREDENTIALS

## ✅ Correct Credentials

```
Email:    admin@enterprise-ecommerce.com
Password: admin123!
```

---

## 🚀 Quick Login (Browser Console Method)

1. Press **F12** in your browser
2. Go to **Console** tab
3. **Copy & paste this code:**

```javascript
// Clear old token
localStorage.clear();

// Login with correct credentials
fetch("http://localhost:5001/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "admin@enterprise-ecommerce.com",
    password: "admin123!",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    if (data.success) {
      localStorage.setItem("auth_token", data.data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.data.user));
      alert("✅ Logged in successfully! Refreshing page...");
      location.reload();
    } else {
      alert("❌ Login failed: " + data.message);
    }
  });
```

4. Press **Enter**
5. Wait for success alert
6. Page will refresh automatically
7. **Done!** You can now create categories with images

---

## 📝 Alternative: Login Page Method

1. Go to: `http://localhost:5173/login`
2. Enter:
   - **Email:** `admin@enterprise-ecommerce.com`
   - **Password:** `admin123!`
3. Click **Login**
4. Navigate to Categories page
5. **Done!**

---

## ⚙️ For Developers

### Create/Reset Admin User

Run this command in the backend folder:

```bash
cd backend
node createAdmin.js
```

or

```bash
cd backend
node checkAdminCredentials.js
```

### Seed Database with Admin

```bash
cd backend
node runSeeder.js
```

---

## 🔧 Configuration

Admin credentials are configured in:

- **File:** `backend/src/config/index.js`
- **Environment Variable:** `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- **Default:**
  - Email: `admin@enterprise-ecommerce.com`
  - Password: `admin123!`

To change, update your `.env` file:

```env
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-password
```

---

## ✅ Verification

After logging in, you should be able to:

- ✓ Create categories
- ✓ Upload images
- ✓ Edit categories
- ✓ Delete categories
- ✓ Access all admin features

---

**Remember:** The credentials are:

- **Email:** `admin@enterprise-ecommerce.com`
- **Password:** `admin123!`

**NOT:** ~~admin@admin.com / admin123~~
