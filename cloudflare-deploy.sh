#!/bin/bash

echo "🌐 Deploying ContextBridge for Cloudflare"
echo "========================================"

# Stop any running services
echo "Stopping existing services..."
docker compose down 2>/dev/null || true
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Clean up old volumes
echo "Cleaning up old database..."
docker volume rm contextbridge_postgres_data 2>/dev/null || true

# Create correct .env.production for Cloudflare setup
echo "Creating production environment..."
cat > .env.production << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://contextbridge:password@postgres:5432/contextbridge
JWT_SECRET=super-secret-jwt-key-change-in-production-12345678901234567890
SESSION_SECRET=super-secret-session-key-change-in-production-12345678901234567890
PORT=3001
FRONTEND_URL=https://context-bridge.com
BCRYPT_ROUNDS=12
ENABLE_PLUGINS=true
EOF

# Build and start services
echo "Building and starting services..."
docker compose -f docker-compose.cloudflare.yml build --no-cache
docker compose -f docker-compose.cloudflare.yml up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Run database migrations
echo "Running database migrations..."
docker compose -f docker-compose.cloudflare.yml exec app npm run db:migrate

# Test local connectivity
echo "Testing local connectivity..."
echo "API Health Check:"
curl -s http://localhost/api/health | jq . 2>/dev/null || curl -s http://localhost/api/health

echo ""
echo "Frontend Test:"
curl -s -I http://localhost/ | head -5

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app should now be available at:"
echo "   https://context-bridge.com"
echo ""
echo "🔧 Cloudflare Settings Required:"
echo "   1. DNS: A record 'context-bridge.com' → your server IP"
echo "   2. SSL/TLS: Set to 'Full' mode"
echo "   3. Edge Certificates: Enable 'Always Use HTTPS'"
echo ""
echo "🔍 Debug commands:"
echo "   docker compose -f docker-compose.cloudflare.yml logs app"
echo "   docker compose -f docker-compose.cloudflare.yml ps"
echo "   curl -I https://context-bridge.com"