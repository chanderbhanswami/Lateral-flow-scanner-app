# Lateral Flow Scanner - Complete Project Structure

This document provides a comprehensive overview of the entire project hierarchy.

## Repository Root

```
LateralFlowScanner/
├── .editorconfig
├── .git/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .gitignore
├── .vscode/
├── LICENSE
├── README.md
├── package.json
│
├── docs/                                    # Project Documentation
├── scripts/                                 # Build & Deployment Scripts
├── Shared/                                  # Shared TypeScript Library
├── LateralFlowScannerBackend/              # Node.js/Express Backend
└── LateralFlowScannerMobile/               # React Native Mobile App
```

---

## 📁 docs/

```
docs/
├── API.md                    # API documentation
├── ARCHITECTURE.md           # System architecture overview
├── CHANGELOG.md              # Version history
├── CODE_OF_CONDUCT.md        # Community guidelines
├── CONTRIBUTING.md           # Contribution guidelines
├── DEPLOYMENT.md             # Deployment instructions
├── PERFORMANCE.md            # Performance optimization notes
├── PROJECT_STRUCTURE.md      # This file
├── PROJECT_SUMMARY.md        # Project summary
├── ROADMAP.md                # Future development plans
├── SECURITY.md               # Security policies
├── SETUP.md                  # Setup instructions
└── TESTING.md                # Testing guidelines
```

---

## 📁 scripts/

```
scripts/
├── build.sh                  # Build automation script
├── deploy.sh                 # Deployment script
├── setup.sh                  # Environment setup script
└── test.sh                   # Test runner script
```

---

## 📁 Shared/

Shared TypeScript library containing common types, schemas, and utilities used by both backend and mobile apps.

```
Shared/
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── dist/                     # Compiled output (git-ignored)
├── node_modules/             # Dependencies (git-ignored)
└── src/
    ├── index.ts              # Main export file
    │
    ├── constants/
    │   └── index.ts
    │
    ├── schemas/
    │   ├── capture.schema.ts
    │   ├── concentration.schema.ts
    │   └── metadata.schema.ts
    │
    ├── types/
    │   ├── api.types.ts
    │   ├── capture.types.ts
    │   ├── index.ts
    │   ├── metadata.types.ts
    │   └── sensor.types.ts
    │
    └── utils/
        └── validation.ts
```

---

## 📁 LateralFlowScannerBackend/

Node.js/Express backend with MongoDB, Redis, and Cloudflare R2 integration.

```
LateralFlowScannerBackend/
├── .dockerignore
├── .env.development
├── .env.example
├── .env.production
├── .eslintrc.js
├── .gitignore
├── .prettierrc.js
├── Dockerfile
├── README.md
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── ecosystem.config.js       # PM2 configuration
├── errors.txt
├── jest.config.js
├── jest.e2e.config.js
├── jest.e2e.setup.ts
├── nginx.conf
├── nodemon.json
├── package.json
├── package-lock.json
├── service-account.json      # Firebase service account
├── tsconfig.json
│
├── certs/
│   └── ca.pem
│
├── dist/                     # Compiled output (git-ignored)
├── logs/                     # Application logs (git-ignored)
├── node_modules/             # Dependencies (git-ignored)
│
└── src/
    ├── instrument.ts         # Sentry instrumentation
    ├── server.ts             # Express server entry point
    │
    ├── config/
    │   ├── database.ts       # MongoDB configuration
    │   ├── env.ts            # Environment variables
    │   ├── initWorkers.ts    # Background worker initialization
    │   ├── kafka.ts          # Kafka configuration
    │   ├── r2.ts             # Cloudflare R2 configuration
    │   ├── redis.ts          # Redis configuration
    │   └── swagger.ts        # Swagger/OpenAPI configuration
    │
    ├── controllers/
    │   ├── auth.controller.ts
    │   ├── capture.controller.ts
    │   ├── concentration.controller.ts
    │   ├── health.controller.ts
    │   ├── notification.controller.ts
    │   ├── statistics.controller.ts
    │   └── user.controller.ts
    │
    ├── jobs/
    │   ├── cleanup.job.ts
    │   ├── imageProcessing.job.ts
    │   └── statistics.job.ts
    │
    ├── middleware/
    │   ├── audit.middleware.ts
    │   ├── auth.middleware.ts
    │   ├── compression.middleware.ts
    │   ├── cors.middleware.ts
    │   ├── error.middleware.ts
    │   ├── logger.middleware.ts
    │   ├── rateLimit.middleware.ts
    │   ├── security.middleware.ts
    │   ├── upload.middleware.ts
    │   └── validation.middleware.ts
    │
    ├── migrations/
    │   ├── 001_initial_setup.ts
    │   └── run.ts
    │
    ├── models/
    │   ├── AuditLog.model.ts
    │   ├── CameraMetadata.model.ts
    │   ├── Capture.model.ts
    │   ├── ConcentrationBatch.model.ts
    │   ├── Notification.model.ts
    │   └── User.model.ts
    │
    ├── routes/
    │   ├── auth.routes.ts
    │   ├── capture.routes.ts
    │   ├── concentration.routes.ts
    │   ├── health.routes.ts
    │   ├── index.ts
    │   ├── notification.routes.ts
    │   ├── statistics.routes.ts
    │   ├── swagger.routes.ts
    │   └── user.routes.ts
    │
    ├── scripts/              # Utility scripts
    │
    ├── seeds/
    │   └── development.seed.ts
    │
    ├── services/
    │   ├── audit.service.ts
    │   ├── auth.service.ts
    │   ├── capture.service.ts
    │   ├── email.service.ts
    │   ├── kafka.service.ts
    │   ├── notification.service.ts
    │   ├── r2.service.ts
    │   ├── redis.service.ts
    │   ├── supabaseAudit.service.ts
    │   └── webhook.service.ts
    │
    ├── types/
    │   ├── express.d.ts
    │   └── index.ts
    │
    ├── utils/
    │   ├── cache-keys.ts
    │   ├── crypto.ts
    │   ├── error.ts
    │   ├── helpers.ts
    │   ├── logger.ts
    │   ├── monitoring.ts
    │   ├── pagination.ts
    │   ├── serialization.ts
    │   └── validation.ts
    │
    └── validators/
        ├── auth.validator.ts
        ├── capture.validator.ts
        ├── concentration.validator.ts
        └── user.validator.ts
```

---

## 📁 LateralFlowScannerMobile/

React Native mobile application with Vision Camera, OpenCV, and native modules.

```
LateralFlowScannerMobile/
├── .bundle/
├── .env.development
├── .env.example
├── .env.production
├── .eslintrc.js
├── .gitignore
├── .prettierrc.js
├── .vscode/
├── .watchmanconfig
├── Gemfile
├── README.md
├── app.json
├── babel.config.js
├── generateHash.js           # Android Key Hash generator
├── hermes_path.txt
├── index.js                  # App entry point
├── jest.config.js
├── jest.setup.js
├── metro.config.js
├── package.json
├── package-lock.json
├── react-native.config.js
├── tsconfig.json
│
├── __tests__/                # Jest tests
├── assets/                   # Static assets
├── node_modules/             # Dependencies (git-ignored)
├── patches/                  # Patch files for dependencies
│
├── android/                  # Android Native Code
├── ios/                      # iOS Native Code
│
└── src/                      # React Native Source Code
```

### src/ - React Native Application Source

```
src/
├── App.tsx                   # Root application component
├── App.tsx.backup
│
├── api/
│   ├── auth.api.ts
│   ├── capture.api.ts
│   ├── client.ts             # Axios client configuration
│   ├── concentration.api.ts
│   ├── endpoints.ts
│   ├── index.ts
│   ├── interceptors.ts       # Request/Response interceptors
│   └── statistics.api.ts
│
├── components/
│   ├── Camera/
│   │   ├── BorderGuide.tsx
│   │   ├── CameraControls.tsx
│   │   ├── CameraOverlay.tsx
│   │   ├── CameraView.tsx
│   │   ├── CaptureButton.tsx
│   │   ├── ExposureMeter.tsx
│   │   ├── ExposureSlider.tsx
│   │   ├── FocusIndicator.tsx
│   │   └── HistogramDisplay.tsx
│   │
│   ├── ConcentrationBatch/
│   │   ├── BatchForm.tsx
│   │   ├── BatchItem.tsx
│   │   ├── BatchList.tsx
│   │   └── BatchSelector.tsx
│   │
│   ├── Guides/
│   │   ├── GuideOverlay.tsx
│   │   ├── InstructionCard.tsx
│   │   └── WarningBanner.tsx
│   │
│   ├── Sensors/
│   │   ├── AlignmentIndicator.tsx
│   │   ├── ExposureMeter.tsx
│   │   ├── HistogramView.tsx
│   │   └── SensorDisplay.tsx
│   │
│   └── UI/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Loading.tsx
│       ├── Logo.tsx
│       ├── Modal.tsx
│       ├── Select.tsx
│       └── Toast.tsx
│
├── config/
│   ├── analytics.config.ts
│   ├── api.config.ts
│   ├── app.config.ts
│   ├── camera.config.ts
│   ├── env.ts                # Environment configuration
│   └── toast.config.tsx
│
├── constants/
│   ├── api.constants.ts
│   ├── camera.constants.ts
│   ├── index.ts
│   ├── sensor.constants.ts
│   └── validation.constants.ts
│
├── hooks/
│   ├── useAppState.ts
│   ├── useAuth.ts
│   ├── useBorderDetection.ts
│   ├── useCamera.ts
│   ├── useCapture.ts
│   ├── useConcentrationBatch.ts
│   ├── useDebounce.ts
│   ├── useFrameProcessor.ts
│   ├── useImageAnalysis.ts
│   ├── useImagePicker.ts
│   ├── useMetadata.ts
│   ├── useNetworkStatus.ts
│   ├── usePermissions.ts
│   ├── usePrevious.ts
│   ├── useSensors.ts
│   └── useThrottle.ts
│
├── native/
│   ├── CameraMetadata.ts
│   ├── ExifModule.ts
│   ├── ImageProcessing.ts
│   └── SensorModule.ts
│
├── navigation/
│   ├── AppNavigator.tsx
│   ├── AuthNavigator.tsx
│   ├── MainNavigator.tsx
│   └── types.ts
│
├── screens/
│   ├── CaptureScreen.tsx
│   ├── ChangePasswordScreen.tsx
│   ├── ConcentrationManagementScreen.tsx
│   ├── ForgotPasswordScreen.tsx
│   ├── GuideScreen.tsx
│   ├── HistoryScreen.tsx
│   ├── HomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── NotificationScreen.tsx
│   ├── OTPVerificationScreen.tsx
│   ├── RegisterScreen.tsx
│   ├── ResetPasswordScreen.tsx
│   ├── ReviewScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── StatisticsScreen.tsx
│   └── index.ts
│
├── services/
│   ├── auth.service.ts
│   ├── camera.service.ts
│   ├── capture.service.ts
│   ├── colorCalibration.service.ts
│   ├── depthSensing.service.ts
│   ├── imageProcessing.service.ts
│   ├── initialization.service.ts
│   ├── metadata.service.ts
│   ├── network.service.ts
│   ├── notification.service.ts
│   ├── obstructionDetection.service.ts
│   ├── sensor.service.ts
│   ├── storage.service.ts
│   ├── sync.service.ts
│   └── upload.service.ts
│
├── store/
│   ├── authStore.ts
│   ├── captureStore.ts
│   ├── concentrationStore.ts
│   ├── index.ts
│   └── sensorStore.ts
│
├── theme/
│   └── colors.ts
│
├── types/
│   ├── camera.types.ts
│   └── index.ts
│
└── utils/
    ├── analytics.ts
    ├── cache.ts
    ├── datetime.ts
    ├── error.ts
    ├── filesystem.ts
    ├── helpers.ts
    ├── index.ts
    ├── logger.ts
    ├── network.ts
    ├── permissions.ts
    ├── retry.ts
    ├── validation.ts
    │
    ├── analysis/
    │   ├── alignment.ts
    │   ├── blur.ts
    │   ├── border.ts
    │   ├── color.ts
    │   ├── exposure.ts
    │   ├── reflection.ts
    │   └── shadow.ts
    │
    ├── camera/
    │   ├── exposure.ts
    │   ├── focus.ts
    │   ├── histogram.ts
    │   ├── metadata.ts
    │   └── whiteBalance.ts
    │
    ├── image/
    │   ├── compression.ts
    │   ├── exif.ts
    │   ├── processing.ts
    │   ├── quality.ts
    │   └── validation.ts
    │
    └── sensors/
        ├── accelerometer.ts
        ├── gyroscope.ts
        ├── lightSensor.ts
        └── proximity.ts
```

### android/ - Android Native Code

```
android/
├── build.gradle              # Root build configuration
├── gradle.properties         # Gradle properties
├── gradlew                   # Gradle wrapper script
├── gradlew.bat               # Gradle wrapper (Windows)
├── local.properties
├── settings.gradle
├── build_log.txt
│
├── .gradle/                  # Gradle cache
├── .kotlin/                  # Kotlin cache
├── build/                    # Build output (git-ignored)
│
├── gradle/
│   └── wrapper/
│       └── gradle-wrapper.properties
│
└── app/
    ├── build.gradle          # App build configuration
    ├── debug.keystore
    ├── my-release-key.keystore
    ├── google-services.json  # Firebase configuration
    ├── proguard-rules.pro
    │
    ├── build/                # Build output (git-ignored)
    │
    ├── cmake/
    │   └── hermes-engine-config.cmake
    │
    └── src/
        └── main/
            ├── AndroidManifest.xml
            │
            ├── assets/
            │
            ├── java/
            │   └── com/
            │       └── lateralflowscannermobile/
            │           ├── MainActivity.kt
            │           ├── MainApplication.kt
            │           │
            │           └── modules/
            │               ├── CameraMetadataModule.java
            │               ├── DepthSensorModule.java
            │               ├── DepthSensorModulePackage.java
            │               ├── ExifModule.java
            │               ├── ImageProcessingModule.java
            │               ├── NativeUtilsModule.java
            │               ├── OpenCVModule.java
            │               └── SensorModule.java
            │
            └── res/
                ├── drawable/
                ├── mipmap-anydpi-v26/
                ├── mipmap-hdpi/
                ├── mipmap-mdpi/
                ├── mipmap-xhdpi/
                ├── mipmap-xxhdpi/
                ├── mipmap-xxxhdpi/
                ├── values/
                │   ├── colors.xml
                │   ├── strings.xml
                │   └── styles.xml
                └── values-v31/
```

### ios/ - iOS Native Code

```
ios/
├── .xcode.env
├── GoogleService-Info.plist  # Firebase configuration
├── Podfile
│
├── LateralFlowScannerMobile.xcodeproj/
│   └── project.pbxproj
│
└── LateralFlowScannerMobile/
    ├── AppDelegate.h
    ├── AppDelegate.mm
    ├── AppDelegate.swift
    ├── Info.plist
    ├── LaunchScreen.storyboard
    ├── PrivacyInfo.xcprivacy
    ├── main.m
    │
    ├── Images.xcassets/
    │   ├── Contents.json
    │   ├── AppIcon.appiconset/
    │   └── SplashIcon.imageset/
    │
    └── Modules/
        ├── CameraMetadataModule.h
        ├── CameraMetadataModule.m
        ├── DepthSensorModule.h
        ├── DepthSensorModule.m
        ├── ExifModule.h
        ├── ExifModule.m
        ├── ImageProcessingModule.h
        ├── ImageProcessingModule.m
        ├── NativeUtilsModule.h
        ├── NativeUtilsModule.m
        ├── OpenCVModule.h
        ├── OpenCVModule.mm
        ├── SensorModule.h
        └── SensorModule.m
```

---

## Summary Statistics

| Component | Directories | Files |
|-----------|-------------|-------|
| **Root** | 8 | 5 |
| **docs/** | 0 | 13 |
| **scripts/** | 0 | 4 |
| **Shared/** | 7 | 16 |
| **Backend (src/)** | 13 | 72 |
| **Mobile (src/)** | 17 | 146 |
| **Mobile (android/)** | 15+ | 20+ |
| **Mobile (ios/)** | 5+ | 24 |

**Total Estimated Files:** 300+
**Total Estimated Directories:** 65+
