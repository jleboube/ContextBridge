#!/bin/bash

# ContextBridge Production Setup Script
# Run this script on your production server to set up ContextBridge

set -e

echo "🚀 ContextBridge Production Setup"
echo "=================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   exit 1
fi

# Function to generate random secret
generate_secret() {
    openssl rand -hex 32
}

# Function to prompt for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local result
    
    read -p "$prompt [$default]: " result
    echo "${result:-$default}"
}

echo "📋 Gathering production configuration..."

# Get domain
DOMAIN=$(prompt_with_default "Enter your domain name (e.g., contextbridge.yourdomain.com)" "localhost")

# Get database password
DB_PASSWORD=$(prompt_with_default "Enter PostgreSQL password (leave empty to generate)" "")
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(generate_secret)
    echo -e "${GREEN}Generated database password: $DB_PASSWORD${NC}"
fi

# Get JWT secrets
JWT_SECRET=$(generate_secret)
SESSION_SECRET=$(generate_secret)

echo -e "${GREEN}Generated JWT secret${NC}"
echo -e "${GREEN}Generated session secret${NC}"

# Ask about AI API keys
echo ""
echo -e "${YELLOW}⚠️  AI API Keys (Optional but recommended for Phase 2 features):${NC}"
OPENAI_KEY=$(prompt_with_default "Enter OpenAI API key (optional)" "")
ANTHROPIC_KEY=$(prompt_with_default "Enter Anthropic API key (optional)" "")

# Ask about email configuration
echo ""
echo -e "${YELLOW}📧 Email Configuration (Optional for team invitations):${NC}"
SMTP_HOST=$(prompt_with_default "SMTP host" "")
SMTP_USER=$(prompt_with_default "SMTP username" "")
SMTP_PASS=$(prompt_with_default "SMTP password" "")

echo ""
echo "🔧 Creating production environment file..."

# Create .env.production with actual values
cat > .env.production << EOF
# Production Environment Configuration for ContextBridge
NODE_ENV=production

# Database
DATABASE_URL=postgresql://contextbridge:${DB_PASSWORD}@postgres:5432/contextbridge

# Authentication
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# Server Configuration
PORT=3001
FRONTEND_URL=https://${DOMAIN}

# Security
BCRYPT_ROUNDS=12

# AI Provider APIs
OPENAI_API_KEY=${OPENAI_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}

# Email Configuration
SMTP_HOST=${SMTP_HOST}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
SMTP_FROM=noreply@${DOMAIN}

# Plugins
ENABLE_PLUGINS=true
EOF

echo -e "${GREEN}✅ Environment file created${NC}"

# Create docker-compose.prod.yml with production settings
echo "🐳 Creating production Docker Compose configuration..."

cat > docker-compose.prod.yml << EOF
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: contextbridge
      POSTGRES_USER: contextbridge
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U contextbridge"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "3001:3001"
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
EOF

echo -e "${GREEN}✅ Production Docker Compose configuration created${NC}"

# Create nginx configuration
echo "🔧 Creating Nginx configuration..."

mkdir -p ssl

cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3001;
    }

    server {
        listen 80;
        server_name _;
        
        # Redirect HTTP to HTTPS
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Configuration (update paths for your certificates)
        ssl_certificate /etc/ssl/certs/contextbridge.crt;
        ssl_certificate_key /etc/ssl/certs/contextbridge.key;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Proxy to Node.js app
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 86400;
        }

        # Static file serving with caching
        location /static {
            alias /app/dist/client;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

echo -e "${GREEN}✅ Nginx configuration created${NC}"

# Create startup script
echo "🚀 Creating startup script..."

cat > start-production.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting ContextBridge in production mode..."

# Build and start services
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to start..."
sleep 30

# Run database migrations
echo "🗄️  Running database migrations..."
docker compose -f docker-compose.prod.yml exec app npm run db:migrate

echo "✅ ContextBridge is now running in production mode!"
echo "🌐 Access your application at: https://$DOMAIN"
echo "📊 Health check: https://$DOMAIN/api/health"

# Show logs
echo ""
echo "📋 Recent logs:"
docker compose -f docker-compose.prod.yml logs --tail=50

echo ""
echo "🔍 To view live logs: docker compose -f docker-compose.prod.yml logs -f"
echo "🛑 To stop services: docker compose -f docker-compose.prod.yml down"
echo "📊 To check status: docker compose -f docker-compose.prod.yml ps"
EOF

chmod +x start-production.sh

echo -e "${GREEN}✅ Startup script created${NC}"

# Create SSL certificate generation script
cat > generate-ssl.sh << 'EOF'
#!/bin/bash

# Generate self-signed SSL certificate for development
# For production, use Let's Encrypt with certbot

DOMAIN=${1:-localhost}

echo "🔒 Generating SSL certificate for $DOMAIN"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/contextbridge.key \
    -out ssl/contextbridge.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"

echo "✅ SSL certificate generated in ssl/ directory"
echo "⚠️  For production, replace with proper SSL certificates from Let's Encrypt"
EOF

chmod +x generate-ssl.sh

echo ""
echo -e "${GREEN}🎉 Production setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Review the generated .env.production file"
echo "2. Generate SSL certificates: ./generate-ssl.sh $DOMAIN"
echo "3. Start the application: ./start-production.sh"
echo "4. For Let's Encrypt SSL, run: certbot --nginx -d $DOMAIN"
echo ""
echo -e "${YELLOW}⚠️  Important Security Notes:${NC}"
echo "- Change default passwords in .env.production"
echo "- Set up proper SSL certificates for production"
echo "- Configure firewall (ufw) to only allow necessary ports"
echo "- Regularly update dependencies and Docker images"
echo "- Set up automated backups for your database"
echo ""
echo "📧 Credentials saved in .env.production - keep this file secure!"
echo -e "${GREEN}Database password: $DB_PASSWORD${NC}"