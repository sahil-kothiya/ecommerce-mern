# Enterprise E-commerce API

A robust MERN stack e-commerce application backend.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- MongoDB (Local or Atlas)
- Redis (Optional, for caching)

### Installation

1. **Configure Environment**

   ```bash
   cd backend
   cp .env.example .env
   ```

   Update `.env` with your MongoDB URI.

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Seed Database**

   ```bash
   npm run seed -- --minimal
   ```

4. **Start Server**
   ```bash
   npm run dev
   ```

## 📂 Project Structure

```text
src/
├── config/         # Environment variables and configuration
├── controllers/    # Request logic
├── middleware/     # Express middleware (Auth, Error handling)
├── models/         # Mongoose models
├── routes/         # API route definitions
└── utils/          # Helper functions (Logger, etc.)
```

## 📝 Coding Standards

Please refer to `.github/instructions/inline-comments-standard.instructions.md` for detailed commenting and documentation guidelines.

## 🛠 Troubleshooting

**MongoDB Connection Fails?**

1. Ensure MongoDB service is running (`net start MongoDB` on Windows).
2. Check IP whitelist if using MongoDB Atlas.
3. Verify connection string in `.env`.
