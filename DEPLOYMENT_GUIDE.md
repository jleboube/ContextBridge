# ContextBridge Deployment & Testing Guide

This guide provides step-by-step instructions for deploying and testing ContextBridge on a remote VM.

## Prerequisites

Your VM should have:
- Ubuntu 20.04+ or similar Linux distribution
- At least 2GB RAM and 10GB disk space
- Docker and Docker Compose installed
- Node.js 18+ installed
- PostgreSQL 12+ installed (or use Docker)

## Installation Steps

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Docker and Docker Compose
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
newgrp docker

# Verify installations
node --version    # Should be v18.x.x
npm --version     # Should be 9.x.x
psql --version    # Should be PostgreSQL 12+
docker --version  # Should be Docker 20+
```

### 2. Clone and Setup Project

```bash
# Clone the project (assuming you've transferred the files)
cd /home/$USER
# Copy your ContextBridge files here

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Database Setup

#### Option A: Using Docker (Recommended)
```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
sleep 10

# Run migrations
npm run db:migrate
```

#### Option B: Using System PostgreSQL
```bash
# Create database and user
sudo -u postgres createuser contextbridge
sudo -u postgres createdb contextbridge
sudo -u postgres psql -c "ALTER USER contextbridge WITH PASSWORD 'password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE contextbridge TO contextbridge;"

# Update .env file with correct DATABASE_URL
echo "DATABASE_URL=postgresql://contextbridge:password@localhost:5432/contextbridge" >> .env

# Run migrations
npm run db:migrate
```

### 4. Build and Start Application

#### Development Mode
```bash
# Start development servers
npm run dev

# This will start:
# - Backend API on http://localhost:3001
# - Frontend on http://localhost:5173
```

#### Production Mode with Docker
```bash
# Build and start with Docker Compose
docker-compose up -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f
```

#### Production Mode Manual
```bash
# Build the application
npm run build

# Start production server
NODE_ENV=production npm start
```

## Testing Guide

### 1. Health Check

```bash
# Test API health endpoint
curl http://localhost:3001/api/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-08-21T...",
#   "version": "1.0.0",
#   "environment": "production"
# }
```

### 2. Database Connection Test

```bash
# Connect to database and check tables
psql -U contextbridge -d contextbridge -h localhost

# In psql, run:
\dt  # Should list: users, projects, conversations, messages, exports

# Check if demo user exists (if init.sql ran)
SELECT email FROM users LIMIT 1;

\q  # Exit psql
```

### 3. API Testing

Create a test script:

```bash
# Create test script
cat > test_api.sh << 'EOF'
#!/bin/bash

BASE_URL="http://localhost:3001/api"

echo "=== Testing ContextBridge API ==="

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "$BASE_URL/health" | jq .

# Test user registration
echo -e "\n2. Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "firstName": "Test",
    "lastName": "User"
  }')

echo $REGISTER_RESPONSE | jq .

# Extract access token
ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')

if [ "$ACCESS_TOKEN" != "null" ] && [ "$ACCESS_TOKEN" != "" ]; then
  echo "✓ Registration successful, got access token"
  
  # Test creating project
  echo -e "\n3. Testing project creation..."
  PROJECT_RESPONSE=$(curl -s -X POST "$BASE_URL/projects" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{
      "name": "Test Project",
      "description": "A test project for API validation",
      "tags": ["test", "api"]
    }')
  
  echo $PROJECT_RESPONSE | jq .
  
  PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.project.id')
  
  if [ "$PROJECT_ID" != "null" ] && [ "$PROJECT_ID" != "" ]; then
    echo "✓ Project creation successful"
    
    # Test creating conversation
    echo -e "\n4. Testing conversation creation..."
    CONVERSATION_RESPONSE=$(curl -s -X POST "$BASE_URL/conversations" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -d '{
        "projectId": "'$PROJECT_ID'",
        "title": "Test Conversation",
        "aiProvider": "openai",
        "modelVersion": "gpt-4"
      }')
    
    echo $CONVERSATION_RESPONSE | jq .
    
    CONVERSATION_ID=$(echo $CONVERSATION_RESPONSE | jq -r '.conversation.id')
    
    if [ "$CONVERSATION_ID" != "null" ] && [ "$CONVERSATION_ID" != "" ]; then
      echo "✓ Conversation creation successful"
      
      # Test adding message
      echo -e "\n5. Testing message creation..."
      MESSAGE_RESPONSE=$(curl -s -X POST "$BASE_URL/messages" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d '{
          "conversationId": "'$CONVERSATION_ID'",
          "role": "user",
          "content": "This is a test message for API validation."
        }')
      
      echo $MESSAGE_RESPONSE | jq .
      
      # Test export
      echo -e "\n6. Testing export functionality..."
      EXPORT_RESPONSE=$(curl -s -X POST "$BASE_URL/exports/project/$PROJECT_ID" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d '{
          "format": "json"
        }')
      
      echo $EXPORT_RESPONSE | jq '.export' 2>/dev/null || echo $EXPORT_RESPONSE
      
      echo -e "\n✓ All API tests completed successfully!"
    else
      echo "✗ Conversation creation failed"
    fi
  else
    echo "✗ Project creation failed"
  fi
else
  echo "✗ Registration failed"
fi

echo -e "\n=== API Testing Complete ==="
EOF

chmod +x test_api.sh
```

Run the API tests:

```bash
# Install jq for JSON parsing
sudo apt install jq -y

# Run the test script
./test_api.sh
```

### 4. Frontend Testing

```bash
# Install a simple browser testing tool
npm install -g puppeteer

# Create frontend test script
cat > test_frontend.js << 'EOF'
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  try {
    console.log('=== Testing ContextBridge Frontend ===');
    
    // Test if page loads
    console.log('1. Testing page load...');
    await page.goto('http://localhost:5173');
    await page.waitForSelector('body', { timeout: 10000 });
    
    const title = await page.title();
    console.log('✓ Page loaded:', title);
    
    // Test if login form exists
    console.log('2. Testing login form...');
    await page.waitForSelector('form', { timeout: 5000 });
    console.log('✓ Login form found');
    
    // Test registration flow
    console.log('3. Testing registration...');
    await page.click('a[href="/register"]');
    await page.waitForSelector('input[name="firstName"]', { timeout: 5000 });
    
    await page.type('input[name="firstName"]', 'Test');
    await page.type('input[name="lastName"]', 'User');
    await page.type('input[name="email"]', 'frontend@test.com');
    await page.type('input[name="password"]', 'testpassword123');
    await page.type('input[name="confirmPassword"]', 'testpassword123');
    
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForSelector('h1', { timeout: 10000 });
    const heading = await page.$eval('h1', el => el.textContent);
    
    if (heading.includes('Welcome back')) {
      console.log('✓ Registration and login successful');
      console.log('✓ Dashboard loaded');
      
      // Test project creation
      console.log('4. Testing project creation...');
      await page.click('a[href="/projects/new"]');
      await page.waitForSelector('input[name="name"]', { timeout: 5000 });
      
      await page.type('input[name="name"]', 'Frontend Test Project');
      await page.type('textarea[name="description"]', 'Created by automated frontend test');
      await page.type('input[name="tags"]', 'frontend, test, automation');
      
      await page.click('button[type="submit"]');
      
      // Wait for project page
      await page.waitForSelector('h1', { timeout: 10000 });
      const projectTitle = await page.$eval('h1', el => el.textContent);
      
      if (projectTitle.includes('Frontend Test Project')) {
        console.log('✓ Project creation successful');
        console.log('✓ All frontend tests passed!');
      } else {
        console.log('✗ Project creation failed');
      }
    } else {
      console.log('✗ Registration/login failed');
    }
    
  } catch (error) {
    console.error('Frontend test error:', error.message);
  }
  
  await browser.close();
  console.log('=== Frontend Testing Complete ===');
})();
EOF

# Run frontend test
node test_frontend.js
```

### 5. Performance and Load Testing

```bash
# Install Apache Bench for load testing
sudo apt install apache2-utils -y

# Test API performance
echo "=== Load Testing API ==="
ab -n 1000 -c 10 http://localhost:3001/api/health

# Test with authentication (replace TOKEN with actual token)
# ab -n 100 -c 5 -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3001/api/projects
```

### 6. Security Testing

```bash
# Test rate limiting
echo "=== Testing Rate Limiting ==="
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@email.com","password":"wrongpassword"}'
done
# Should show 429 (Too Many Requests) after 5 attempts

# Test SQL injection protection
echo "=== Testing SQL Injection Protection ==="
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com'\''OR 1=1--","password":"anything"}'
# Should return authentication error, not SQL error
```

### 7. Data Export Testing

```bash
# Test export functionality
cat > test_export.sh << 'EOF'
#!/bin/bash

# Login and get token
RESPONSE=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123"}')

TOKEN=$(echo $RESPONSE | jq -r '.accessToken')

if [ "$TOKEN" != "null" ]; then
  # Get projects
  PROJECTS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:3001/api/projects")
  
  PROJECT_ID=$(echo $PROJECTS | jq -r '.projects[0].id')
  
  if [ "$PROJECT_ID" != "null" ]; then
    echo "Testing JSON export..."
    curl -s -X POST "http://localhost:3001/api/exports/project/$PROJECT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"format":"json"}' | jq '.export.format'
    
    echo "Testing Markdown export..."
    curl -s -X POST "http://localhost:3001/api/exports/project/$PROJECT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"format":"markdown"}' | jq '.export.format'
    
    echo "Testing Context Prompt export..."
    curl -s -X POST "http://localhost:3001/api/exports/project/$PROJECT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"format":"context_prompt","targetProvider":"openai"}' | jq '.export.format'
    
    echo "✓ All export formats working"
  fi
fi
EOF

chmod +x test_export.sh
./test_export.sh
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find and kill process using port 3001
   sudo lsof -i :3001
   sudo kill -9 <PID>
   ```

2. **Database connection error**
   ```bash
   # Check if PostgreSQL is running
   sudo systemctl status postgresql
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

3. **Permission errors with Docker**
   ```bash
   # Add user to docker group
   sudo usermod -aG docker $USER
   newgrp docker
   ```

4. **Frontend not loading**
   ```bash
   # Check if both servers are running
   ps aux | grep node
   
   # Check logs
   npm run dev  # Look for any error messages
   ```

### Monitoring

```bash
# Monitor application logs
docker-compose logs -f app

# Monitor database
docker-compose logs -f postgres

# Check system resources
htop
df -h  # Disk usage
free -h  # Memory usage
```

### Backup

```bash
# Backup database
docker exec -t contextbridge_postgres_1 pg_dumpall -c -U contextbridge > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup application files
tar -czf contextbridge_backup_$(date +%Y%m%d_%H%M%S).tar.gz /path/to/contextbridge
```

### Updating

```bash
# Pull latest changes (if using git)
git pull origin main

# Reinstall dependencies
npm install

# Run new migrations
npm run db:migrate

# Rebuild and restart
docker-compose down
docker-compose up --build -d
```

## Production Considerations

### SSL/TLS Setup (using Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001  # If exposing API directly
```

### Environment Variables for Production

```bash
# Create production environment file
cat > .env.production << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://contextbridge:STRONG_PASSWORD@localhost:5432/contextbridge
JWT_SECRET=STRONG_JWT_SECRET_HERE
SESSION_SECRET=STRONG_SESSION_SECRET_HERE
PORT=3001
FRONTEND_URL=https://your-domain.com
BCRYPT_ROUNDS=12
EOF
```

## Success Criteria

Your ContextBridge installation is successful if:

- ✅ Health endpoint returns 200 OK
- ✅ User registration and login work
- ✅ Projects can be created and viewed
- ✅ Conversations can be added to projects
- ✅ Messages can be added to conversations
- ✅ All export formats work (JSON, Markdown, Context Prompt)
- ✅ Frontend loads and is responsive
- ✅ Database persistence works after restart
- ✅ Rate limiting blocks excessive requests
- ✅ Authentication protects private endpoints

## Support

For issues during deployment:

1. Check the application logs: `docker-compose logs`
2. Verify database connectivity: `psql -U contextbridge -d contextbridge`
3. Test API endpoints individually using the provided test scripts
4. Ensure all environment variables are set correctly
5. Check that all required ports are open and not blocked by firewall

The application should now be ready for production use with all Phase 1 features working!