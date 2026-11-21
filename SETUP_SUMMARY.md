# Setup Summary - Reward API

## ✅ Completed Setup

### 1. **Logger (Winston with TraceID)**
- Location: `src/utility/logger.js`
- Features:
  - Daily log rotation
  - Unique traceID for each log entry (using UUID)
  - Colored console output
  - File logging in `logs/` directory
  - Environment-based log levels (debug/info)

### 2. **MongoDB Wrapper**
- Location: `src/config/mongoWrapper.js`
- Features:
  - Connection pooling (maxPoolSize: 50, minPoolSize: 20)
  - Proper error handling with logger
  - Connect/disconnect methods
  - Debug mode enabled

### 3. **Database Connection**
- Location: `src/config/db.js`
- Updated to use MongoWrapper class
- Integrated with logger

### 4. **Authentication Middleware**
- Location: `src/middleware/auth.middleware.js`
- Features:
  - JWT token verification with caching (1 minute TTL)
  - User validation (active, not deleted)
  - Role-based permission checking
  - Proper error responses

### 5. **Permission System**
- Location: `src/middleware/permission.js`
- Roles: ADMIN, USER, MERCHANT
- Extensible permission structure

### 6. **Response Helpers**
- Location: `src/utility/responseHelper.js`
- Updated to use constants from `src/constants/`
- Consistent response format with `status` field
- All HTTP status codes covered

### 7. **Constants**
- `src/constants/enums.js` - Application enums
- `src/constants/log_constants.js` - Logger configuration
- `src/constants/responseStatus.json` - HTTP status codes
- `src/constants/responseData.json` - Response data constants

### 8. **Server Configuration**
- Location: `server.js`
- Features:
  - Compression middleware
  - Body parser (50MB JSON, 100MB URL-encoded)
  - Cookie parser
  - CORS headers
  - Request logging
  - Proper async DB initialization

### 9. **Environment Configuration**
- Location: `src/config/config.js`
- Added: STAGE, JWT_SECRET, LOG_MAX_FILES
- `.env.example` created for reference

### 10. **Dependencies Added**
- winston
- winston-daily-rotate-file
- uuid
- jsonwebtoken
- node-cache
- compression
- body-parser
- cookie-parser

## 📝 Usage Example

### Protect a route with authentication:
```javascript
const protectRoutes = require('./src/middleware/auth.middleware');
const User = require('./src/models/user.model');

// Without permission check
router.get('/profile', 
  protectRoutes.checkPermission(null, User), 
  controller.getProfile
);

// With permission check
router.post('/admin/users', 
  protectRoutes.checkPermission('CREATE_USER', User), 
  controller.createUser
);
```

### Use logger:
```javascript
const logger = require('./src/utility/logger');

logger.info('User logged in');
logger.error('Database connection failed', { error: err });
logger.debug('Processing request', { userId: user.id });
```

### Use response helpers:
```javascript
const { setSuccess, setNotFoundError, setBadRequest } = require('./src/utility/responseHelper');

// Success response
setSuccess(res, { user: userData });

// Error response
setNotFoundError(res, { message: 'User not found' });
```

## 🚀 Next Steps

1. Update your `.env` file with actual values
2. Create User model if not exists (for auth middleware)
3. Update routes to use the new middleware
4. Test the authentication flow
5. Add more permissions as needed in `permission.js`

## 📂 File Structure
```
Reward_api/
├── src/
│   ├── config/
│   │   ├── config.js
│   │   ├── db.js
│   │   └── mongoWrapper.js
│   ├── constants/
│   │   ├── enums.js
│   │   ├── log_constants.js
│   │   ├── responseData.json
│   │   └── responseStatus.json
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── permission.js
│   └── utility/
│       ├── logger.js
│       └── responseHelper.js
├── logs/
├── server.js
├── .env.example
└── package.json
```
