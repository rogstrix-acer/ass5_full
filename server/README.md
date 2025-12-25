# Signature Engine API

The backend service for the Signature Injection Engine. It handles PDF manipulation, file storage, and audit logging.

## API Endpoints

### `POST /api/pdf/sign`

Accepts a PDF and signature placement details, returning the signed PDF URL.

**Request Body:**
```json
{
  "pdfBase64": "data:application/pdf;base64,...",
  "signatureImage": "data:image/png;base64,...",
  "pageIndex": 0,
  "x": 20,
  "y": 30,
  "width": 20,
  "height": 5,
  "isPercentage": true
}
```

**Response:**
```json
{
  "message": "PDF signed successfully",
  "fileUrl": "/uploads/signed_123456789.pdf",
  "auditId": "60d5ec..."
}
```

### `GET /health`

Health check endpoint.
```json
{ "status": "ok" }
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 8000) |
| `MONGODB_URI` | MongoDB connection string |

## Directory Structure

-   `src/controllers`: Request logic
-   `src/models`: Mongoose database models
-   `src/routes`: API route definitions
-   `src/config`: Database configuration
-   `uploads`: Stores generated PDFs
