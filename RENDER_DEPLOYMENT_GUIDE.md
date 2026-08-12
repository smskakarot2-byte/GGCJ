# Render.com Unified Deployment Guide

## Overview
This repository has been refactored to deploy as a **single unified service** on Render.com. The Express backend now builds and serves the React frontend directly, eliminating CORS issues by serving both API and UI from the same origin.

## Architecture Changes

### Before (Separate Deployments)
- Frontend: Netlify (static site)
- Backend: Render (Express API)
- Problem: CORS errors, `VITE_API_URL` embedding issues

### After (Unified Deployment)
- Single Render Web Service serving both frontend and backend
- Frontend built during backend build process
- Express serves static files + API routes from same origin
- No CORS issues (same origin for everything)

---

## Render Dashboard Configuration

### 1. Create New Web Service
Connect your GitHub repository to Render and create a new **Web Service**.

### 2. Build Command
```bash
pnpm install && pnpm --filter @workspace/gcuf-web run build && pnpm --filter @workspace/api-server run build
```

### 3. Start Command
```bash
pnpm --filter @workspace/api-server run start
```

### 4. Environment Variables
Set the following environment variables in the Render Dashboard:

| Key | Value | Required | Notes |
|-----|-------|----------|-------|
| `DATABASE_URL` | (from Neon/PostgreSQL) | ✅ | Your PostgreSQL connection string |
| `ADMIN_EMAIL` | (your admin email) | ✅ | For initial admin user seeding |
| `ADMIN_PASSWORD` | (your admin password) | ✅ | For initial admin user seeding |
| `NODE_ENV` | `production` | ✅ | Enables static file serving |
| `PORT` | `8080` | ✅ | Render uses port 8080 |
| `SESSION_SECRET` | (auto-generated) | ✅ | Click "Generate Value" in Render |
| `ALLOWED_ORIGINS` | `https://your-app.onrender.com` | Optional | Set to your Render URL for production |

---

## File Structure

```
/workspace
├── artifacts/
│   ├── api-server/           # Backend (Express)
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point (now serves static files)
│   │   │   └── app.ts        # Express app configuration
│   │   ├── dist/
│   │   │   └── index.mjs     # Built backend
│   │   └── package.json      # Added build:all script
│   │
│   └── gcuf-web/             # Frontend (React/Vite)
│       ├── dist/public/      # Built frontend (served by Express)
│       ├── vite.config.ts    # Removed proxy config
│       └── package.json
│
├── render.yaml               # Updated for single service deployment
└── pnpm-workspace.yaml       # Monorepo configuration
```

---

## Key Code Changes

### 1. `artifacts/api-server/package.json`
Added `build:all` script to build both frontend and backend:
```json
"build:all": "pnpm install && pnpm --filter @workspace/gcuf-web run build && pnpm run build"
```

### 2. `artifacts/api-server/src/index.ts`
Added static file serving logic:
```typescript
import path from "path";
import { fileURLToPath } from "url";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === "production";
const frontendBuildPath = path.join(__dirname, "../../../artifacts/gcuf-web/dist/public");

// In main() function:
if (isProduction) {
  app.use(express.static(frontendBuildPath));
  
  // Catch-all route for React Router
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
}
```

### 3. `artifacts/gcuf-web/vite.config.ts`
Removed Vite proxy configuration (no longer needed):
```typescript
// Removed:
proxy: {
  "/api": {
    target: `http://localhost:${process.env.API_PORT ?? 8080}`,
    changeOrigin: true,
  },
},
```

### 4. Cleanup
- Deleted `netlify.toml` (no longer using Netlify)
- Deleted `netlify-deploy.sh` (no longer using Netlify)
- Updated `render.yaml` for single service deployment

---

## How It Works

1. **Build Phase**: Render runs the build command which:
   - Installs all dependencies (`pnpm install`)
   - Builds the React frontend to `artifacts/gcuf-web/dist/public`
   - Builds the Express backend to `artifacts/api-server/dist/index.mjs`

2. **Start Phase**: Render runs the start command which:
   - Starts the Express server
   - In production mode (`NODE_ENV=production`), Express serves:
     - `/api/*` routes → API handlers
     - `/*` routes → Static React files (with catch-all for React Router)

3. **Request Flow**:
   ```
   User Request → Render → Express Server
                              ├── /api/users → API Route Handler
                              ├── /dashboard → Static File (React Router)
                              └── / → index.html (React App)
   ```

---

## Troubleshooting

### Frontend not loading
1. Check that `NODE_ENV=production` is set
2. Verify the frontend build completed successfully in Render logs
3. Check that `artifacts/gcuf-web/dist/public/index.html` exists

### API returning 404
1. Ensure API routes are defined with `/api` prefix
2. Check that static middleware is added AFTER API routes in `app.ts`

### React Router pages return 404
1. Verify the catch-all route (`app.get("*", ...)`) is present
2. Ensure it's added after API routes but before `app.listen()`

### Database connection errors
1. Verify `DATABASE_URL` is correctly set in Render Dashboard
2. Check that your database allows connections from Render IPs

---

## Benefits of This Approach

✅ **No CORS Issues**: API and UI share the same origin  
✅ **Simpler Deployment**: Single service to manage  
✅ **Cost Effective**: Uses only one Render free tier service  
✅ **Faster Initial Load**: No preflight requests  
✅ **Cleaner Architecture**: No need for `VITE_API_URL` environment variable  

---

## Migration Checklist

- [ ] Update Render Dashboard with new Build Command
- [ ] Update Render Dashboard with new Start Command  
- [ ] Set all required Environment Variables
- [ ] Remove old separate frontend service from Render (if exists)
- [ ] Remove Netlify deployment (if still active)
- [ ] Test full application flow after deployment
- [ ] Update any documentation with new single URL
