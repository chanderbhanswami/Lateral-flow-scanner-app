# Setup Guide - Lateral Flow Scanner

## Prerequisites

### Required Software
- **Node.js** 18+ and npm/yarn
- **React Native CLI** (not Expo)
- **Android Studio** (for Android development)
- **Xcode 14+** (for iOS development, macOS only)
- **CocoaPods** (for iOS dependencies)
- **MongoDB** 7+
- **Redis** 7+
- **Docker** (optional, for containerized services)

### System Requirements
- **macOS** (for iOS development)
- **Windows/Linux/macOS** (for Android development)
- Minimum 16GB RAM recommended
- 20GB free disk space

## Mobile App Setup

### 1. Clone Repository
```bash
git clone 
cd lateral-flow-scanner-mobile
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
API_BASE_URL=https://api.yourapp.com
SENTRY_DSN=your_sentry_dsn
```

### 4. iOS Setup (macOS only)
```bash
cd ios
pod install
cd ..
```

### 5. Android Setup
1. Open Android Studio
2. Configure SDK (API 23+)
3. Create/import debug keystore
4. Set ANDROID_HOME environment variable

### 6. Run App

**iOS:**
```bash
npm run ios
# or specify simulator
npx react-native run-ios --simulator="iPhone 15 Pro"
```

**Android:**
```bash
npm run android
# or specify device
npx react-native run-android --device="device-id"
```

## Backend Setup

### 1. Navigate to Backend
```bash
cd lateral-flow-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/lateral_flow_scanner
REDIS_URL=redis://localhost:6379
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
# ... more configurations
```

### 4. Start Services

**Option A: Local Installation**
```bash
# Start MongoDB
mongod --dbpath=/path/to/data

# Start Redis
redis-server

# Start Kafka (if needed)
# Follow Kafka installation guide
```

**Option B: Docker**
```bash
docker-compose up -d
```

### 5. Run Backend
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Development Workflow

### Mobile Development
```bash
# Start Metro bundler
npm start

# Run on device
npm run android
npm run ios

# Debug
npm run android -- --variant=debug
npm run ios -- --configuration Debug

# Release builds
npm run android -- --variant=release
npm run ios -- --configuration Release
```

### Backend Development
```bash
# Development with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm test
```

## Troubleshooting

### iOS Issues

**Pod install fails:**
```bash
cd ios
pod deintegrate
pod cache clean --all
pod install
```

**Build fails:**
```bash
cd ios
xcodebuild clean
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

### Android Issues

**Gradle sync fails:**
```bash
cd android
./gradlew clean
./gradlew --stop
rm -rf ~/.gradle/caches/
```

**Metro bundler cache:**
```bash
npm start -- --reset-cache
```

### Backend Issues

**MongoDB connection fails:**
- Check MongoDB is running
- Verify connection string
- Check network/firewall

**Redis connection fails:**
- Verify Redis is running
- Check port availability
- Test connection: `redis-cli ping`

## Testing

### Mobile Tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

### Backend Tests
```bash
npm test
npm run test:watch
npm run test:e2e
```

## Deployment

### Mobile App

**iOS:**
1. Archive in Xcode
2. Upload to App Store Connect
3. Submit for review

**Android:**
1. Generate signed APK/AAB
2. Upload to Google Play Console
3. Submit for review

### Backend

**Docker:**
```bash
docker build -t lateral-flow-backend .
docker push your-registry/lateral-flow-backend
```

**PM2:**
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Additional Resources

- [React Native Documentation](https://reactnative.dev)
- [VisionCamera Docs](https://react-native-vision-camera.com)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Cloudflare R2](https://developers.cloudflare.com/r2)

---