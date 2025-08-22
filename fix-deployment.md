# ContextBridge Deployment Fixes

## Current Issues:
1. SSL/HTTPS not properly configured
2. Database password mismatch 
3. Migrations not run after rebuild
4. Mixed content errors

## Step-by-Step Fix:

### 1. Fix Database Connection
```bash
# Check current database password in docker-compose.prod.yml
docker compose -f docker-compose.prod.yml down

# Reset database with correct password
docker volume rm contextbridge_postgres_data

# Update the docker-compose.prod.yml with matching credentials
```

### 2. Run Migrations After Build
```bash
# Always run after any rebuild:
docker compose -f docker-compose.prod.yml exec app npm run db:migrate
```

### 3. Configure Cloudflare Properly

**In Cloudflare Dashboard:**
- Go to SSL/TLS → Overview
- Set SSL mode to "Full" or "Full (strict)"
- Go to SSL/TLS → Edge Certificates
- Enable "Always Use HTTPS"

**Set up proper port forwarding:**
- Cloudflare → DNS → Add A record: `context-bridge.com` → Your server IP
- In Cloudflare → Network, make sure port 80 is allowed

### 4. Update Server Configuration

The server should respond to HTTP on port 80 and let Cloudflare handle HTTPS termination.

### 5. Test Commands

```bash
# Stop everything
docker compose -f docker-compose.prod.yml down

# Remove old database volume
docker volume rm contextbridge_postgres_data

# Start fresh
docker compose -f docker-compose.prod.yml up -d

# Wait for services to start
sleep 30

# Run migrations
docker compose -f docker-compose.prod.yml exec app npm run db:migrate

# Check health
curl http://your-server-ip/api/health

# Check if app responds on port 80
curl http://your-server-ip/

# Test your domain
curl -I https://context-bridge.com
```

### 6. Cloudflare Settings Checklist

- [ ] DNS A record points to your server IP
- [ ] SSL/TLS mode set to "Full" 
- [ ] "Always Use HTTPS" enabled
- [ ] Port 80 allowed in firewall/network settings

### 7. Expected Behavior

- `http://context-bridge.com` → Cloudflare redirects to HTTPS
- `https://context-bridge.com` → Cloudflare terminates SSL, proxies to your HTTP server on port 80
- Your server serves the React app and API properly

## Quick Fix Commands:

```bash
# Complete reset and restart
docker compose -f docker-compose.prod.yml down
docker volume prune -f
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
sleep 30
docker compose -f docker-compose.prod.yml exec app npm run db:migrate
```

Then test `https://context-bridge.com`