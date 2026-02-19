# API Contracts (Core)

Base URL: `/api`

## Response Envelope

Success:
```json
{
  "success": true,
  "message": "optional",
  "data": {}
}
```

Error:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    { "field": "email", "message": "Please provide a valid email" }
  ]
}
```

## Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh-token`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`
- `PUT /auth/profile`
- `PUT /auth/change-password`

## Catalog
- `GET /products`
- `GET /products/:slug`
- `GET /categories`
- `GET /categories/slug/:slug`
- `GET /categories/:id/products`
- `GET /brands`

## Wishlist
- `GET /wishlist`
- `POST /wishlist`
- `DELETE /wishlist/:id`
- `DELETE /wishlist`

## Checkout and Orders
- `GET /cart`
- `POST /cart`
- `PUT /cart/:id`
- `DELETE /cart/:id`
- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `GET /orders/admin/all` (admin)
- `PUT /orders/:id/status` (admin)

## Health
- `GET /health`

## Contract Rules
- Protected routes require `Authorization: Bearer <token>`.
- Validation errors return `400` with `errors[]`.
- Authz failures return `401` or `403`.
