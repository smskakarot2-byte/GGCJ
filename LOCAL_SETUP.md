# GGC Result System — Local Setup Guide

## Prerequisites

Before you start, install the following on your PC:

1. **Node.js v20 or higher**
   - Download from: https://nodejs.org
   - After install, verify: `node --version`

2. **pnpm** (package manager)
   - Open a terminal and run: `npm install -g pnpm`
   - Verify: `pnpm --version`

3. **PostgreSQL**
   - Download from: https://www.postgresql.org/download/
   - During installation, choose a password for the `postgres` user — remember it.
   - After install, open **pgAdmin** (installed alongside PostgreSQL) or use the `psql` terminal.

---

## Step 1 — Download the Project

Export this project from Replit as a ZIP file, then extract it to a folder on your PC (e.g. `C:\Projects\gcuf-portal` or `~/projects/gcuf-portal`).

---

## Step 2 — Create the Database

Open **pgAdmin** or your PostgreSQL shell and create a new database:

```sql
CREATE DATABASE gcuf_db;
```

---

## Step 3 — Create Environment File

In the **root folder** of the project, create a new file named `.env` and paste the following — replacing the values with your own:

```
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/gcuf_db
SESSION_SECRET=replace-this-with-any-long-random-string
```

- `YOUR_POSTGRES_PASSWORD` — the password you set when installing PostgreSQL
- `SESSION_SECRET` — any random text, e.g. `my-secret-key-gcuf-2025`

---

## Step 4 — Install Dependencies

Open a terminal in the project root folder and run:

```
pnpm install
```

This installs all packages for both the frontend and backend.

---

## Step 5 — Push Database Schema

This creates all the required tables in your database:

```
pnpm --filter @workspace/db run push
```

When prompted, confirm the changes.

---

## Step 6 — Start the API Server

Open a terminal and run:

```
PORT=8080 pnpm --filter @workspace/api-server run dev
```

**Windows users** — set environment variables differently:

```
set PORT=8080 && pnpm --filter @workspace/api-server run dev
```

Wait until you see: `Server listening  port: 8080`

The default admin account is created automatically on first run:
- **Email:** smskakarot@gmail.com
- **Password:** GCUF2025

---

## Step 7 — Start the Frontend

Open a **second terminal** (keep the first one running) and run:

```
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/gcuf-web run dev
```

**Windows users:**

```
set PORT=3000 && set BASE_PATH=/ && pnpm --filter @workspace/gcuf-web run dev
```

---

## Step 8 — Open the App

Open your browser and go to:

```
http://localhost:3000
```

---

## Quick Reference

| What | Command | Terminal |
|---|---|---|
| API Server | `PORT=8080 pnpm --filter @workspace/api-server run dev` | Terminal 1 |
| Frontend | `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/gcuf-web run dev` | Terminal 2 |
| App URL | `http://localhost:3000` | Browser |
| Push DB schema | `pnpm --filter @workspace/db run push` | Once only |

---

## Admin Login

| Field | Value |
|---|---|
| Email | smskakarot@gmail.com |
| Password | GCUF2025 |

---

## Troubleshooting

**"DATABASE_URL must be set" error**
- Make sure the `.env` file is in the root of the project (same level as `package.json`)
- Double-check there are no typos in the connection string

**"Connection refused" on port 5432**
- PostgreSQL is not running — open the Windows Services panel (or Activity Monitor on Mac) and start the PostgreSQL service

**API calls failing in the browser**
- Make sure the API server (Terminal 1) is running before you open the app
- The frontend automatically proxies `/api` requests to `http://localhost:8080`

**Port already in use**
- Change `PORT=3000` or `PORT=8080` to any other free port number
- If you change the API port, also set `API_PORT=<your-port>` when starting the frontend so the proxy knows where to point

**Windows: "set PORT" not working in PowerShell**
- Use this syntax instead: `$env:PORT="8080"; pnpm --filter @workspace/api-server run dev`
