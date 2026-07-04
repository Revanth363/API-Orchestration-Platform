# Architecture

## Overview

The API Orchestration Platform is a configuration-driven backend system that allows new API integrations to be created by adding database records — without changing application code.

The core idea is simple. Instead of writing a new controller for every vendor integration, you define a workflow in MongoDB. The engine reads it, maps the fields, calls the vendors, handles retries and conditions, and returns a clean standardized response.

---

## High Level Flow

```
Client Request
      │
      ▼
Express Server — Generic Route Handler (router.all('*'))
      │
      ▼
Config Loader
      │  ├── In-Memory Cache (60s TTL)
      │  ├── Redis Cache (Upstash or local)
      │  └── MongoDB Atlas — ApiConfig Collection
      │
      ▼
Workflow Engine  ← heart of the platform
      │
      ├── Validator          — regex and type checks on incoming request
      ├── Request Mapper     — client field names → vendor field names
      ├── Vendor Caller      — axios HTTP call with retry logic
      ├── Response Mapper    — vendor field names → client field names
      ├── Condition Checker  — should the next step run?
      └── Response Aggregator — merges all step results
      │
      ▼
Execution Logger → MongoDB Atlas — ExecutionLog Collection
      │
      ▼
Standard Response Builder
      │
      ▼
Client Response
```

---

## Folder Structure

```
api-orchestration-platform/
│
├── config/          # MongoDB connection with retry logic
├── models/          # ApiConfig, Vendor, ExecutionLog schemas
├── middleware/      # Global error handler
│
├── engine/          # Core workflow engine
│   ├── WorkflowEngine.js      # orchestrates all steps
│   ├── Validator.js           # request validation
│   ├── RequestMapper.js       # client → vendor field mapping
│   ├── ResponseMapper.js      # vendor → client field mapping
│   ├── ConditionChecker.js    # between-step condition evaluation
│   ├── VendorCaller.js        # axios + retry logic
│   └── ResponseAggregator.js  # combines multi-step results
│
├── routes/          # index.js + generic + config + vendor + agent
├── controllers/     # configController, vendorController, agentController
├── services/        # configLoader (with cache), executionLogger, redisClient
├── agents/          # ConfigGenerator — AI agent (Gemini 2.5 Flash)
├── vendors/         # mock vendor endpoints (simulates third-party APIs)
├── utils/           # logger, responseBuilder, requestId
├── constants/       # status codes, step types
├── seed/            # database seed scripts
└── docs/            # architecture, API reference, sample requests
```

---

## MongoDB Collections

### Vendor
Stores third-party vendor details. Decoupled from API configs so vendor details are updated in one place.

```json
{
    "name": "VendorA",
    "description": "PAN verification vendor",
    "baseUrl": "http://localhost:5000",
    "endpoint": "/vendors/vendorA/verify-pan",
    "method": "POST",
    "headers": {},
    "authentication": { "type": "NONE", "value": "" },
    "timeout": 5000,
    "retry": { "count": 3, "delay": 1000 },
    "responseSchema": {
        "verificationStatus": "string - VALID or INVALID",
        "score": "number - confidence score 0 to 100"
    },
    "isActive": true
}
```

### ApiConfig
Defines the workflow — what endpoint to expose, how to validate the request, which vendors to call, and how to map fields.

```json
{
    "name": "Verify PAN",
    "endpoint": "/verify-pan",
    "method": "POST",
    "version": "v1",
    "validation": [
        {
            "field": "pan",
            "required": true,
            "type": "string",
            "regex": "^[A-Z]{5}[0-9]{4}[A-Z]{1}$",
            "message": "pan must be in valid format eg. ABCDE1234F"
        }
    ],
    "workflow": [
        {
            "step": 1,
            "vendor": "<VendorA ObjectId>",
            "requestMapping": { "pan": "panNumber", "name": "fullName" },
            "responseMapping": { "verificationStatus": "status", "score": "confidence" },
            "condition": { "field": null, "operator": null, "value": null },
            "parallel": false,
            "onFailure": "STOP"
        }
    ],
    "isActive": true
}
```

### ExecutionLog
Stores a full trace of every request — each step's input, output, retry count, duration, and final status.

```json
{
    "requestId": "req_uuid",
    "apiConfigId": "<ObjectId>",
    "endpoint": "/verify-pan",
    "method": "POST",
    "status": "SUCCESS",
    "originalRequest": { "pan": "ABCDE1234F", "name": "Revanth" },
    "finalResponse": { "status": "VALID", "confidence": 98 },
    "steps": [
        {
            "step": 1,
            "vendor": "<VendorA ObjectId>",
            "status": "SUCCESS",
            "requestPayload": { "panNumber": "ABCDE1234F", "fullName": "Revanth" },
            "responsePayload": { "verificationStatus": "VALID", "score": 98 },
            "retryAttempts": 0,
            "startedAt": "2026-07-04T10:00:00.000Z",
            "completedAt": "2026-07-04T10:00:00.300Z",
            "duration": 300
        }
    ],
    "startedAt": "2026-07-04T10:00:00.000Z",
    "completedAt": "2026-07-04T10:00:00.310Z",
    "totalDuration": 310
}
```

---

## Workflow Engine

The heart of the platform. It is a pure orchestrator — it does not know what PAN or Aadhaar is. It only knows how to execute steps.

```
execute(apiConfig, requestData, requestId)
      │
      ├── validate request once
      │
      └── for each step:
            ├── check condition → should this step run?
            ├── map request fields → client format to vendor format
            ├── call vendor → axios with retry
            ├── map response fields → vendor format to client format
            ├── update context → next step can use this step's output
            └── check onFailure → STOP / CONTINUE / SKIP
      │
      └── aggregate all step results → final response
```

### Context Object

A single object flows through every step and holds everything:

```javascript
context = {
    requestId,
    apiConfig,
    originalRequest,
    currentData,      // updated after each step so next step can use previous output
    stepResults,
    finalResponse,
    status,
    error,
    startedAt,
    completedAt
}
```

### Condition Checking

Supported operators: `eq`, `neq`, `gt`, `lt`, `exists`, `contains`

Example — Step 2 only runs if Step 1 returned VALID:
```json
{
    "condition": {
        "field": "status",
        "operator": "eq",
        "value": "VALID"
    }
}
```

### onFailure Behavior

| Value | Behavior |
|---|---|
| `STOP` | halt the entire workflow |
| `CONTINUE` | log the failure, move to next step |
| `SKIP` | log the failure, continue to next step |

---

## Caching

Two-layer cache to avoid hitting MongoDB on every request:

```
Request comes in
      │
      ▼
In-Memory Cache (Map) — 60 second TTL
      │ miss
      ▼
Redis Cache (Upstash or local) — 60 second TTL
      │ miss
      ▼
MongoDB Atlas
      │
      └── warm both caches before returning
```

Cache is invalidated automatically when a config is updated or deactivated.

---

## Retry Logic

Built into `VendorCaller.js`. Configured per vendor.

```
Vendor call fails
      │
      ├── 4xx error → do NOT retry (bad request won't fix itself)
      │
      └── 5xx / network error → wait retryDelay ms → retry
            │
            └── if maxRetries exhausted → return failure to engine
```

Each attempt is logged with vendor name, attempt number, and status code.

---

## AI Agent

`agents/ConfigGenerator.js` uses Gemini 2.5 Flash to convert natural language prompts into valid ApiConfig JSON.

```
User types:
"Create an API that verifies Aadhaar using VendorC and
 if verified runs face match using VendorF"
      │
      ▼
Gemini reads available vendors + their response schemas
      │
      ▼
Gemini generates ApiConfig JSON with correct field mappings
      │
      ▼
agentController validates every field and mapping
      │
      ▼
Vendor names resolved to ObjectIds
      │
      ▼
Saved to MongoDB — endpoint is now live
```

### Agent Validation Layers

```
1. validateConfigShape()   — checks structure, types, operators
2. resolveVendorIds()      — checks response mappings against vendor responseSchema
3. ApiConfig.create()      — mongoose schema validation
4. duplicate check         — prevents same endpoint being created twice
```

### Limitation

The agent generates endpoint names from the prompt. Two similar prompts may generate different endpoint names creating near-duplicate configs. A production system would include a human review step before saving.

---

## Mock Vendors

Six mock vendor endpoints simulate real third-party services. Each has a different request format, response format, and latency. They have a 15% random failure rate so retry logic gets exercised during testing.

| Vendor | Endpoint | Latency | Failure Rate | Purpose |
|---|---|---|---|---|
| VendorA | `/vendors/vendorA/verify-pan` | 300ms | 15% | PAN verification |
| VendorB | `/vendors/vendorB/verify-pan` | 1200ms | 15% | PAN verification (alt format) |
| VendorC | `/vendors/vendorC/verify-aadhaar` | 800ms | 15% | Aadhaar verification |
| VendorD | `/vendors/vendorD/ocr-extract` | 2000ms | 15% | OCR extraction |
| VendorE | `/vendors/vendorE/fraud-detect` | 1500ms | 15% | Fraud detection |
| VendorF | `/vendors/vendorF/face-match` | 1800ms | 15% | Face match |

Different latencies make execution logs meaningful. Different request/response formats demonstrate why field mapping exists.

---

## Adding a New Integration

No code changes. Two API calls.

```
POST /api/v1/vendors     → register the vendor
POST /api/v1/configs     → define the workflow
```

Or one natural language prompt:

```
POST /api/v1/agent/generate-config
{ "prompt": "Create an API that..." }
```

The new endpoint is live immediately.

---

## Design Decisions

**Why a single generic route?**
`router.all('*')` catches every request. The route doesn't know what PAN or Aadhaar is — it just loads a config and hands it to the engine. Adding a new integration never touches routing code.

**Why separate Vendor and ApiConfig collections?**
Normalization. If VendorA changes its URL, one document update affects all workflows that use VendorA. Without separation you'd update every config individually.

**Why soft deletes?**
`isActive: false` instead of `deleteOne()`. ExecutionLogs reference vendor and config ObjectIds — hard deletes would break historical logs.

**Why context object pattern?**
A single object flowing through every step makes multi-step orchestration clean. Step 2 can use Step 1's output because `context.currentData` is updated after every step. No global state, no passing 10 parameters between functions.

**Why validate once before the workflow starts?**
Client request validation happens once at entry. The workflow engine doesn't re-validate between steps — it trusts that context.currentData is valid because it was built from validated input and mapped vendor responses.