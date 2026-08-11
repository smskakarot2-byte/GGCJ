# GCUF Result Portal - Netlify Deployment Guide

## Overview

This repository has been configured for deployment on Netlify. The application is now split into two parts:

1. **Frontend (React/Vite)** - Deployed on Netlify (free tier)
2. **Backend (Express API)** - Deployed on a separate service (Render, Railway, or Fly.io)

## Why Split Architecture?

Netlify is designed for static sites and serverless functions. Your Express backend requires:
- Persistent WebSocket connections for sessions
- Long-running processes for session management
- Database connections that persist across requests

These requirements are better suited for traditional hosting services like Render or Railway.

## Prerequisites

1. **PostgreSQL Database** - Create a free database on one of these services:
   - [Neon.tech](https://neon.tech) (recommended)
   - [Supabase](https://supabase.com)
   - [Railway](https://railway.app)

2. **Backend Hosting** - Deploy your API on:
   - [Render](https://render.com) (free tier available)
   - [Railway](https://railway.app) (free trial)
   - [Fly.io](https://fly.io) (free allowance)

## Step 1: Deploy the Backend

### Option A: Deploy on Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `pnpm install && pnpm --filter @workspace/api-server build`
   - **Start Command**: `node artifacts/api-server/dist/index.mjs`
   - **Environment Variables**:
     ```
     DATABASE_URL=your_database_url
     SESSION_SECRET=generate_a_random_secret
     NODE_ENV=production
     PORT=8080
     ALLOWED_ORIGINS=https://your-netlify-site.netlify.app
     ADMIN_EMAIL=admin@example.com
     ADMIN_PASSWORD=your_secure_password
     ```

### Option B: Deploy on Railway

1. Create a new project on Railway
2. Add a PostgreSQL database
3. Deploy your code with the same build/start commands as Render
4. Set the same environment variables

## Step 2: Deploy the Frontend on Netlify

### Via Netlify UI (Recommended)

1. Push your code to GitHub
2. Go to [Netlify](https://netlify.com) and click "Add new site"
3. Choose "Import an existing project"
4. Connect your GitHub repository
5. Configure build settings:
   - **Base directory**: (leave empty)
   - **Build command**: `pnpm install && pnpm --filter @workspace/gcuf-web run build`
   - **Publish directory**: `artifacts/gcuf-web/dist/public`
6. Add environment variables:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   ```
7. Click "Deploy site"

### Via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link your site
netlify link

# Deploy
netlify deploy --prod
```

## Step 3: Configure CORS on Backend

Update your backend's `ALLOWED_ORIGINS` environment variable to include your Netlify URL:

```
ALLOWED_ORIGINS=https://your-site.netlify.app,https://www.your-site.netlify.app
```

## Step 4: Update Frontend API Calls

The frontend is already configured to use relative API paths (`/api/*`). Netlify will proxy these requests to your backend using the redirect rules in `netlify.toml`.

However, for production, you should update the API client to use your backend URL directly. See the optional configuration below.

## Optional: Direct API Calls (Better Performance)

Instead of proxying through Netlify, you can configure the frontend to call your backend directly:

1. In your Netlify environment variables, add:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   ```

2. Update `/workspace/artifacts/gcuf-web/src/lib/use-auth.ts` to use the full URL:

```typescript
// Replace relative URLs with:
const API_URL = import.meta.env.VITE_API_URL || '';

fetch(`${API_URL}/api/auth/user`, { credentials: "include" })
```

**Note**: If using direct calls, ensure your backend has proper CORS configuration and supports credentials.

## Environment Variables Summary

### Backend (Render/Railway)
```
DATABASE_URL=postgresql://...
SESSION_SECRET=random_secret_here
NODE_ENV=production
PORT=8080
ALLOWED_ORIGINS=https://your-site.netlify.app
ADMIN_EMAIL=admin@ggcjhang.edu.pk
ADMIN_PASSWORD=secure_password
```

### Frontend (Netlify)
```
VITE_API_URL=https://your-api.onrender.com
```

## Database Setup

Run migrations on your PostgreSQL database:

```bash
# After setting DATABASE_URL
pnpm --filter @workspace/db db:migrate
```

Or manually run the schema from `/workspace/lib/db/src/schema/` to create tables.

## Testing Locally

To test the production-like setup locally:

```bash
# Terminal 1 - Backend
cd /workspace
export DATABASE_URL=your_db_url
export SESSION_SECRET=test_secret
export NODE_ENV=production
export PORT=8080
export ALLOWED_ORIGINS=http://localhost:5173
pnpm --filter @workspace/api-server dev

# Terminal 2 - Frontend
cd /workspace
export NODE_ENV=development
export REPL_ID=test
pnpm --filter @workspace/gcuf-web dev
```

## Troubleshooting

### Build Fails on Netlify
- Ensure `pnpm-lock.yaml` is committed
- Check Node version (set to 20 in `netlify.toml`)
- Verify all workspace dependencies are properly linked

### API Calls Fail
- Check CORS settings on backend
- Verify `ALLOWED_ORIGINS` includes your Netlify URL
- Check browser console for CORS errors

### Session Issues
- Ensure cookies are being sent with requests (`credentials: "include"`)
- Backend must have `secure: true` for cookies in production (HTTPS)
- Session TTL and cookie settings must match

## Cost Breakdown

- **Netlify Frontend**: Free (100GB bandwidth/month)
- **Render Backend**: Free (with limitations) or $7/month for better performance
- **Neon Database**: Free (0.5 GB storage)
- **Total**: $0-7/month depending on usage

## Next Steps

1. Deploy backend first and get the URL
2. Deploy frontend on Netlify
3. Test authentication flow
4. Seed initial admin user
5. Upload student data and courses

For support, refer to:
- [Netlify Docs](https://docs.netlify.com)
- [Render Docs](https://render.com/docs)
- [Drizzle ORM](https://orm.drizzle.team)
