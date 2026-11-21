import express from "express";
import compression from "compression";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Core Modules
import connectDB from "./src/core/db.js";
import config from "./src/core/config.js";
import logger from "./src/core/logger.js";

// Feature Slices
import publicRoute     from "./src/modules/public/public.route.js";
import authRoute       from "./src/modules/auth/auth.route.js";
import campaignRoute   from "./src/modules/campaigns/campaign.route.js";
import offerRoute      from "./src/modules/offers/offer.route.js";
import clickRoute      from "./src/modules/clicks/click.route.js";
import postbackRoute   from "./src/modules/postbacks/postback.route.js";
import payoutRoute     from "./src/modules/payouts/payout.route.js";
import conversionRoute from "./src/modules/conversions/conversion.route.js";
import uploadRoute     from "./src/modules/upload/upload.route.js";
import dashboardRoute  from "./src/modules/dashboard/dashboard.route.js";
import userRoute       from "./src/modules/users/user.route.js";
import paymentMethodRoute from "./src/modules/paymentMethods/paymentMethod.route.js";

const app = express();

// Initialize MongoDB
(async () => {
  try {
    await connectDB();
  } catch (error) {
    logger.error('Error during MongoDB initialization:', error);
    process.exit(1);
  }
})();

// Middleware
app.use(compression());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: false }));
app.use(cookieParser());

// Static Files & Web Landing Pages
app.use(express.static(path.join(__dirname, 'public')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Request Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.protocol}://${req.hostname}:${config.PORT}${req.originalUrl}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  res.send(`Telegram Reward Backend is Running | DB: telegram_reward_db | Port: ${config.PORT} | Time: ${timestamp}`);
});

// ── Web UI Pages (No-Login Flow) ──
app.get('/task/:offerId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'task.html'));
});

app.get('/status', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'status.html'));
});

app.get('/refer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'refer.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Feature API Routes ──
app.use('/', publicRoute);
app.use('/', authRoute);
app.use('/', campaignRoute);
app.use('/', offerRoute);
app.use('/', clickRoute);
app.use('/', postbackRoute);
app.use('/', payoutRoute);
app.use('/', conversionRoute);
app.use('/', uploadRoute);
app.use('/', dashboardRoute);
app.use('/', userRoute);
app.use('/', paymentMethodRoute);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', data: { message: `Route ${req.method} ${req.path} not found` } });
});

app.listen(config.PORT, () => {
  logger.info(`🚀 Telegram Reward Backend Server listening on port ${config.PORT}`);
});
