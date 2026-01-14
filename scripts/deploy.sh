#!/bin/bash

# Build and deploy script

echo "Building Lateral Flow Scanner..."

# Build mobile app
echo "Building mobile app..."
cd lateral-flow-scanner-mobile

# Android
echo "Building Android..."
cd android
./gradlew assembleRelease
cd ..

# iOS (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Building iOS..."
  cd ios
  xcodebuild -workspace LateralFlowScanner.xcworkspace \
             -scheme LateralFlowScanner \
             -configuration Release \
             -archivePath ./build/LateralFlowScanner.xcarchive \
             archive
  cd ..
fi

cd ..

# Build backend
echo "Building backend..."
cd lateral-flow-backend
npm run build

echo "Deploying backend..."
docker build -t lateral-flow-backend .
docker push your-registry/lateral-flow-backend:latest

cd ..

echo "Deployment complete!"