# Sample Requests and Responses

All requests are tested against `http://localhost:5000`

---

## Health Check

**Request**
```http
GET /health
```

**Response**
```json
{
    "status": "ok",
    "message": "server is running"
}
```

---

## Vendor Management

### Create a Vendor

**Request**
```http
POST /api/v1/vendors
Content-Type: application/json

{
    "name": "VendorG",
    "description": "Voter ID verification vendor - expects voterId and name",
    "baseUrl": "http://localhost:5000",
    "endpoint": "/vendors/vendorG/verify-voter-id",
    "method": "POST",
    "authentication": { "type": "NONE", "value": "" },
    "timeout": 5000,
    "retry": { "count": 3, "delay": 1000 },
    "responseSchema": {
        "voterStatus": "string - VALID or INVALID",
        "constituency": "string",
        "verifiedAt": "string - ISO date"
    }
}
```

**Response**
```json
{
    "success": true,
    "status": "SUCCESS",
    "message": "vendor created successfully",
    "data": {
        "_id": "6a490dc898ada03a6cdc370b",
        "name": "VendorG",
        "description": "Voter ID verification vendor - expects voterId and name",
        "baseUrl": "http://localhost:5000",
        "endpoint": "/vendors/vendorG/verify-voter-id",
        "method": "POST",
        "authentication": { "type": "NONE", "value": "" },
        "timeout": 5000,
        "retry": { "count": 3, "delay": 1000 },
        "isActive": true,
        "createdAt": "2026-07-04T13:42:32.030Z",
        "updatedAt": "2026-07-04T13:42:32.030Z"
    },
    "timestamp": "2026-07-04T13:42:32.381Z"
}
```

---

### Get All Vendors

**Request**
```http
GET /api/v1/vendors
```

**Response**
```json
{
    "success": true,
    "status": "SUCCESS",
    "message": "vendors fetched successfully",
    "data": [
        {
            "_id": "6a48fdf07429c3e57021853f",
            "name": "VendorA",
            "description": "PAN verification vendor - expects panNumber and fullName",
            "baseUrl": "http://localhost:5000",
            "endpoint": "/vendors/vendorA/verify-pan",
            "method": "POST",
            "timeout": 5000,
            "retry": { "count": 3, "delay": 1000 },
            "isActive": true
        }
    ],
    "timestamp": "2026-07-04T11:20:47.678Z"
}
```

---

## API Config Management

### Create an API Config

**Request**
```http
POST /api/v1/configs
Content-Type: application/json

{
    "name": "Verify Aadhaar and Voter ID",
    "description": "verifies Aadhaar using VendorC and if verified checks Voter ID using VendorG",
    "endpoint": "/verify-aadhaar-voter",
    "method": "POST",
    "version": "v1",
    "validation": [
        {
            "field": "aadhaar",
            "required": true,
            "type": "string",
            "regex": "^[0-9]{12}$",
            "message": "aadhaar must be a 12 digit number"
        },
        {
            "field": "name",
            "required": true,
            "type": "string",
            "message": "name is required"
        },
        {
            "field": "voterId",
            "required": true,
            "type": "string",
            "regex": "^[A-Z]{3}[0-9]{7}$",
            "message": "voterId must be in valid format eg. ABC1234567"
        }
    ],
    "workflow": [
        {
            "step": 1,
            "vendor": "6a48fdf07429c3e570218541",
            "requestMapping": { "aadhaar": "aadhaarNumber", "name": "name" },
            "responseMapping": { "status": "aadhaarStatus", "verifiedAt": "aadhaarVerifiedAt" },
            "condition": { "field": null, "operator": null, "value": null },
            "parallel": false,
            "onFailure": "STOP"
        },
        {
            "step": 2,
            "vendor": "6a490dc898ada03a6cdc370b",
            "requestMapping": { "voterId": "voterId", "name": "name" },
            "responseMapping": { "voterStatus": "voterStatus", "constituency": "constituency", "verifiedAt": "voterVerifiedAt" },
            "condition": { "field": "aadhaarStatus", "operator": "eq", "value": "VERIFIED" },
            "parallel": false,
            "onFailure": "STOP"
        }
    ]
}
```

**Response**
```json
{
    "success": true,
    "status": "SUCCESS",
    "message": "api config created successfully",
    "data": {
        "_id": "6a490e9698ada03a6cdc370c",
        "name": "Verify Aadhaar and Voter ID",
        "endpoint": "/verify-aadhaar-voter",
        "method": "POST",
        "version": "v1",
        "isActive": true,
        "createdAt": "2026-07-04T13:45:58.113Z"
    },
    "timestamp": "2026-07-04T13:45:58.181Z"
}
```

---

## Orchestrated Endpoints

### 1. Verify PAN — Success

**Request**
```http
POST /api/v1/verify-pan
Content-Type: application/json

{
    "pan": "ABCDE1234F",
    "name": "Revanth Kumar"
}
```

**Response**
```json
{
    "success": true,
    "status": "SUCCESS",
    "message": "workflow executed successfully",
    "data": {
        "status": "VALID",
        "confidence": 98
    },
    "timestamp": "2026-07-04T11:22:06.744Z"
}
```

---

### 2. Verify PAN — Validation Error (invalid format)

**Request**
```http
POST /api/v1/verify-pan
Content-Type: application/json

{
    "pan": "INVALID123",
    "name": "Revanth Kumar"
}
```

**Response**
```json
{
    "success": false,
    "status": "VALIDATION_FAILED",
    "message": "validation failed",
    "errors": [
        {
            "field": "pan",
            "message": "pan must be in valid format eg. ABCDE1234F"
        }
    ],
    "timestamp": "2026-07-04T11:23:08.560Z"
}
```

---

### 3. Verify PAN — Validation Error (missing fields)

**Request**
```http
POST /api/v1/verify-pan
Content-Type: application/json

{}
```

**Response**
```json
{
    "success": false,
    "status": "VALIDATION_FAILED",
    "message": "validation failed",
    "errors": [
        {
            "field": "pan",
            "message": "pan must be in valid format eg. ABCDE1234F"
        },
        {
            "field": "name",
            "message": "name is required"
        }
    ],
    "timestamp": "2026-07-04T12:57:26.222Z"
}
```

---

### 4. Verify Aadhaar — Success

**Request**
```http
POST /api/v1/verify-aadhaar
Content-Type: application/json

{
    "aadhaar": "327017735022",
    "name": "Revanth Kumar"
}
```

**Response**
```json
{
    "success": true,
    "status": "SUCCESS",
    "message": "workflow executed successfully",
    "data": {
        "verificationStatus": "VERIFIED",
        "verifiedAt": "2026-07-04T13:06:08.547Z"
    },
    "timestamp": "2026-07-04T13:06:08.613Z"
}
```

---

### 5. Verify Document — 3-Step Pipeline (OCR → Fraud Detection → Face Match)

**Request**
```http
POST /api/v1/verify-document
Content-Type: application/json

{
    "documentBase64": "dGVzdGRvY3VtZW50",
    "selfieBase64": "dGVzdHNlbGZpZQ=="
}
```

**Response**
```json
{
    "success": true,
    "status": "SUCCESS",
    "message": "workflow executed successfully",
    "data": {
        "name": "Sample User",
        "documentNumber": "ABCDE1234F",
        "documentType": "PAN",
        "ocrConfidence": 92,
        "ocrStatus": "EXTRACTED",
        "fraudScore": 12,
        "riskLevel": "LOW",
        "isFlagged": false,
        "faceMatched": true,
        "similarity": 94.5,
        "faceMatchStatus": "MATCH"
    },
    "timestamp": "2026-07-04T13:06:57.733Z"
}
```

---

### 6. Verify Aadhaar and Voter ID — Multi-Step (manually configured)

**Request**
```http
POST /api/v1/verify-aadhaar-voter
Content-Type: application/json

{
    "aadhaar": "327017735022",
    "name": "Revanth Kumar",
    "voterId": "ABC1234567"
}
```

**Response**
```json
{
    "success": true,
    "status": "SUCCESS",
    "message": "workflow executed successfully",
    "data": {
        "aadhaarStatus": "VERIFIED",
        "aadhaarVerifiedAt": "2026-07-04T13:46:51.032Z",
        "voterStatus": "VALID",
        "constituency": "Sample Constituency",
        "voterVerifiedAt": "2026-07-04T13:46:52.647Z"
    },
    "timestamp": "2026-07-04T13:46:52.708Z"
}
```

---

## AI Agent

### Generate Config from Natural Language

**Request**
```http
POST /api/v1/agent/generate-config
Content-Type: application/json

{
    "prompt": "Create an API that verifies PAN using VendorA and if successful runs fraud detection using VendorE"
}
```

**Response**
```json
{
    "success": true,
    "status": "SUCCESS",
    "message": "Workflow generated successfully",
    "data": {
        "name": "Verify PAN and Detect Fraud",
        "description": "validates a PAN using VendorA and runs fraud detection using VendorE if successful",
        "endpoint": "/verify-pan-fraud",
        "method": "POST",
        "version": "v1",
        "validation": [
            {
                "field": "pan",
                "required": true,
                "type": "string",
                "regex": "^[A-Z]{5}[0-9]{4}[A-Z]{1}$",
                "message": "pan must be in valid format"
            },
            {
                "field": "name",
                "required": true,
                "type": "string",
                "message": "name is required"
            }
        ],
        "workflow": [
            {
                "step": 1,
                "vendor": { "name": "VendorA", "endpoint": "/vendors/vendorA/verify-pan" },
                "requestMapping": { "pan": "panNumber", "name": "fullName" },
                "responseMapping": { "verificationStatus": "panVerificationStatus", "score": "panConfidenceScore" },
                "condition": { "field": null, "operator": null, "value": null },
                "onFailure": "STOP"
            },
            {
                "step": 2,
                "vendor": { "name": "VendorE", "endpoint": "/vendors/vendorE/fraud-detect" },
                "requestMapping": { "name": "name", "pan": "documentNumber" },
                "responseMapping": { "fraudScore": "fraudScore", "riskLevel": "riskLevel", "flagged": "isFlaggedForFraud" },
                "condition": { "field": "panVerificationStatus", "operator": "eq", "value": "VALID" },
                "onFailure": "CONTINUE"
            }
        ],
        "isActive": true,
        "_id": "6a4906e39f7bcd1e09a75944",
        "createdAt": "2026-07-04T13:13:07.439Z"
    },
    "timestamp": "2026-07-04T13:13:07.553Z"
}
```

---

### Execute AI-Generated Endpoint

**Request**
```http
POST /api/v1/verify-pan-fraud
Content-Type: application/json

{
    "pan": "ABCDE1234F",
    "name": "Revanth Kumar"
}
```

**Response**
```json
{
    "success": true,
    "status": "SUCCESS",
    "message": "workflow executed successfully",
    "data": {
        "panVerificationStatus": "VALID",
        "panConfidenceScore": 98,
        "fraudScore": 12,
        "riskLevel": "LOW",
        "isFlaggedForFraud": false
    },
    "timestamp": "2026-07-04T13:14:11.739Z"
}
```

---

## Edge Cases

### Unknown Endpoint

**Request**
```http
POST /api/v1/verify-something-random
Content-Type: application/json

{ "pan": "ABCDE1234F" }
```

**Response**
```json
{
    "success": false,
    "status": "FAILED",
    "message": "no configuration found for POST /verify-something-random",
    "timestamp": "2026-07-04T12:58:34.994Z"
}
```

---

### Wrong HTTP Method

**Request**
```http
GET /api/v1/verify-pan
```

**Response**
```json
{
    "success": false,
    "status": "FAILED",
    "message": "no configuration found for GET /verify-pan",
    "timestamp": "2026-07-04T13:01:09.763Z"
}
```

---

### Aadhaar with Letters

**Request**
```http
POST /api/v1/verify-aadhaar
Content-Type: application/json

{
    "aadhaar": "ABCDEFGHIJKL",
    "name": "Revanth Kumar"
}
```

**Response**
```json
{
    "success": false,
    "status": "VALIDATION_FAILED",
    "message": "validation failed",
    "errors": [
        {
            "field": "aadhaar",
            "message": "aadhaar must be a 12 digit number"
        }
    ],
    "timestamp": "2026-07-04T12:59:49.352Z"
}
```

---

### Duplicate Endpoint via AI Agent

**Request**
```http
POST /api/v1/agent/generate-config
Content-Type: application/json

{
    "prompt": "Create an API that verifies Aadhaar using VendorC and if verified runs face match using VendorF"
}
```

**Response** (when endpoint already exists)
```json
{
    "success": false,
    "status": "FAILED",
    "message": "endpoint already exists",
    "timestamp": "2026-07-04T13:09:46.996Z"
}
```