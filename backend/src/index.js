const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');

// Load env variables BEFORE importing modules that depend on them
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Startup Validation
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'PORT', 'FRONTEND_URL'];
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingVars.length > 0) {
  console.error(`[Startup Error]: Missing critical environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

const prisma = require('./lib/prisma');

// Prevent BigInt serialization errors from $queryRaw results
if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    return Number(this);
  };
}

const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Routes imports
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const merchantRoutes = require('./routes/merchant');
const adminRoutes = require('./routes/admin');
const { verifyTransporter } = require('./services/emailService');
const { startScheduler } = require('./jobs/scheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed origins for CORS and CSP
const normalizeOrigin = (origin) => origin ? origin.replace(/\/+$/, '') : null;
const frontendOrigins = [
  process.env.FRONTEND_URL,
].map(normalizeOrigin).filter(Boolean);
const allowedOrigins = Array.from(new Set(frontendOrigins));

// API origins allowed by CSP when the backend serves the frontend shell
const apiOrigins = [
  process.env.API_URL,
  process.env.BACKEND_URL,
].map(normalizeOrigin).filter(Boolean);
const allowedConnectSources = Array.from(new Set([...allowedOrigins, ...apiOrigins]));

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...allowedConnectSources]
    }
  },
  crossOriginEmbedderPolicy: false
}));

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Parsing Requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general API rate limiter to all API endpoints
app.use('/api', apiLimiter);

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/admin', adminRoutes);
const adsRoutes = require('./routes/ads');
app.use('/api/ads', adsRoutes);
const chatbotRoutes = require('./routes/chatbot');
app.use('/api/chatbot', chatbotRoutes);
const adminAdPaymentRoutes = require('./routes/adminAdPayment');
app.use('/api/admin', adminAdPaymentRoutes);

// Serve uploaded files (ad payment screenshots, etc.)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Advanced Health Check
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
    console.error('[Health Check] DB Connection Error:', error);
  }

  res.status(dbStatus === 'connected' ? 200 : 503).json({
    success: dbStatus === 'connected',
    message: 'SkillXT Rewards Backend is running.',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// 404 Route handler
app.use((req, res, next) => {
  const err = new Error('Resource not found.');
  err.status = 404;
  err.code = 'NOT_FOUND';
  next(err);
});

// Global Error Handler (Must be registered last)
app.use(errorHandler);

async function cleanupRefreshTokens() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const result = await prisma.refreshToken.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });
    console.log(`[Cleanup]: Successfully deleted ${result.count} refresh tokens older than 30 days.`);
  } catch (error) {
    console.error('[Cleanup Error]: Failed to delete old refresh tokens:', error);
  }
}

app.listen(PORT, () => {
  console.log(`[Server]: Server successfully started on port ${PORT}`);
  // Run cleanup on startup
  cleanupRefreshTokens();
  // Run cleanup periodically every 24 hours
  setInterval(cleanupRefreshTokens, 24 * 60 * 60 * 1000);
  // Verify email SMTP transporter connection
  verifyTransporter();
  // Start subscription reminder scheduler (daily at 09:00 UTC)
  startScheduler();
});
