#!/bin/bash

# Exit functionality on error
set -e

echo "🚀 Starting Jewellery Cart Deployment Setup..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo or as root"
  exit
fi

# 1. Update System
echo "📦 Updating system packages..."
apt update && apt upgrade -y
apt install -y build-essential python3

# 2. Install Node.js 20.x
if ! command -v node &> /dev/null; then
    echo "🟢 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo "🟢 Node.js is already installed"
fi

# 3. Install Global Tools
echo "🛠 Installing PM2..."
npm install -g pm2

# 4. Install Dependencies & Build
echo "📚 Installing Backend Dependencies..."
cd backend
npm install
cd ..

echo "📚 Installing Frontend Dependencies..."
cd frontend
npm install

echo "🏗 Building Frontend..."
npm run build
cd ..

# 5. Start Application
echo "▶️ Starting application with PM2..."
pm2 start ecosystem.config.cjs
pm2 save

echo "✅ Deployment Setup Complete!"
echo "⚠️  IMPORTANT: "
echo "1. Configure your Security List in Oracle Cloud to allow traffic on port 5000 (or 80/443 if using Nginx)."
echo "2. If you use Nginx, please configure the reverse proxy."
echo "Your app is currently running on port 5000."
