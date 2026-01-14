# Shared Package

This package contains shared types, schemas, and utilities used by both the mobile app and backend API.

## Structure

```
shared/
├── src/
│   ├── schemas/          # Zod validation schemas
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Shared utility functions
│   └── constants/        # Shared constants
├── package.json
├── tsconfig.json
└── README.md
```

## Usage

### Mobile App

```typescript
import { captureDataSchema, validateData } from '@lateral-flow/shared';

const result = validateData(captureDataSchema, data);
```

### Backend

```typescript
import { captureDataSchema } from '@lateral-flow/shared';

// Use in validators
```

## Installation

```bash
npm install
npm run build
```

## Development

```bash
npm run build:watch
```

## Testing

```bash
npm test
```