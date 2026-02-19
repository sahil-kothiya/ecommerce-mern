# Architecture Map

## System Overview

```mermaid
flowchart LR
    User[Browser User] --> FE[React Frontend (Vite)]
    FE --> API[Node/Express API]
    API --> DB[(MongoDB)]
    API --> FS[(Uploads/Images)]
    API --> Q[Queue Workers]
```

## Backend Layers

```text
routes -> controllers -> services -> models -> MongoDB
                     -> middleware (auth, validation, errors, upload)
```

## Key Domains
- Auth and users
- Catalog (products, categories, brands, variants)
- Cart and checkout
- Orders and reviews
- Discounts/coupons/banners/settings

## Runtime Entry Points
- API server: `backend/src/server.js`
- Frontend app: `frontend/src/main.jsx`
- Queue worker: `backend/src/queues/worker.js`

## Data/Request Flow (Checkout)
1. User authenticates via `/api/auth/*`
2. Cart operations via `/api/cart/*`
3. Order creation via `/api/orders`
4. Order management via `/api/orders/*` (user/admin scopes)
