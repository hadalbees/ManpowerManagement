# Production Deployment Guide
**Manpower Agency Management System**

This guide provides end-to-end instructions for deploying the backend API and Next.js frontend to production servers.

---

## 1. System Requirements & Prerequisites

- **Operating System**: Ubuntu 22.04 LTS or Amazon Linux 2023
- **Node.js**: v20.x LTS or v22.x LTS
- **Package Manager**: npm v10+
- **Database**: PostgreSQL 16+
- **Process Manager**: PM2 or systemd
- **Web Server**: Nginx with Certbot (Let's Encrypt SSL)

---

## 2. Server Provisioning & Repository Setup

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx

# 2. Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2 globally
sudo npm install -g pm2

# 4. Clone repository into production directory
sudo mkdir -p /var/www/manpower-agency
sudo chown -R $USER:$USER /var/www/manpower-agency
git clone <REPO_URL> /var/www/manpower-agency
```

---

## 3. Backend Deployment

```bash
cd /var/www/manpower-agency/backend

# 1. Install dependencies
npm ci --production=false

# 2. Configure production environment
cp .env.example .env
nano .env  # Configure DATABASE_URL, JWT_SECRET, DATABASE_ENCRYPTION_KEY_256, CORS_ORIGINS

# 3. Generate Prisma client & apply database migrations
npx prisma validate
npx prisma generate
npx prisma migrate deploy

# 4. Compile NestJS production build
npm run build

# 5. Start Backend with PM2
pm2 start dist/main.js --name "manpower-backend" \
  --max-memory-restart 1G \
  --instances max \
  --exec-mode cluster \
  --env production

pm2 save
```

---

## 4. Frontend Deployment

```bash
cd /var/www/manpower-agency/frontend

# 1. Install dependencies
npm ci

# 2. Configure production environment
cat <<EOF > .env.local
NEXT_PUBLIC_API_URL=https://api.apexmanpower.com/api/v1
NODE_ENV=production
EOF

# 3. Compile Next.js production bundle
npm run build

# 4. Start Next.js with PM2
pm2 start npm --name "manpower-frontend" -- start -- -p 3000
pm2 save
```

---

## 5. Reverse Proxy Configuration (Nginx)

Create `/etc/nginx/sites-available/manpower.conf`:

```nginx
# 1. Backend API Proxy
server {
    server_name api.apexmanpower.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }
}

# 2. Frontend Next.js Web App Proxy
server {
    server_name app.apexmanpower.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and acquire SSL:
```bash
sudo ln -s /etc/nginx/sites-available/manpower.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.apexmanpower.com -d app.apexmanpower.com
```

---

## 6. Post-Deployment Smoke Verification

```bash
# 1. Test Backend Liveness
curl -i https://api.apexmanpower.com/api/v1/health

# 2. Test Backend Database Readiness
curl -i https://api.apexmanpower.com/api/v1/health/ready

# 3. Test Frontend Status
curl -i https://app.apexmanpower.com/login
```
