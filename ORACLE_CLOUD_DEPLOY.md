# ☁️ Deploying Jewellery Cart to Oracle Cloud (Ubuntu)

This guide will walk you through deploying the **Jewellery Cart** application to an Oracle Cloud Infrastructure (OCI) Compute Instance running **Ubuntu**.

---

## 📋 Prerequisites

1.  **Oracle Cloud Account**: [Sign up here](https://www.oracle.com/cloud/free/) if you haven't.
2.  **SSH Key Pair**: You'll need this to connect to your instance.
3.  **Git** (On your local machine).

---

## 🛠 Step 1: Create a Compute Instance

1.  Log in to the **Oracle Cloud Console**.
2.  Navigate to **Compute** -> **Instances**.
3.  Click **Create Instance**.
4.  **Name**: `jewellery-cart-server` (or similar).
5.  **Image**: Change Image to **Canonical Ubuntu** (22.04 or 24.04).
6.  **Shape**:
    *   **Always Free Option**: Select **Ampere** (VM.Standard.A1.Flex) with 4 OCPUs and 24GB RAM (These are fast and free!).
    *   Or **AMD** (VM.Standard.E2.1.Micro) if Ampere is unavailable.
7.  **Networking**: Create new VCN or select existing. Ensure **Assign a public IPv4 address** is selected.
8.  **SSH Keys**: thorough **Save Private Key** (Keep this safe! You need it to login).
9.  Click **Create**.

---

## 🛡 Step 2: Configure Networking (Security List)

By default, Oracle Cloud blocks all ports except 22 (SSH). You must open port **5000** (for the app) or **80/443** (if using Nginx).

1.  Click on your newly created instance name.
2.  Click on the **Subnet** link (e.g., `subnet-2024...`).
3.  Click on the **Security List** (e.g., `Default Security List...`).
4.  Click **Add Ingress Rules**.
5.  Fill in:
    *   **Source CIDR**: `0.0.0.0/0` (Allows access from anywhere).
    *   **IP Protocol**: TCP.
    *   **Destination Port Range**: `5000` (and `80, 443` if using Nginx).
6.  Click **Add Ingress Rules**.

---

## 💻 Step 3: Connect to the Instance

Open your terminal (PowerShell or Bash) and run:

```bash
# Set permissions for your key (Linux/Mac only)
chmod 400 key.key

# Connect (default user for Ubuntu is 'ubuntu')
ssh -i path/to/your/key.key ubuntu@<YOUR_INSTANCE_PUBLIC_IP>
```

---

## 📦 Step 4: Transfer the Code

You can either clone the repository from GitHub (recommended) or upload the files manually.

### Option A: Via Git (Recommended)
1. Push your local code to GitHub/GitLab.
2. On the server:
   ```bash
   git clone https://github.com/your-username/jewellery-cart.git
   cd jewellery-cart
   ```

### Option B: Via SCP (Manual Upload)
From your local machine:
```bash
# Upload the current folder to server
scp -i path/to/key.key -r d:/jewellery-cart ubuntu@<YOUR_IP>:~/jewellery-cart
```

---

## 🚀 Step 5: Run the Deployment Script

We have prepared a script to automate the installation of Node.js, dependencies, building the project, and configuring Nginx (web server).

1.  Navigate to the project folder on the server:
    ```bash
    cd ~/jewellery-cart
    ```

2.  Make the script executable and run it:
    ```bash
    chmod +x deploy_setup.sh
    sudo ./deploy_setup.sh
    ```

    *This script will:*
    *   Install Node.js 20 & PM2.
    *   Install & Build the application.
    *   **Install & Configure Nginx** (Reverse Proxy).
    *   Setup the Ubuntu Firewall (Port 80/443).

---

## 🌐 Step 6: Verify Deployment

Open your browser and visit your IP:
`http://140.245.255.141`

You should see your Jewellery Cart application running!

---

## 🔒 Optional: Setup SSL (HTTPS)

For production, you should add an SSL certificate using Certbot (LetsEncrypt).

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d 140.245.255.141
```
*(Note: LetsEncrypt usually requires a domain name, not just an IP. If you buy a domain, point it to this IP).*

---

## ❓ Troubleshooting

**Q: I see "Site can't be reached"**
*   Check Oracle Security List (Ingress Rules) for Port 5000.
*   Check Ubuntu firewall (`sudo iptables -L` or `sudo ufw status`).
*   Check if PM2 is running: `pm2 status`.
*   Check logs: `pm2 logs jewellery-cart`.

**Q: Database errors?**
*   The app uses SQLite (`database.db`). Ensure the `backend` folder has write permissions (the script usually handles this, running as user is fine).
