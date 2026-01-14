# Deployment Guide

## Prerequisites

- Docker installed
- Access to MongoDB Atlas
- Access to Cloudflare R2
- Redis instance (Upstash or self-hosted)
- Kafka cluster (optional)

## Environment Setup

### 1. MongoDB Atlas

1. Create a cluster at https://cloud.mongodb.com
2. Create a database user
3. Whitelist your IP addresses
4. Get connection string

### 2. Cloudflare R2

1. Log in to Cloudflare dashboard
2. Go to R2 Object Storage
3. Create a new bucket
4. Generate API token with R2 permissions
5. Note your Account ID, Access Key, and Secret Key

### 3. Redis (Upstash)

1. Sign up at https://upstash.com
2. Create a new Redis database
3. Copy the connection URL

## Backend Deployment

### Docker Deployment

```bash
# Build image
docker build -t lateral-flow-backend .

# Run container
docker run -d \
  -p 3000:3000 \
  --env-file .env.production \
  --name lateral-flow-backend \
  lateral-flow-backend
```

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Build
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Mobile App Deployment

### Android

1. **Generate signing key:**
```bash
keytool -genkeypair -v -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure gradle.properties:**
```
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=*****
MYAPP_UPLOAD_KEY_PASSWORD=*****
```

3. **Build release APK:**
```bash
cd android
./gradlew assembleRelease
```

4. **Upload to Google Play Console**

### iOS

1. **Archive in Xcode:**
   - Product → Archive
   - Validate App
   - Distribute App

2. **Upload to App Store Connect**

3. **Submit for Review**

## Environment Variables

### Backend (.env.production)
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
JWT_SECRET=...
```

### Mobile (.env)
```env
API_BASE_URL=https://api.yourdomain.com
SENTRY_DSN=...
```

## Health Checks

```bash
# Check API health
curl https://api.yourdomain.com/api/health

# Check specific services
curl https://api.yourdomain.com/api/health/detailed
```

## Monitoring

### Sentry Setup

1. Create project at https://sentry.io
2. Get DSN
3. Add to environment variables
4. Deploy

### Logs

```bash
# PM2 logs
pm2 logs lateral-flow-backend

# Docker logs
docker logs lateral-flow-backend -f
```

## Backup Strategy

### Database Backup

```bash
# MongoDB backup
mongodump --uri="mongodb+srv://..." --out=./backup

# Restore
mongorestore --uri="mongodb+srv://..." ./backup
```

### R2 Backup

Configure lifecycle rules in Cloudflare R2 dashboard.

## Scaling

### Horizontal Scaling

1. Deploy multiple backend instances
2. Use load balancer (nginx, AWS ALB)
3. Configure session affinity if needed

### Database Scaling

1. Use MongoDB Atlas auto-scaling
2. Configure read replicas
3. Implement connection pooling

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] API keys rotated
- [ ] Database backups automated
- [ ] Monitoring and alerting set up
- [ ] Security headers configured

## Rollback Procedure

```bash
# PM2 rollback
pm2 reload ecosystem.config.js --update-env

# Docker rollback
docker pull lateral-flow-backend:previous-tag
docker stop lateral-flow-backend
docker run ... lateral-flow-backend:previous-tag
```