# Architecture Overview

## System Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │
         │ HTTPS/REST
         ↓
┌─────────────────┐      ┌──────────────┐
│   API Gateway   │◄─────┤   Redis      │
│   (Express)     │      │   (Cache)    │
└────────┬────────┘      └──────────────┘
         │
         ├──────────────┬──────────────┐
         ↓              ↓              ↓
┌────────────┐  ┌──────────────┐  ┌──────────────┐
│  MongoDB   │  │  Cloudflare  │  │   Kafka      │
│  (Metadata)│  │     R2       │  │  (Queue)     │
└────────────┘  │  (Storage)   │  └──────────────┘
                └──────────────┘
```

## Mobile App Architecture

### Layer Structure
```
Presentation Layer (UI)
  ├── Screens
  ├── Components
  └── Navigation

Business Logic Layer
  ├── Hooks
  ├── Services
  └── State Management

Data Layer
  ├── API Clients
  ├── Local Storage
  └── Caching

Native Layer
  ├── Camera Module
  ├── Sensor Module
  └── Image Processing
```

### Key Components

**Camera System:**
- VisionCamera for native camera access
- Frame processors for real-time analysis
- Native modules for advanced features

**Sensor Integration:**
- Accelerometer, Gyroscope for alignment
- Light sensor for exposure guidance
- Proximity sensor for object detection

**Image Processing:**
- OpenCV for border detection
- Custom algorithms for blur detection
- Histogram analysis for exposure

**State Management:**
- Zustand for global state
- React Query for server state
- MMKV for persistent storage

## Backend Architecture

### Service Architecture
```
API Layer
  ├── Controllers
  ├── Routes
  └── Middleware

Business Logic Layer
  ├── Services
  ├── Validators
  └── Jobs

Data Layer
  ├── Models
  ├── Schemas
  └── Repositories
```

### Key Services

**Storage Service (R2):**
- High-performance object storage
- CDN-backed delivery
- Automatic EXIF preservation

**Database (MongoDB):**
- Document storage for metadata
- Flexible schema for sensor data
- Indexed for fast queries

**Cache (Redis):**
- Session management
- API response caching
- Rate limiting

**Queue (Kafka):**
- Async image processing
- Event streaming
- Scalable processing

## Data Flow

### Capture Flow
```
1. User initiates capture
   ↓
2. Real-time sensor monitoring
   ↓
3. Frame processor analyzes quality
   ↓
4. Auto/manual capture trigger
   ↓
5. Image + metadata processing
   ↓
6. EXIF embedding
   ↓
7. Upload to R2
   ↓
8. Metadata to MongoDB
   ↓
9. Kafka event for processing
   ↓
10. Processing complete
```

### Authentication Flow
```
1. User login
   ↓
2. Validate credentials
   ↓
3. Generate JWT tokens
   ↓
4. Store refresh token
   ↓
5. Return access token
   ↓
6. Client stores tokens
   ↓
7. Include in requests
   ↓
8. Token refresh when expired
```

## Security

### Mobile App
- Secure token storage (Keychain/Keystore)
- Certificate pinning
- Code obfuscation
- No sensitive data in logs

### Backend
- JWT authentication
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection
- CORS configuration

## Scalability

### Horizontal Scaling
- Stateless API servers
- Load balancer ready
- Session in Redis
- Queue-based processing

### Performance Optimization
- Image CDN delivery
- API response caching
- Database indexing
- Connection pooling

## Monitoring

### Logging
- Winston for structured logs
- Log aggregation
- Error tracking

### Monitoring
- Sentry for error tracking
- Performance metrics
- Uptime monitoring

---