require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const seedRoutes = require('./routes/seed');

// Stripe routes are only loaded when a real key is configured.
// This prevents a crash if STRIPE_SECRET_KEY is missing or empty.
const STRIPE_ENABLED =
  process.env.STRIPE_SECRET_KEY &&
  (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ||
    process.env.STRIPE_SECRET_KEY.startsWith('sk_live_'));
let stripeRoutes;
if (STRIPE_ENABLED) {
  stripeRoutes = require('./routes/stripe');
}

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());

// CORS: use ALLOWED_ORIGINS env var in production.
// Falls back to localhost only in non-production environments.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : process.env.NODE_ENV === 'production'
    ? [] // No origins allowed if env var is missing in production — fail safe
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
  })
);

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

app.use(globalLimiter);

// ─── Body Parsing ──────────────────────────────────────────────────────────────
// Stripe webhook needs raw body — must be registered BEFORE express.json()
if (STRIPE_ENABLED) {
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Health Check ──────────────────────────────────────────────────────────────
// Registered at BOTH /health and /api/health to satisfy Railway, Render, and
// any other platform that may probe either path.
const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    stripe: STRIPE_ENABLED ? 'enabled' : 'disabled (no valid key)',
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
// One-time seed endpoint — only active when SEED_SECRET env var is set
if (process.env.SEED_SECRET) {
  app.use('/api/seed', seedRoutes);
}

if (STRIPE_ENABLED && stripeRoutes) {
  app.use('/api/stripe', stripeRoutes);
} else {
  // Stub: returns a clear 503 so the frontend can show a "payments unavailable" message
  // rather than a confusing 404 or crash.
  app.use('/api/stripe', (req, res) => {
    res.status(503).json({
      error: 'Payment processing is not yet configured. Please contact support.',
    });
  });
}

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Database & Server Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`   Stripe: ${STRIPE_ENABLED ? 'enabled' : 'disabled'}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;
