import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
// Load local server/.env. Hosted runtime environment variables always take precedence.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import communityRoutes from './routes/community.js';
import notificationRoutes from './routes/notifications.js';
import Product from './models/Product.js';
import seedProducts from './data/products.js';
import { startMailWorker } from './services/mail.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '150kb' }));
app.use(morgan('dev'));

// Serverless instances may be reused or frozen. Cache in-flight connects within
// an instance, retry after failures, and never call process.exit() in a request.
let connecting = null;
let initialCatalogSync = null;
async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  const uri = process.env.MONGO_URI;
  if (!uri || /ATLAS_USERNAME|YOUR_CLUSTER|YOUR_PASSWORD|<db_password>/i.test(uri)) {
    const err = new Error('MONGO_URI is missing or contains placeholder values.');
    err.code = 'DATABASE_URI_MISSING';
    throw err;
  }
  if (connecting && mongoose.connection.readyState === 0) connecting = null;
  if (!connecting) {
    connecting = mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
      .then(async () => {
        if (process.env.AUTO_SEED !== 'false' && !initialCatalogSync) {
          initialCatalogSync = Product.bulkWrite(seedProducts.map(product => ({
            updateOne: { filter: { slug: product.slug }, update: { $setOnInsert: product }, upsert: true }
          }))).catch(error => { initialCatalogSync = null; throw error; });
        }
        if (initialCatalogSync) await initialCatalogSync;
        return mongoose.connection;
      })
      .catch(error => { connecting = null; throw error; });
  }
  return connecting;
}

function databaseErrorCode(error) {
  if (error?.code === 'DATABASE_URI_MISSING') return 'DATABASE_URI_MISSING';
  if (error?.code === 'ENOTFOUND' || error?.code === 'ESERVFAIL' || /querySrv|ENOTFOUND|ESERVFAIL/i.test(error?.message || '')) return 'DATABASE_DNS_ERROR';
  if (/Authentication failed|bad auth|credentials/i.test(error?.message || '')) return 'DATABASE_AUTH_ERROR';
  if (/timed out|Server selection|ETIMEDOUT|ECONNREFUSED|IP access/i.test(error?.message || '')) return 'DATABASE_NETWORK_ERROR';
  return 'DATABASE_CONNECTION_FAILED';
}

// Safe diagnostics: never return database credentials, URI, exception stack or JWT.
app.get('/api/health', async (_req, res) => {
  const jwtConfigured = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32);
  try {
    await connectDb();
    return res.status(jwtConfigured ? 200 : 503).json({
      ok: jwtConfigured,
      service: 'northline-api',
      database: 'connected',
      jwtConfigured,
      ...(jwtConfigured ? {} : { issue: 'JWT_SECRET_MISSING' })
    });
  } catch (error) {
    console.error('[DB HEALTH]', databaseErrorCode(error), error.message);
    return res.status(503).json({
      ok: false,
      service: 'northline-api',
      database: 'disconnected',
      jwtConfigured,
      issue: databaseErrorCode(error)
    });
  }
});

app.use('/api', async (_req, res, next) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    return res.status(503).json({ message: 'Server authentication is not configured.', code: 'JWT_SECRET_MISSING' });
  }
  try {
    await connectDb();
    next();
  } catch (error) {
    console.error('[DB REQUEST]', databaseErrorCode(error), error.message);
    return res.status(503).json({ message: 'Database temporarily unavailable. Please try again.', code: databaseErrorCode(error) });
  }
});

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }), authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', communityRoutes);
app.use('/api', notificationRoutes);
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((error, _req, res, _next) => {
  if (error.status && error.status >= 400 && error.status < 600) return res.status(error.status).json({ message: error.message });
  if (error instanceof ZodError) return res.status(400).json({ message: error.issues[0]?.message || 'Invalid input' });
  if (error.code === 11000) return res.status(409).json({ message: 'A record with this value already exists.' });
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid identifier' });
  console.error('API error:', error.message);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

// Vercel handles requests via exported Express app. Only create a long-running
// listener/30-second email poller when started locally or on a persistent host.
if (!process.env.VERCEL) {
  connectDb()
    .then(() => {
      startMailWorker();
      const port = Number(process.env.PORT) || 5000;
      app.listen(port, () => console.log(`NORTHLINE API listening on port ${port}`));
    })
    .catch(error => {
      console.error('MongoDB connection error:', error.message);
      process.exitCode = 1;
    });
}

export default app;
