#!/bin/bash

echo "🔧 Fixing ContextBridge database configuration..."

# Stop services
echo "Stopping services..."
docker compose -f docker-compose.prod.yml down

# Remove old database volume
echo "Removing old database volume..."
docker volume rm contextbridge_postgres_data 2>/dev/null || true

# Fix the .env.production file with correct database password
echo "Updating .env.production with correct database password..."
cat > .env.production << 'EOF'
# Production Environment Configuration
NODE_ENV=production

# Database
DATABASE_URL=postgresql://contextbridge:password@postgres:5432/contextbridge

# Authentication
JWT_SECRET=super-secret-jwt-key-for-production-change-this
SESSION_SECRET=super-secret-session-key-for-production-change-this

# Server Configuration
PORT=3001
FRONTEND_URL=https://context-bridge.com

# Security
BCRYPT_ROUNDS=12

# AI Provider APIs (Optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Plugins
ENABLE_PLUGINS=true
EOF

echo "Starting services with fresh database..."
docker compose -f docker-compose.prod.yml up -d

echo "Waiting for PostgreSQL to initialize..."
sleep 30

echo "Running database migrations..."
docker compose -f docker-compose.prod.yml exec app npm run db:migrate

echo "Testing API health..."
curl -s http://localhost/api/health | jq . || curl -s http://localhost/api/health

echo ""
echo "✅ Database reset complete!"
echo "🌐 Try visiting https://context-bridge.com"
echo ""
echo "Check logs with: docker compose -f docker-compose.prod.yml logs app"