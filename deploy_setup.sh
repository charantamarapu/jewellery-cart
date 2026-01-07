#!/bin/bash

# Exit functionality on error
set -e

SERVER_IP="140.245.255.141"

echo "🚀 Starting Jewellery Cart Deployment Setup for IP: $SERVER_IP..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo or as root"
  exit
fi

# 1. Update System
echo "📦 Updating system packages..."
apt update && apt upgrade -y
apt install -y build-essential python3 nginx

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
echo "▶️ Starting application via PM2..."
pm2 start ecosystem.config.cjs
pm2 save

# 6. Configure Nginx
echo "🌐 Configuring Nginx Reverse Proxy..."

# Create Nginx Config
cat > /etc/nginx/sites-available/jewellery-cart <<EOF
server {
    listen 80;
    server_name $SERVER_IP localhost;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable Site
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/jewellery-cart /etc/nginx/sites-enabled/

# Test and Restart Nginx
nginx -t
systemctl restart nginx

# 7. Configure Firewall (UFW & Iptables)
echo "🛡 configuring Firewall..."

# Try UFW first
if command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full'
    ufw allow 80
    ufw allow 443
    ufw allow 22
    # ufw enable # Don't auto-enable as it might lock user out if SSH isn't allowed properly, usually it is but safety first.
    echo "UFW rules added."
fi

# Iptables catch-all for Oracle Cloud images that don't always use UFW by default in the way we expect
if command -v iptables &> /dev/null; then
    # Insert rule at top to ensure it's not blocked by a DROP all rule later
    iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
    iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
    netfilter-persistent save || echo "netfilter-persistent not found, ignoring..."
fi

echo "✅ Deployment Setup Complete!"
echo "🎉 App is live at: http://$SERVER_IP"
echo "⚠️  IMPORTANT: ensure Port 80 is allowed in your Oracle Cloud 'Security List' (Ingress Rules)."
