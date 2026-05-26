# AWB Barcode Tracking SaaS — Backend API

Production-grade Node.js/Express/MongoDB backend for the Enterprise AWB Barcode Tracking platform.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit |
| Logging | morgan |
| Export | json2csv |

---

## Project Structure

```
awb-backend/
├── scripts/
│   └── seed.js                  # Admin user seeder
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── channelPartner.controller.js
│   │   ├── brand.controller.js
│   │   ├── awb.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── auditLog.controller.js
│   │   └── export.controller.js
│   ├── middleware/
│   │   ├── auth.js              # JWT authenticate + authorize
│   │   ├── validate.js          # express-validator error handler
│   │   └── errorHandler.js      # Global error + 404 handler
│   ├── models/
│   │   ├── User.js
│   │   ├── ChannelPartner.js
│   │   ├── Brand.js
│   │   ├── AWBRecord.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── channelPartner.routes.js
│   │   ├── brand.routes.js
│   │   ├── awb.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── auditLog.routes.js
│   │   └── export.routes.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── channelPartner.service.js
│   │   ├── brand.service.js
│   │   ├── awb.service.js
│   │   ├── dashboard.service.js
│   │   └── auditLog.service.js
│   ├── utils/
│   │   ├── response.js          # Standardized response helpers
│   │   ├── jwt.js               # Token generate/verify
│   │   └── auditLogger.js       # Audit log writer
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── user.validator.js
│   │   ├── channelPartner.validator.js
│   │   ├── brand.validator.js
│   │   └── awb.validator.js
│   ├── app.js                   # Express app setup
│   └── server.js                # Entry point
├── .env.example
├── .gitignore
└── package.json
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo>
cd awb-backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/awb_tracking
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Super Admin
CORS_ORIGIN=http://localhost:3000
```

### 3. Run

```bash
# Development (with nodemon)
npm run dev

# Production
npm start

# Seed admin only
npm run seed
```

The admin user is **automatically seeded on every startup** if it doesn't already exist.

---

## API Reference

### Base URL
```
/api/v1
```

### Authentication
All protected routes require:
```
Authorization: Bearer <jwt_token>
```

---

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | ❌ | Login and receive JWT |

**Login Request:**
```json
{
  "email": "admin@example.com",
  "password": "Admin@123"
}
```

**Login Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token",
    "user": {
      "_id": "...",
      "name": "Super Admin",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

---

### Users (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users (paginated) |
| POST | `/users` | Create user |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |
| PATCH | `/users/:id/status` | Activate/deactivate |

---

### Channel Partners

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/channel-partners` | Any | List all |
| POST | `/channel-partners` | Admin | Create |
| PUT | `/channel-partners/:id` | Admin | Update |
| DELETE | `/channel-partners/:id` | Admin | Delete |

---

### Brands

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/brands` | Any | List all |
| GET | `/brands/channel-partner/:id` | Any | By channel partner |
| POST | `/brands` | Admin | Create |
| PUT | `/brands/:id` | Admin | Update |
| DELETE | `/brands/:id` | Admin | Delete |

---

### AWB Records

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/awb/scan` | Any | Scan new AWB |
| PUT | `/awb/cancel/:awbId` | Any | Cancel by AWB string |
| GET | `/awb` | Any | List (filtered, paginated) |
| GET | `/awb/:id` | Any | Get by MongoDB ID |
| PUT | `/awb/:id` | Any | Update by MongoDB ID |
| DELETE | `/awb/:id` | Admin | Delete by MongoDB ID |

**Scan Request:**
```json
{
  "awbId": "AWB123456",
  "channelPartnerId": "<objectId>",
  "brandId": "<objectId>"
}
```

**AWB Listing Query Params:**
```
?page=1&limit=10&search=AWB&status=dispatched
&channelPartnerId=xxx&brandId=yyy
&startDate=2024-01-01&endDate=2024-01-31
&sortBy=createdAt&sortOrder=desc
```

> **Important:** If `startDate`/`endDate` are omitted, only **today's records** are returned.

---

### Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard/stats` | Any | Aggregated stats |

**Response includes:**
- `totalScansToday` — count of scans today
- `totalDispatched` — all-time dispatched count
- `totalCancelled` — all-time cancelled count
- `brandAnalytics` — top 10 brands by scan volume
- `channelPartnerAnalytics` — top 10 channel partners by scan volume
- `scanActivityGraph` — last 7 days daily scan counts
- `recentActivities` — last 10 audit log entries

---

### Audit Logs (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audit-logs` | List logs (filtered, paginated) |

**Query Params:**
```
?page=1&limit=10&search=&actionType=create&userId=xxx
&startDate=2024-01-01&endDate=2024-01-31
```

---

### Export

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/export/awb-csv` | Any | Download AWB CSV |

Uses the same filters as the AWB listing endpoint. Returns a `.csv` file attachment.

---

## AWB Validation Rules

- Required
- Alphanumeric only (`^[a-zA-Z0-9]+$`)
- Min length: 6
- Max length: 30
- No duplicates (409 on re-scan)

---

## Standard Response Format

**Success:**
```json
{
  "success": true,
  "message": "...",
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

**Error:**
```json
{
  "success": false,
  "message": "...",
  "errors": []
}
```

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| Helmet | HTTP security headers |
| CORS | Configurable origin whitelist |
| Rate Limiting | 100 req/15min global; 20/15min on auth |
| JWT Auth | RS-safe HS256 tokens |
| Password Hashing | bcryptjs, 12 salt rounds |
| Input Validation | express-validator on all write endpoints |
| Error Handling | Centralized, no stack traces in production |

---

## Roles & Permissions

| Action | admin | user |
|--------|-------|------|
| Login | ✅ | ✅ |
| Scan AWB | ✅ | ✅ |
| Cancel AWB | ✅ | ✅ |
| View AWBs | ✅ | ✅ |
| Export CSV | ✅ | ✅ |
| Dashboard | ✅ | ✅ |
| Manage Users | ✅ | ❌ |
| Manage Channel Partners | ✅ | ❌ |
| Manage Brands | ✅ | ❌ |
| Delete AWB | ✅ | ❌ |
| View Audit Logs | ✅ | ❌ |

---

## Enums

```
ROLES:       admin | user
AWB STATUS:  dispatched | cancelled
AUDIT TYPES: create | update | delete | cancel
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server port |
| `MONGODB_URI` | — | MongoDB connection string |
| `JWT_SECRET` | — | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `NODE_ENV` | `development` | Environment |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `ADMIN_EMAIL` | `admin@example.com` | Seed admin email |
| `ADMIN_PASSWORD` | `Admin@123` | Seed admin password |
| `ADMIN_NAME` | `Super Admin` | Seed admin name |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |

---

## Health Check

```
GET /health
```
```json
{
  "success": true,
  "message": "AWB Tracking API is running",
  "environment": "development",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```
