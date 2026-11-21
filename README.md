# Reward API — Complete System Documentation

Backend API for a full-stack Reward/Affiliate Management System.  
Stack: **Node.js + Express + MongoDB (Mongoose)**

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Setup & Environment](#setup--environment)
3. [System Architecture & Flow](#system-architecture--flow)
4. [MongoDB Collections & Schema](#mongodb-collections--schema)
5. [API Reference](#api-reference)
6. [cURL Examples](#curl-examples)
7. [Financial Flow](#financial-flow)
8. [Security & Fraud Prevention](#security--fraud-prevention)
9. [Edge Cases](#edge-cases)
10. [Permissions Matrix](#permissions-matrix)

---

## Project Structure

```
Reward_api/
├── server.js                          # Entry point — registers all routes
├── package.json
├── .env
│
└── src/
    ├── config/
    │   ├── config.js                  # Environment variables
    │   ├── db.js                      # MongoDB connection
    │   └── mongoWrapper.js            # Connection pooling wrapper
    │
    ├── constants/
    │   ├── enums.js                   # USER_TYPE_ADMIN, USER_TYPE_USER, etc.
    │   └── log_constants.js
    │
    ├── middleware/
    │   ├── auth.middleware.js         # JWT verify + token cache
    │   └── permission.js             # Role-based permission map
    │
    ├── models/
    │   ├── user.model.js
    │   ├── campaign.model.js          # Advertiser campaign (events + fraud settings)
    │   ├── offer.model.js             # User-facing offer (linked 1:1 to campaign)
    │   ├── tracking.model.js          # Every click + conversion lifecycle
    │   ├── revenue.model.js           # Platform margin per conversion
    │   ├── transaction.model.js       # User wallet credit/debit history
    │   ├── wallet.model.js            # User balance
    │   ├── withdrawal.model.js        # Withdrawal requests
    │   ├── postbackLog.model.js       # Raw postback audit log
    │   ├── banner.model.js
    │   ├── appConfig.model.js
    │   └── upload.model.js
    │
    ├── repositories/
    │   ├── campaign.repo.js
    │   ├── offer.repo.js
    │   ├── transaction.repo.js
    │   ├── wallet.repo.js
    │   ├── withdrawal.repo.js
    │   └── user.repo.js
    │
    ├── services/
    │   ├── campaign.service.js
    │   ├── offer.service.js           # Core: click, redirect, postback, reward
    │   ├── conversion.service.js      # Manual approval, revenue summary
    │   ├── wallet.service.js
    │   ├── withdrawal.service.js
    │   ├── user.service.js
    │   ├── fcm.service.js
    │   ├── banner.service.js
    │   ├── appConfig.service.js
    │   └── upload.service.js
    │
    ├── controllers/
    │   ├── campaign.controller.js
    │   ├── offer.controller.js
    │   ├── conversion.controller.js
    │   ├── wallet.controller.js
    │   ├── withdrawal.controller.js
    │   ├── user.controller.js
    │   ├── banner.controller.js
    │   ├── appConfig.controller.js
    │   └── upload.controller.js
    │
    ├── routes/
    │   ├── campaign.route.js
    │   ├── offer.route.js
    │   ├── conversion.route.js
    │   ├── wallet.route.js
    │   ├── withdrawal.route.js
    │   ├── user.route.js
    │   ├── banner.route.js
    │   ├── appConfig.route.js
    │   └── upload.route.js
    │
    └── utility/
        ├── logger.js                  # Winston + daily rotate
        ├── responseHelper.js          # setSuccess, setBadRequest, etc.
        ├── multer.js
        └── s3.utility.js
```

---

## Setup & Environment

### 1. Install dependencies
```bash
npm install
```

### 2. Create `.env`
```env
PORT=5000
STAGE=staging

MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/rewarddb

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

BASE_URL=http://localhost:5000

FCM_SERVICE_ACCOUNT={"type":"service_account",...}

AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=your_bucket

LOG_MAX_FILES=14d
```

### 3. Start server
```bash
npm start        # production (nodemon)
npm run dev      # development
```

### 4. Health check
```bash
curl http://localhost:5000/health
# {"status":"ok","service":"Reward API"}
```

---

## System Architecture & Flow

### End-to-End Lifecycle

```
ADMIN PANEL (PHP)                     EXPRESS API (Node.js + MongoDB)
─────────────────                     ─────────────────────────────────

1. Admin creates Campaign  ──POST──▶  /v1/admin/campaigns
   (advertiser payouts,
    fraud rules, events)

2. Admin creates Offer     ──POST──▶  /v1/admin/offers
   (user rewards per event,
    linked to campaign 1:1)
                                             │
                                             ▼
                                ┌────────────────────────┐
                                │    USER MOBILE APP     │
                                └────────────────────────┘

3. User browses offers     ◀──GET───  /v1/offers
   (userCompletionStatus shown)

4. User taps offer         ──POST──▶  /v1/offers/:offerId/click
   (returns trackingUrl + clickId)

5. User visits trackingUrl ──GET───▶  /track/:offerId/:userId?cid=CLICK_ID
   tracking: clicked → pending        Tokens replaced in campaign URL
   Redirects to advertiser URL        Jumper logic applied if enabled

6. User installs app / completes task on advertiser platform
        │
        ▼
7. Advertiser sends postback ──GET─▶  /postback?cid=CLICK_ID&secret=KEY&event=NAME

   Postback validation chain:
   ├─ Find click by clickId
   ├─ Validate secret key
   ├─ IP whitelist gate
   ├─ Same-click-IP fraud block
   ├─ Conversion delay gate
   ├─ Device deduplication
   ├─ Match event → get user reward + advertiser amount
   │
   ├─ [Manual approval] → status: pending_approval
   │       │
   │       ▼
   │  Admin reviews → /v1/admin/conversions/pending
   │  Admin approves → /v1/admin/conversions/:id/approve
   │       │
   └─ [Auto approval] ──────────────────────────────┐
                                                     ▼
                                        status: completed
                                        wallet.addRupees(userReward)
                                        Transaction.create (credit)
                                        Revenue.create (margin record)
                                        FCM push notification
                                        Fire advertiser S2S callback

8. User checks wallet      ──GET───▶  /v1/wallet/me
                                       /v1/wallet/stats
                                       /v1/wallet/transactions
                                       /v1/wallet/offer-history

9. User withdraws          ──POST──▶  /v1/withdrawals
   Admin processes         ──PATCH──▶ /v1/withdrawals/:id/status
```

### Creation Rules (from PHP logic)

- **Campaign must be created before Offer**
- **One Offer per Campaign** — creating a second offer for the same campaign is blocked
- **Campaign must be `active`** to create an offer
- Offer inherits event **names** from the campaign but sets its own **payout amounts** (user rewards)
- Campaign event `payout` = what advertiser pays **us** (revenue)
- Offer event `payout` = what we pay **user** (cost)
- `margin = campaign.event.payout − offer.event.payout`

---

## MongoDB Collections & Schema

### `campaigns`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | MongoDB auto |
| `name` | String | required |
| `imageUrl` | String | required |
| `previewUrl` | String | optional |
| `description` | String | optional |
| `campaignUrl` | String | required — supports tokens: `{click_id}`, `{user_id}`, `{campaign_id}`, `{p1}`–`{p6}`, `{gaid}` |
| `category` | enum | business \| education \| entertainment \| fantasy \| finance \| food \| gaming \| loan \| news \| photography \| productivity \| shopping \| travel |
| `model` | enum | CPA \| CPD \| CPG \| CPI \| CPL \| CPR \| CPRT \| CPS \| CPT \| CPV |
| `status` | enum | active \| inactive |
| `events[]` | Array | min 1, max 6 events |
| `events[].name` | String | event label e.g. "App Install" |
| `events[].objective` | enum | CPA \| CPI \| ... |
| `events[].cap` | Number | max conversions for this event |
| `events[].payout` | Number | INR — what advertiser pays **us** |
| `events[].order` | Number | 1–6 |
| `conversionApproval` | enum | automatic \| manual |
| `needApproval` | Boolean | extra manual gate |
| `sameClickIpBlock` | Boolean | block if click IP = conversion IP |
| `sameConversionIpBlock` | Boolean | |
| `conversionDelayEnabled` | Boolean | |
| `conversionDelayMinutes` | enum | 3 \| 5 \| 10 \| 15 \| 30 \| 60 |
| `ipWhitelistEnabled` | Boolean | |
| `ipWhitelist[]` | String | allowed postback IPs |
| `uniqueId` | String | UUID, unique |
| `isDeleted` | Boolean | soft delete |
| `createdAt`, `updatedAt` | Date | auto |

---

### `offers`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `campaignId` | ObjectId → Campaign | **UNIQUE** — one offer per campaign |
| `offerName` | String | auto-copied from campaign.name |
| `offerId` | String | 6-char code, unique |
| `events[]` | Array | mirrors campaign events |
| `events[].eventName` | String | from campaign |
| `events[].payout` | Number | INR — what **we pay user** |
| `events[].order` | Number | 1–6 |
| `inputEnabled` | Boolean | show custom input fields to user |
| `inputs[]` | Array | max 3 — `{type, title, order}` |
| `steps` | String | comma-separated "how to" steps |
| `termsAndConditions` | String | |
| `referTermsAndConditions` | String | |
| `comment` | String | payout description |
| `status` | enum | active \| inactive \| paused \| expired |
| `oneUpiOneTime` | Boolean | same UPI = one completion |
| `offerDisplay` | Boolean | show on public user app |
| `jumperEnabled` | Boolean | redirect % of traffic to alternate URL |
| `jumperRatio` | Number | percentage (0–100) |
| `jumperUrl` | String | alternate destination |
| `jumperClickCount` | Number | counter |
| `totalCap` | Number | max total completions |
| `dailyCap` | Number | max completions per day |
| `completionsPerUser` | Number | default 1 |
| `currentInstalls` | Number | incremented on each completion |
| `startDate`, `endDate` | Date | optional schedule |
| `postbackSecretKey` | String | UUID — must match `?secret=` param |
| `advertiserPostbackUrl` | String | we fire this after crediting user |
| `priority` | Number | higher = shown first |
| `isActive`, `isDeleted` | Boolean | |

---

### `trackings`

Every click and its full lifecycle.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `clickId` | String | UUID, unique — echoed in advertiser URL as `?cid=` |
| `userId` | ObjectId → User | |
| `offerId` | ObjectId → Offer | |
| `campaignId` | ObjectId → Campaign | denormalized for fast queries |
| `status` | enum | `clicked` → `pending` → `pending_approval` → `completed` \| `rejected` \| `fraud` |
| `completedEvent` | String | which event fired e.g. "App Install" |
| `ipAddress` | String | click IP |
| `conversionIp` | String | postback IP |
| `deviceId` | String | for deduplication |
| `userRewardINR` | Number | snapshot at click time |
| `advertiserAmount` | Number | snapshot at click time |
| `amountAwarded` | Number | actual credited amount |
| `postbackReceived` | Boolean | |
| `postbackRawQuery` | Object | full raw query for audit |
| `clickedAt` | Date | |
| `redirectedAt` | Date | when user was sent to advertiser |
| `conversionDate` | Date | when postback arrived |
| `adminNote` | String | approval/rejection reason |

---

### `revenues`

Platform's financial record — one document per completed conversion.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `trackingId` | ObjectId → Tracking | **unique** |
| `offerId` | ObjectId → Offer | |
| `campaignId` | ObjectId → Campaign | |
| `userId` | ObjectId → User | |
| `advertiserAmount` | Number | what advertiser paid us (INR) |
| `userReward` | Number | what we paid user (INR) |
| `margin` | Number | `advertiserAmount − userReward` |
| `eventName` | String | |
| `status` | enum | pending \| settled \| reversed |
| `settledAt`, `reversedAt` | Date | |

---

### `transactions`

User wallet credit/debit history.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `userId` | ObjectId → User | |
| `amount` | Number | positive = credit, negative = debit |
| `type` | enum | credit \| debit |
| `category` | enum | task_completion \| referral_bonus \| daily_checkin \| withdrawal \| admin_adjustment |
| `referenceId` | ObjectId | points to Tracking or Withdrawal |
| `refModel` | enum | Tracking \| User \| Withdrawal |
| `status` | enum | success \| pending \| failed |
| `remarks` | String | human-readable note |

---

### `wallets`

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | unique |
| `balance` | Number | INR — total credited balance |
| `totalEarned` | Number | lifetime earnings |
| `totalWithdrawn` | Number | lifetime withdrawals |
| `pendingWithdrawal` | Number | held during pending withdrawal |
| `availableBalance` | Number | `balance − pendingWithdrawal` |
| `isActive` | Boolean | |

---

### `withdrawals`

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | |
| `amount` | Number | INR |
| `method` | enum | upi \| bank_transfer \| razorpay |
| `upiId` | String | for UPI withdrawals |
| `bankDetails` | Object | `{ accountHolderName, accountNumber, ifscCode, bankName }` |
| `razorpayPayoutId` | String | filled after processing |
| `status` | enum | pending → processing → completed \| rejected |
| `adminRemarks` | String | |
| `processedAt` | Date | |

---

### `postbacklogs`

Immutable audit log of every postback received.

| Field | Type | Notes |
|-------|------|-------|
| `clickId` | String | |
| `offerId` | ObjectId | |
| `userId` | ObjectId | |
| `fullQuery` | Object | raw advertiser params |
| `ipAddress` | String | |
| `secretProvided` | String | hidden from queries (`select: false`) |
| `status` | enum | success \| pending_approval \| click_not_found \| duplicate \| invalid_secret \| ip_not_whitelisted \| fraud_timing \| fraud_device \| fraud_ip_block \| error |
| `notes` | String | debug info |

---

## API Reference

### Campaign APIs (Admin only)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/v1/admin/campaigns` | Create campaign |
| `GET` | `/v1/admin/campaigns` | List (supports `?status=&category=&search=&page=&limit=`) |
| `GET` | `/v1/admin/campaigns/available` | Campaigns that have no offer yet |
| `GET` | `/v1/admin/campaigns/:campaignId` | Get by ID |
| `PUT` | `/v1/admin/campaigns/:campaignId` | Update |
| `DELETE` | `/v1/admin/campaigns/:campaignId` | Soft delete |

---

### Offer APIs

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/v1/admin/offers` | Admin | Create offer |
| `GET` | `/v1/admin/offers` | Admin | List (supports `?campaignId=&status=&search=`) |
| `GET` | `/v1/admin/offers/:offerId` | Admin | Get by ID |
| `PUT` | `/v1/admin/offers/:offerId` | Admin | Update |
| `DELETE` | `/v1/admin/offers/:offerId` | Admin | Soft delete |
| `PATCH` | `/v1/admin/offers/:offerId/toggle-status` | Admin | Toggle isActive |
| `GET` | `/v1/admin/offers/:offerId/conversions` | Admin | Conversions for this offer |
| `GET` | `/v1/offers` | User | Public offer list (only `offerDisplay: true`) |
| `POST` | `/v1/offers/:offerId/click` | User | Generate tracking URL |

---

### Tracking & Postback (No auth required)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/track/:offerId/:userId?cid=CLICK_ID` | Redirect user to advertiser |
| `GET` | `/postback?cid=&secret=&event=` | Advertiser postback endpoint |
| `GET` | `/v1/offer/callback/postback` | Legacy postback alias |

**Postback query params:**

| Param | Required | Description |
|-------|----------|-------------|
| `cid` | Yes | The `clickId` generated at click time |
| `secret` | Yes | Must match `offer.postbackSecretKey` |
| `event` | No | Event name e.g. `App_Install`. Defaults to first event |
| `revenue` | No | Advertiser-reported revenue (for audit only) |

---

### Conversion Approval (Admin only)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/v1/admin/conversions/pending` | List all `pending_approval` conversions |
| `GET` | `/v1/admin/conversions` | All conversions (supports `?status=&offerId=&userId=`) |
| `GET` | `/v1/admin/conversions/revenue` | Platform revenue summary |
| `PATCH` | `/v1/admin/conversions/:trackingId/approve` | Approve → credit user wallet |
| `PATCH` | `/v1/admin/conversions/:trackingId/reject` | Reject (adminNote required) |

---

### Wallet APIs (User)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/v1/wallet/me` | Full wallet object |
| `GET` | `/v1/wallet/stats` | Dashboard summary card |
| `GET` | `/v1/wallet/transactions` | Transaction history (supports `?type=&category=&status=`) |
| `GET` | `/v1/wallet/offer-history` | Offer completion history (supports `?status=`) |
| `GET` | `/v1/admin/wallet/:userId` | Admin: look up any user's wallet |

---

### Withdrawal APIs

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/v1/withdrawals` | User | Request withdrawal |
| `GET` | `/v1/withdrawals/my` | User | My withdrawal list |
| `GET` | `/v1/withdrawals/all` | Admin | All withdrawals |
| `PATCH` | `/v1/withdrawals/:id/status` | Admin | processing → completed \| rejected |

---

## cURL Examples

### 1. Create Campaign
```bash
curl -X POST http://localhost:5000/v1/admin/campaigns \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PhonePe App Install",
    "imageUrl": "https://cdn.example.com/phonepe.png",
    "campaignUrl": "https://track.affpartner.com/go?cid={click_id}&uid={user_id}",
    "category": "finance",
    "model": "CPI",
    "status": "active",
    "events": [
      { "name": "App Install",       "objective": "CPI", "cap": 1000, "payout": 100 },
      { "name": "First Transaction", "objective": "CPA", "cap": 300,  "payout": 200 }
    ],
    "conversionApproval": "automatic",
    "sameClickIpBlock": true,
    "conversionDelayEnabled": true,
    "conversionDelayMinutes": 5,
    "ipWhitelistEnabled": false
  }'
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Campaign created successfully",
    "campaign": {
      "_id": "664abc000111222333444555",
      "name": "PhonePe App Install",
      "status": "active",
      "events": [
        { "name": "App Install", "objective": "CPI", "cap": 1000, "payout": 100, "order": 1 },
        { "name": "First Transaction", "objective": "CPA", "cap": 300, "payout": 200, "order": 2 }
      ],
      "conversionApproval": "automatic",
      "sameClickIpBlock": true,
      "conversionDelayEnabled": true,
      "conversionDelayMinutes": 5
    }
  }
}
```

---

### 2. Create Offer
```bash
curl -X POST http://localhost:5000/v1/admin/offers \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "664abc000111222333444555",
    "comment": "Install PhonePe and earn ₹75",
    "status": "active",
    "offerDisplay": true,
    "oneUpiOneTime": true,
    "events": [
      { "order": 1, "eventName": "App Install",       "payout": 75  },
      { "order": 2, "eventName": "First Transaction", "payout": 150 }
    ],
    "steps": "1. Click Get Offer,2. Install PhonePe,3. Register with mobile number,4. Complete first transaction",
    "termsAndConditions": "New users only,Valid once per device",
    "referTermsAndConditions": "Refer a friend and earn 10% of their reward",
    "totalCap": 1000,
    "dailyCap": 100,
    "completionsPerUser": 1
  }'
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Offer created successfully",
    "offer": {
      "_id": "664def000111222333444555",
      "campaignId": "664abc000111222333444555",
      "offerName": "PhonePe App Install",
      "offerId": "A1B2C3",
      "postbackSecretKey": "9f8e7d6c-5b4a-3c2d-1e0f-a9b8c7d6e5f4",
      "events": [
        { "eventName": "App Install",       "payout": 75,  "order": 1 },
        { "eventName": "First Transaction", "payout": 150, "order": 2 }
      ]
    },
    "postbackUrl": "http://localhost:5000/postback?cid={clickId}&secret=9f8e7d6c-..."
  }
}
```

---

### 3. Get User Offers
```bash
curl -X GET "http://localhost:5000/v1/offers?page=1&limit=10" \
  -H "Authorization: Bearer USER_JWT"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Offers fetched",
    "offers": [
      {
        "_id": "664def000111222333444555",
        "offerName": "PhonePe App Install",
        "comment": "Install PhonePe and earn ₹75",
        "steps": "1. Click Get Offer,2. Install PhonePe,...",
        "events": [{ "eventName": "App Install", "payout": 75, "order": 1 }],
        "campaignId": { "name": "PhonePe App Install", "category": "finance", "model": "CPI" },
        "userCompletionStatus": "not_started"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
  }
}
```

---

### 4. Click Offer (generate tracking URL)
```bash
curl -X POST http://localhost:5000/v1/offers/664def000111222333444555/click \
  -H "Authorization: Bearer USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "deviceId": "android-device-id-xyz" }'
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Tracking URL generated",
    "clickId": "b4f9e3d2-1a2b-4c5d-8e9f-0a1b2c3d4e5f",
    "trackingUrl": "http://localhost:5000/track/664def.../user123?cid=b4f9e3d2-...",
    "rewardINR": 75,
    "offerName": "PhonePe App Install"
  }
}
```

---

### 5. Tracking Redirect (user visits this URL)
```
GET http://localhost:5000/track/664def.../user123?cid=b4f9e3d2-...
→ HTTP 302 → https://track.affpartner.com/go?cid={click_id}&uid={user_id}&clickId=b4f9e3d2-...
```

---

### 6. Advertiser Postback — Automatic Approval
```bash
# Called by the advertiser/affiliate network after user completes task
curl "http://localhost:5000/postback?cid=b4f9e3d2-1a2b-4c5d-8e9f-0a1b2c3d4e5f&secret=9f8e7d6c-...&event=App%20Install"
```

**Success Response:**
```json
{
  "status": "success",
  "data": { "success": true, "amountAwarded": 75 }
}
```

**Manual Approval Required Response:**
```json
{
  "status": "success",
  "data": { "success": true, "message": "Conversion received — pending manual approval", "requiresApproval": true }
}
```

**Fraud Response:**
```json
{
  "status": "success",
  "data": { "success": false, "message": "Fraud detected: click/conversion IP match" }
}
```

---

### 7. Manual Conversion Approval (Admin)
```bash
# List pending approvals
curl -X GET "http://localhost:5000/v1/admin/conversions/pending?page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_JWT"

# Approve
curl -X PATCH http://localhost:5000/v1/admin/conversions/TRACKING_ID/approve \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "adminNote": "Screenshot verified, approved" }'

# Reject
curl -X PATCH http://localhost:5000/v1/admin/conversions/TRACKING_ID/reject \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "adminNote": "Fake screenshot submitted" }'
```

---

### 8. Wallet APIs (User)
```bash
# Balance
curl -X GET http://localhost:5000/v1/wallet/me \
  -H "Authorization: Bearer USER_JWT"

# Dashboard stats
curl -X GET http://localhost:5000/v1/wallet/stats \
  -H "Authorization: Bearer USER_JWT"
```

**Stats Response:**
```json
{
  "status": "success",
  "data": {
    "stats": {
      "balance": 225,
      "availableBalance": 225,
      "totalEarned": 225,
      "totalWithdrawn": 0,
      "pendingWithdrawal": 0,
      "offersCompleted": 3,
      "offersPending": 1
    }
  }
}
```

```bash
# Transaction history
curl -X GET "http://localhost:5000/v1/wallet/transactions?page=1&limit=20&type=credit" \
  -H "Authorization: Bearer USER_JWT"

# Offer completion history
curl -X GET "http://localhost:5000/v1/wallet/offer-history?status=completed" \
  -H "Authorization: Bearer USER_JWT"
```

---

### 9. Revenue Summary (Admin)
```bash
curl -X GET http://localhost:5000/v1/admin/conversions/revenue \
  -H "Authorization: Bearer ADMIN_JWT"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "summary": {
      "totalAdvertiserRevenue": 5000,
      "totalUserPayouts": 3750,
      "totalMargin": 1250,
      "totalConversions": 50
    },
    "recentRevenue": [...]
  }
}
```

---

### 10. Request Withdrawal
```bash
curl -X POST http://localhost:5000/v1/withdrawals \
  -H "Authorization: Bearer USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 200, "method": "upi", "upiId": "user@paytm" }'
```

---

### 11. Admin Process Withdrawal
```bash
curl -X PATCH http://localhost:5000/v1/withdrawals/WITHDRAWAL_ID/status \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "status": "completed", "adminRemarks": "UPI paid" }'
```

---

## Financial Flow

```
Advertiser  ───pays───▶  Campaign.events[].payout = ₹100   ← PLATFORM INCOME
                                     │
                                     │  margin = ₹100 - ₹75 = ₹25   ← PLATFORM PROFIT
                                     │
Platform    ───pays───▶  Offer.events[].payout    = ₹75    ← USER REWARD
                                     │
                                     ▼
                            User Wallet  += ₹75
                            Revenue.advertiserAmount = ₹100
                            Revenue.userReward       = ₹75
                            Revenue.margin           = ₹25
                            Transaction (credit ₹75)
```

**Revenue document example:**
```json
{
  "advertiserAmount": 100,
  "userReward": 75,
  "margin": 25,
  "eventName": "App Install",
  "status": "settled"
}
```

---

## Security & Fraud Prevention

| Check | How | Config Field |
|-------|-----|-------------|
| **Secret key** | Postback must include `?secret=` matching `offer.postbackSecretKey` | Auto-generated UUID per offer |
| **IP Whitelist** | Postback IP must be in allowed list | `ipWhitelistEnabled` + `ipWhitelist[]` |
| **Same-click-IP block** | Click IP === postback IP → fraud | `sameClickIpBlock: true` |
| **Conversion delay** | Postback < N minutes after click → fraud | `conversionDelayEnabled` + `conversionDelayMinutes` |
| **Device dedup** | Same deviceId already completed this offer → fraud | Tracked on `tracking.deviceId` |
| **Duplicate postback** | `tracking.status === completed` → blocked | Status check before processing |
| **JWT cache** | Decoded tokens cached for 1 min to reduce DB lookups | `node-cache` in `auth.middleware.js` |
| **Soft deletes** | Nothing is hard-deleted (audit trail preserved) | `isDeleted` on all major models |

---

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| User clicks the same offer twice | Reuses existing `clickId` (idempotent) — no duplicate tracking record |
| Advertiser fires postback twice | Second call returns `{ success: false, message: "Already processed" }` — no double credit |
| Postback too fast after click | Tracking marked `fraud`, `PostbackLog status: fraud_timing` |
| Same device, different accounts | Second account's conversion blocked as `fraud_device` |
| Same IP clicked and converts | Blocked as `fraud_ip_block` |
| Postback from non-whitelisted IP | Rejected as `ip_not_whitelisted` (no fraud mark, just rejected) |
| Wrong secret key | Rejected as `invalid_secret` |
| Campaign set to inactive | Offer creation blocked with `"Campaign is not active"` |
| Second offer for same campaign | Blocked with `"An offer already exists for this campaign"` |
| Offer at full capacity | Click blocked with `"Offer capacity reached"` |
| Manual approval required | Wallet NOT credited; conversion parks as `pending_approval` |
| Admin rejects conversion | `status: rejected`, wallet untouched, reason stored in `adminNote` |
| Offer expired (`endDate` passed) | Click blocked with `"Offer has expired"` |
| User already completed offer | Click blocked with `"You have already completed this offer"` |
| Jumper enabled | N% of traffic randomly redirected to `jumperUrl` instead of main `campaignUrl` |
| No FCM token on user | FCM step silently skipped |
| Advertiser S2S callback fails | Non-blocking — error logged, reward already credited |

---

## Permissions Matrix

| Permission | admin | user | merchant |
|------------|:-----:|:----:|:--------:|
| `CREATE_CAMPAIGN` | ✅ | ❌ | ✅ |
| `GET_ALL_CAMPAIGNS` | ✅ | ❌ | ✅ |
| `UPDATE_CAMPAIGN` | ✅ | ❌ | ❌ |
| `DELETE_CAMPAIGN` | ✅ | ❌ | ❌ |
| `CREATE_OFFER` | ✅ | ❌ | ✅ |
| `GET_ALL_OFFERS` | ✅ | ❌ | ✅ |
| `UPDATE_OFFER` | ✅ | ❌ | ❌ |
| `DELETE_OFFER` | ✅ | ❌ | ❌ |
| `TOGGLE_OFFER_STATUS` | ✅ | ❌ | ❌ |
| `GET_CAMPAIGN_CONVERSIONS` | ✅ | ❌ | ❌ |
| `MANAGE_CONVERSIONS` | ✅ | ❌ | ❌ |
| `CLICK_OFFER` | ✅ | ✅ | ✅ |
| `VIEW_WALLET` | ✅ | ✅ | ✅ |
| `ADMIN_VIEW_WALLET` | ✅ | ❌ | ❌ |
| `MANAGE_WITHDRAWALS` | ✅ | ❌ | ✅ |

---

## Response Format

All APIs return a consistent structure:

```json
{ "status": "success", "data": { ... } }
{ "status": "error",   "data": { "message": "..." } }
```

HTTP status codes used:
- `200` — Success
- `201` — Created
- `400` — Bad Request / Validation error
- `401` — Unauthorized (no/invalid token)
- `403` — Forbidden (insufficient permissions)
- `404` — Not Found
- `409` — Conflict (duplicate)
- `500` — Internal Server Error
