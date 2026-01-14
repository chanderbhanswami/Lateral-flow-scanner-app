#!/bin/bash

echo "Setting up Lateral Flow Scanner..."

# Check Node.js version
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt "18" ]; then
  echo "Error: Node.js 18+ is required"
  exit 1
fi

# Install mobile dependencies
echo "Installing mobile app dependencies..."
cd lateral-flow-scanner-mobile
npm install

# Install iOS pods (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Installing iOS dependencies..."
  cd ios
  pod install
  cd ..
fi

cd ..

# Install backend dependencies
echo "Installing backend dependencies..."
cd lateral-flow-backend
npm install
cd ..

# Install shared dependencies
echo "Installing shared dependencies..."
cd shared
npm install
npm run build
cd ..

# Setup environment files
echo "Setting up environment files..."
cp lateral-flow-scanner-mobile/.env.example lateral-flow-scanner-mobile/.env
cp lateral-flow-backend/.env.example lateral-flow-backend/.env

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env files with your configuration"
echo "2. Start MongoDB and Redis"
echo "3. Run 'npm run dev' in backend folder"
echo "4. Run 'npm run android' or 'npm run ios' in mobile folder"