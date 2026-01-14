# Lateral Flow Scanner Backend API

Enterprise-level backend API for the Lateral Flow Scanner mobile application.

## Features

- 🔐 JWT Authentication
- 📸 Image Upload to Cloudflare R2
- 💾 MongoDB for Metadata Storage
- 🚀 Redis Caching
- 📊 Kafka Event Streaming
- ✅ Input Validation with Zod
- 📝 Comprehensive Logging
- 🔒 Security Best Practices
- 📈 Performance Optimized

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express + TypeScript
- **Database**: MongoDB (Atlas)
- **Cache**: Redis (Upstash)
- **Storage**: Cloudflare R2
- **Queue**: Kafka
- **Validation**: Zod
- **Logging**: Winston
- **Process Manager**: PM2

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 7+
- Redis 7+
- Kafka (optional)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run migrations
npm run migrate:up

# Seed development data (optional)
npm run seed

# Start development server
npm run dev
```

### Production

```bash
# Build
npm run build

# Start with PM2
npm run start:prod
```

## Environment Variables

```env
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/lateral_flow_scanner

# Redis
REDIS_URL=redis://localhost:6379

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=lateral-flow-captures
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Kafka
KAFKA_BROKERS=localhost:9092
```

## API Documentation

API documentation is available at `/api-docs` when the server is running.

### Authentication

All protected endpoints require a Bearer token:
```
Authorization: Bearer <access_token>
```

### Endpoints

#### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout user

#### Captures
- `POST /api/capture/upload` - Upload capture
- `GET /api/capture/:id` - Get capture
- `GET /api/capture/list` - List captures
- `DELETE /api/capture/:id` - Delete capture

#### Concentration Batches
- `POST /api/concentration/create` - Create batch
- `PUT /api/concentration/:id` - Update batch
- `DELETE /api/concentration/:id` - Delete batch
- `GET /api/concentration/list` - List batches

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Deployment

### Docker

```bash
# Build image
docker build -t lateral-flow-backend .

# Run with Docker Compose
docker-compose up -d
```

### PM2

```bash
npm run start:prod
```

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
├── validators/      # Input validators
└── server.ts        # Entry point
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md)

## License

MIT License - See [LICENSE](../LICENSE)