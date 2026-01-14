#!/bin/bash

echo "Running tests..."

# Mobile tests
echo "Testing mobile app..."
cd lateral-flow-scanner-mobile
npm test -- --coverage
MOBILE_EXIT=$?

cd ..

# Backend tests
echo "Testing backend..."
cd lateral-flow-backend
npm test -- --coverage
BACKEND_EXIT=$?

cd ..

# Check results
if [ $MOBILE_EXIT -ne 0 ] || [ $BACKEND_EXIT -ne 0 ]; then
  echo "Tests failed!"
  exit 1
fi

echo "All tests passed!"
exit 0