# API Documentation

## Base URL
```
https://api.lateralflowscanner.com/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": 604800
  }
}
```

#### POST /auth/login
Login user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** Same as register

#### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### Captures

#### POST /capture/upload
Upload a new capture.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "captureData": {
    "id": "uuid",
    "timestamp": "2024-01-01T00:00:00Z",
    "concentration": "100 mg/mL",
    "concentrationBatchId": "batch_id",
    "cameraMetadata": {},
    "exifData": {},
    "sensorData": {},
    "analysisData": {},
    "deviceInfo": {},
    "captureMode": "auto",
    "notes": "Optional notes"
  },
  "imageBase64": "base64_encoded_image"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "captureId": "uuid",
    "imageUrl": "https://r2.../image.jpg",
    "uploadedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /capture/:id
Get capture by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "captureId": "uuid",
    "userId": "user_id",
    "timestamp": "2024-01-01T00:00:00Z",
    "imageUrl": "https://...",
    "concentration": "100 mg/mL",
    "status": "uploaded",
    // ... more fields
  }
}
```

#### GET /capture/list
List user captures.

**Query Parameters:**
- `page` (default: 1)
- `pageSize` (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

### Concentration Batches

#### POST /concentration/create
Create concentration batch.

**Request:**
```json
{
  "name": "High Concentration",
  "concentration": "100",
  "unit": "mg/mL",
  "description": "Optional description",
  "color": "#3b82f6"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "batch_id",
    "name": "High Concentration",
    "concentration": "100",
    "unit": "mg/mL",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /concentration/list
List concentration batches.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "batch_id",
      "name": "High Concentration",
      "concentration": "100",
      "unit": "mg/mL"
    }
  ]
}
```

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "statusCode": 400
  }
}
```

### Error Codes
- `VALIDATION_ERROR` (400)
- `AUTHENTICATION_ERROR` (401)
- `AUTHORIZATION_ERROR` (403)
- `NOT_FOUND` (404)
- `INTERNAL_ERROR` (500)

## Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes
- Upload endpoints: 10 requests per minute
- Other endpoints: 100 requests per 15 minutes

---