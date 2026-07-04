# API Orchestration Platform

A configuration-driven API orchestration platform that lets you define, map, and execute REST API workflows without writing business logic for each integration.

Instead of hardcoding every vendor integration, you define a workflow in the database. The engine reads it, maps the fields, calls the vendors, and returns a clean response.

---

## The Core Idea

Most companies integrate with 10-50 different vendors — KYC providers, payment gateways, fraud engines, OCR services. Each vendor has a different request format, different response format, and different authentication.

Without an orchestration platform, you write a new controller for every vendor.

With this platform, you add a configuration to the database. No code changes.

```
Client Request
      │
      ▼
Generic Route Handler
      │
      ▼
Load Config from MongoDB
      │
      ▼
Workflow Engine
      ├── Validate Request
      ├── Map Request Fields      (client format → vendor format)
      ├── Call Vendor API         (with retry logic)
      ├── Map Response Fields     (vendor format → client format)
      └── Check Conditions        (should next step run?)
      │
      ▼
Aggregate Results
      │
      ▼
Log Execution
      │
      ▼
Standardized Response
```

---

## Features

- **Configuration-driven architecture** —business workflows are defined in MongoDB rather than hardcoded in controllers.
- **Dynamic API creation** — define endpoints through database configuration, no code changes
- **Request/response field mapping** — translate field names between client and vendor formats
- **Multi-step orchestration** — chain multiple vendor calls in a single workflow
- **Conditional execution** — step 2 only runs if step 1 returned what you expected
- **Retry mechanism** — automatically retries failed vendor calls with configurable delay
- **Validation** — regex and type-based validation on incoming requests
- **Execution logging** — every request logs each step's input, output, duration, and retry count
- **Redis-backed caching** — configs are cached in Redis with an in-memory fallback to avoid hitting MongoDB on every request
- **Soft deletes** — deactivating a config preserves execution history
- **Standardized responses** — every response follows the same structure regardless of vendor
- **HTTP API invocation** — dynamically invoke external vendor APIs based on workflow configuration
- **AI config generator** — generate complete API configurations from natural language prompts using Gemini 2.5 Flash
- **Docker support** — containerized deployment using Docker and Docker Compose

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| HTTP Client | Axios |
| Retry Logic | axios-retry |
| Logging | Winston |
| Cache | Redis |
| AI | Gemini 2.5 Flash |
| Containerization | Docker / Docker Compose |
| Environment | dotenv |

---

## Project Structure

```
api-orchestration-platform/
│
├── config/          # MongoDB connection
├── models/          # ApiConfig, Vendor, ExecutionLog schemas
├── middleware/      # Global error handler
├── engine/          # Core workflow engine (heart of the project)
│   ├── WorkflowEngine.js
│   ├── Validator.js
│   ├── RequestMapper.js
│   ├── ResponseMapper.js
│   ├── ConditionChecker.js
│   ├── VendorCaller.js
│   └── ResponseAggregator.js
├── routes/          # Generic route + CRUD routes
├── controllers/     # Config and vendor controllers
├── services/        # Config loader, Redis cache client, execution logger
├── vendors/         # Mock vendor APIs (simulates third-party services)
├── agents/          # AI agent for natural language config generation
├── utils/           # Logger, response builder, request ID generator
├── constants/       # Status codes, step types
├── seed/            # Database seed scripts
└── docs/            # Architecture and API reference
```

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Revanth363/api-orchestration-platform.git
cd api-orchestration-platform
npm install
```

### 2. Setup environment

```bash
cp .env.example .env
```

Open `.env` and add your MongoDB Atlas connection string, Redis settings, and Gemini API key:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
PORT=5000
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
NODE_ENV=development
```

If `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` are set, the app uses Upstash Redis. Otherwise it falls back to `REDIS_URL`.

If `GEMINI_API_KEY` is set, the agent endpoint can generate workflow configs from natural language prompts.

### 3. Seed the database

```bash
npm run seed
```

This runs two scripts in order:
- `seed/vendors.js` — creates six mock vendors
- `seed/apiConfig.js` — creates three workflow configurations

### 4. Start the server

```bash
# development
npm run dev

# production
npm start
```

Server starts on `http://localhost:5000`

### 5. Run with Docker

```bash
docker compose up
```

The compose file starts the app, MongoDB, and Redis together. The app talks to MongoDB at `mongo:27017` and Redis at `redis:6379` inside the Docker network.

If `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` are present in your `.env`, the app will prefer Upstash Redis even when started through Docker. Otherwise it will use the Redis container defined in the compose file.

If you want to seed data into the Dockerized database, run the seed scripts from your host against the same MongoDB URI or add a one-off seed container.

---

## How It Works

### MongoDB Collections

**Vendor** — stores vendor details (URL, auth, timeout, retry config)

**ApiConfig** — stores workflow definition (endpoint, validation rules, steps with mappings)

**ExecutionLog** — stores every execution with step-by-step detail

### The Workflow Engine

This is the heart of the project. When a request comes in:

1. The generic route receives the incoming request through the dynamic routing layer.
2. Config loader fetches the matching ApiConfig from MongoDB (or cache)
3. WorkflowEngine validates the request
4. For each workflow step:
   - Checks condition — should this step run?
   - Maps request fields — client format → vendor format
   - Calls vendor API with retry logic
   - Maps response fields — vendor format → client format
   - Updates context so the next step can use this step's output
5. ResponseAggregator combines all step results
6. ExecutionLogger saves the full trace to MongoDB
7. Client gets a clean standardized response

### Field Mapping

Client sends:
```json
{ "pan": "ABCDE1234F", "name": "Revanth" }
```

Config says:
```json
{ "requestMapping": { "pan": "panNumber", "name": "fullName" } }
```

Vendor receives:
```json
{ "panNumber": "ABCDE1234F", "fullName": "Revanth" }
```

Same logic applies to responses. No code change — only configuration.

---

## API Reference

### Management APIs

#### Vendors

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/vendors` | Create a vendor |
| GET | `/api/v1/vendors` | List all vendors |
| GET | `/api/v1/vendors/:id` | Get vendor by ID |
| PUT | `/api/v1/vendors/:id` | Update vendor |
| DELETE | `/api/v1/vendors/:id` | Deactivate vendor |

#### API Configs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/configs` | Create an API config |
| GET | `/api/v1/configs` | List all configs |
| GET | `/api/v1/configs/:id` | Get config by ID |
| PUT | `/api/v1/configs/:id` | Update config |
| DELETE | `/api/v1/configs/:id` | Deactivate config |

#### Agentic AI Bonus

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/agent/generate-config` | Generate and save an ApiConfig from a natural-language prompt |

Request:

```json
{
    "prompt": "Create an API that validates a PAN using VendorA and, if successful, performs fraud detection using VendorE."
}
```

The endpoint uses Gemini 2.5 Flash to generate an `ApiConfig`, resolves vendor names to MongoDB ObjectIds, validates the generated structure, and stores the config in MongoDB.

### Orchestrated APIs (defined by configuration)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/verify-pan` | PAN verification via VendorA |
| POST | `/api/v1/verify-aadhaar` | Aadhaar verification via VendorC |
| POST | `/api/v1/verify-document` | Document pipeline — OCR → Fraud Detection → Face Match |

---

## Sample Requests

### Verify PAN

```http
POST /api/v1/verify-pan
Content-Type: application/json

{
    "pan": "ABCDE1234F",
    "name": "Revanth Kumar"
}
```

Response:
```json
{
    "success": true,
    "status": "SUCCESS",
    "message": "workflow executed successfully",
    "data": {
        "status": "VALID",
        "confidence": 98
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Verify Aadhaar

```http
POST /api/v1/verify-aadhaar
Content-Type: application/json

{
    "aadhaar": "123456789012",
    "name": "Revanth Kumar"
}
```

### Verify Document (multi-step)

```http
POST /api/v1/verify-document
Content-Type: application/json

{
    "documentBase64": "base64encodedstring",
    "selfieBase64": "base64encodedstring"
}
```

Response:
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
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Validation Error

```http
POST /api/v1/verify-pan
Content-Type: application/json

{
    "pan": "INVALID",
    "name": "Revanth"
}
```

Response:
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
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Adding a New Integration

No code changes needed. Just add a vendor and a config to the database.

**Step 1 — Create the vendor:**

```http
POST /api/v1/vendors
Content-Type: application/json

{
    "name": "GST Vendor",
    "description": "GST verification vendor",
    "baseUrl": "https://api.gstvendor.com",
    "endpoint": "/verify",
    "method": "POST",
    "headers": { "x-api-key": "your-key-here" },
    "authentication": { "type": "API_KEY", "value": "your-key-here" },
    "timeout": 5000,
    "retry": { "count": 3, "delay": 1000 }
}
```

**Step 2 — Create the API config:**

```http
POST /api/v1/configs
Content-Type: application/json

{
    "name": "Verify GST",
    "endpoint": "/verify-gst",
    "method": "POST",
    "validation": [
        {
            "field": "gstin",
            "required": true,
            "type": "string",
            "regex": "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$",
            "message": "gstin format is invalid"
        }
    ],
    "workflow": [
        {
            "step": 1,
            "vendor": "<vendor-id>",
            "requestMapping": { "gstin": "gstNumber" },
            "responseMapping": { "status": "verificationStatus" },
            "onFailure": "STOP"
        }
    ]
}
```

After creating the vendor and API configuration, `POST /api/v1/verify-gst` becomes available without modifying the application code. 


---

## Mock Vendors

The project includes six mock vendor endpoints that simulate real third-party services. Each has a different request format, response format, and latency. They also have a 15% random failure rate so the retry logic gets exercised during testing.

| Vendor | Endpoint | Latency | Purpose |
|---|---|---|---|
| VendorA | `/vendors/vendorA/verify-pan` | 300ms | PAN verification |
| VendorB | `/vendors/vendorB/verify-pan` | 1200ms | PAN verification (alt format) |
| VendorC | `/vendors/vendorC/verify-aadhaar` | 800ms | Aadhaar verification |
| VendorD | `/vendors/vendorD/ocr-extract` | 2000ms | OCR extraction |
| VendorE | `/vendors/vendorE/fraud-detect` | 1500ms | Fraud detection |
| VendorF | `/vendors/vendorF/face-match` | 1800ms | Face match |

---

## AI Agent

`agents/ConfigGenerator.js` converts natural language into workflow configuration using Gemini 2.5 Flash.

Current capabilities:
- Convert natural language prompts into ApiConfig JSON
- Validate the generated structure before saving
- Resolve vendor names to MongoDB ObjectIds
- Save the generated config to MongoDB

---

## Future Enhancements

- Parallel workflow execution
- Visual workflow editor
- OAuth/JWT authentication
- Metrics dashboard
- Kubernetes deployment
- CI/CD pipeline

---

