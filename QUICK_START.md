# 🚀 QUICK START GUIDE - Development Setup

## Issue: Server Won't Start

**Error:** `NODE_ENV is required but not set`

## ✅ Solution: Create .env File

### Step 1: Copy Environment Template
```bash
cd backend
cp .env.example .env
```

### Step 2: Edit .env File
Open `backend/.env` and ensure these minimum values are set:

```env
# Required for development
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/bizzai

# Security (development only - change in production!)
JWT_SECRET=dev_jwt_secret_min_32_characters_long_change_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_min_32_characters_long_change_in_production

# Email (optional for development)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### Step 3: Start Development Server
```bash
npm run dev
```

## ✅ Expected Output

```
[nodemon] starting `node server.js`
2026-01-16 00:58:35 [info]: Validating environment variables...
✅ Environment validation passed
🔄 Connecting to MongoDB...
✅ Connected to MongoDB
2026-01-16 00:58:36 [info]: Server running on port 5000
```

## 🔧 Troubleshooting

### MongoDB Not Running?
```bash
# Start MongoDB (if installed locally)
mongod

# Or use Docker
docker run -d -p 27017:27017 mongo:6
```

### Still Getting Errors?
1. Check `.env` file exists in `backend/` folder
2. Verify `NODE_ENV=development` is set
3. Ensure MongoDB is running
4. Check port 5000 is not in use

## 📝 Optional Environment Variables

These can be left empty for development:
- `SENTRY_DSN` - Error tracking (optional)
- `FRONTEND_URL` - Will default to http://localhost:5173
- `JWT_REFRESH_SECRET` - Will default to JWT_SECRET
- `ALLOWED_ORIGINS` - Additional CORS origins

## 🎯 You're Ready!

Once the server starts successfully, you can:
- Access API: http://localhost:5000
- Health check: http://localhost:5000/api/health
- Start frontend: `cd frontend && npm run dev`
