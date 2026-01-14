#!/bin/bash

echo "Building Lateral Flow Scanner..."

# Build shared package
echo "Building shared package..."
cd shared
npm run build
cd ..

# Build backend
echo "Building backend..."
cd lateral-flow-backend
npm run build
cd ..

# Build mobile (prepare)
echo "Preparing mobile app..."
cd lateral-flow-scanner-mobile

# Android
if [ "$1" == "android" ]; then
  echo "Building Android..."
  cd android
  ./gradlew clean
  ./gradlew assembleRelease
  cd ..
fi

# iOS
if [ "$1" == "ios" ]; then
  echo "Building iOS..."
  cd ios
  xcodebuild clean
  xcodebuild -workspace LateralFlowScanner.xcworkspace \
             -scheme LateralFlowScanner \
             -configuration Release \
             -archivePath ./build/LateralFlowScanner.xcarchive \
             archive
  cd ..
fi

cd ..

echo "Build complete!"