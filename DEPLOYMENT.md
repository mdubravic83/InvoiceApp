# FinZen - Deployment Guide for Contabo/Plesk

## Prerequisites

- Docker & Docker Compose installed on your server
- Domain name pointed to your server IP
- SSL certificate (optional but recommended)

## Quick Start

### 1. Clone/Copy the application to your server

```bash
# Create directory
mkdir -p /var/www/finzen
cd /var/www/finzen

# Copy all files from this project to the server
# You can use SCP, SFTP, or Git
```

### 2. Configure environment variables

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env
```

**Required settings in `.env`:**
```env
PUBLIC_URL=https://your-domain.com
JWT_SECRET=generate-a-secure-random-string
CORS_ORIGINS=https://your-domain.com
```

### 3. Build and start the application

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Check if all services are running
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Access your application

Open `http://your-server-ip` or `https://your-domain.com` in your browser.

---

## SSL Configuration (HTTPS)

### Option A: Using Let's Encrypt with Certbot

```bash
# Install certbot
apt-get update
apt-get install certbot

# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Get certificate
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to ssl folder
mkdir -p ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/

# Edit nginx.conf - uncomment SSL lines
nano nginx.conf

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

### Option B: Using Plesk SSL

If you manage SSL through Plesk, configure Plesk to proxy to Docker:
1. In Plesk, set up your domain
2. Enable SSL via Plesk
3. Add a proxy rule: `/* -> http://localhost:80`

---

## Plesk Integration

### Method 1: Docker Extension in Plesk

1. Install "Docker" extension in Plesk
2. Use Plesk's Docker manager to import docker-compose.prod.yml
3. Manage containers through Plesk UI

### Method 2: Manual with Plesk Proxy

1. SSH into your server
2. Run Docker containers as shown above
3. In Plesk, create a proxy rule for your domain:
   - Go to Domains > your-domain.com > Apache & nginx Settings
   - Add nginx directive:
   ```nginx
   location / {
       proxy_pass http://127.0.0.1:80;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```

---

## Useful Commands

```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Restart a specific service
docker-compose -f docker-compose.prod.yml restart backend

# Rebuild after code changes
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps

# Access MongoDB shell
docker exec -it finzen-mongodb mongosh finzen

# Backup MongoDB
docker exec finzen-mongodb mongodump --out /backup
docker cp finzen-mongodb:/backup ./backup

# Access backend container shell
docker exec -it finzen-backend /bin/bash
```

---

## Troubleshooting

### Services not starting
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check if ports are available
netstat -tlnp | grep -E '80|443|27017'
```

### MongoDB connection issues
```bash
# Check if MongoDB is running
docker exec -it finzen-mongodb mongosh --eval "db.stats()"
```

### Frontend not loading
```bash
# Check frontend build
docker-compose -f docker-compose.prod.yml logs frontend

# Rebuild frontend
docker-compose -f docker-compose.prod.yml up -d --build frontend
```

### API not responding
```bash
# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Test API directly
curl http://localhost:8001/api/health
```

---

## Updating the Application

```bash
# Pull latest changes (if using Git)
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Or rebuild specific service
docker-compose -f docker-compose.prod.yml up -d --build backend
```

---

## Security Checklist

- [ ] Change JWT_SECRET to a secure random value
- [ ] Set CORS_ORIGINS to your specific domain(s)
- [ ] Enable SSL/HTTPS
- [ ] Set up firewall (allow only 80, 443, 22)
- [ ] Regular backups of MongoDB data
- [ ] Keep Docker images updated

---

## Support

For issues with:
- **Docker/Deployment**: Check Docker documentation
- **Plesk**: Contact Plesk/Contabo support
- **Application code**: Use Emergent platform for modifications
