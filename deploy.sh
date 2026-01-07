#!/bin/bash

# Fast Deployment Script (Run this for every update)
set -e

echo "🚀 Starting Deployment Update..."

# 0. Fix Permissions (Crucial if previous runs were sudo)
echo "🔒 Fixing Permissions..."
sudo chown -R $USER:$USER .

# 1. Pull latest changes
echo "📥 Pulling Code from Git..."
git pull

# 2. Backend Updates
echo "📦 Updating Backend..."
cd backend
npm install
cd ..

# 3. Frontend Updates
echo "🏗 Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 4. Restart Application
echo "🔄 Restarting Server..."
# Use 'start' or 'reload' with config file which handles both starting new and restarting existing
pm2 start ecosystem.config.cjs --env production

echo "✅ Deployment Complete! App is updated."
