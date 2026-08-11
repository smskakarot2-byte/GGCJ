#!/bin/bash

# Netlify Deployment Script for GCUF Result Portal
# This script helps you deploy the frontend to Netlify

set -e

echo "🚀 GCUF Result Portal - Netlify Deployment"
echo "=========================================="

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "⚠️  Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Check if logged in
if ! netlify api --method GET --path /account &> /dev/null; then
    echo "🔐 Please log in to Netlify:"
    netlify login
fi

# Build the frontend
echo ""
echo "📦 Building frontend..."
pnpm install
pnpm --filter @workspace/gcuf-web run build

# Deploy
echo ""
echo "🌐 Deploying to Netlify..."
netlify deploy --prod --dir=artifacts/gcuf-web/dist/public

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Set environment variables in Netlify dashboard:"
echo "      VITE_API_URL=https://your-backend-url.com"
echo "   2. Deploy your backend separately (see NETLIFY_DEPLOYMENT.md)"
echo "   3. Update ALLOWED_ORIGINS on your backend"
