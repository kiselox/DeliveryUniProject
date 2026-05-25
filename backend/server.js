// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import corsOptions from './config/corsOptions.js';
import apiRouter from './routes/api.js';
import errorHandler from './middleware/errorHandler.js';
import { initDb, pool, usePostgres, localDb, saveLocalDb } from './db.js';

dotenv.config();

const app = express();

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());

// Mount the centralized API router
app.use('/', apiRouter);

// Fallback error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Initialize Database (Postgres tables/migrations or JSON fallback seeds)
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 POLONEZ Express Server running on http://localhost:${PORT}`);
    console.log(`👉 Mode: ${usePostgres ? '🟢 DATABASE MODE (PostgreSQL + PostGIS)' : '🟡 FALLBACK MODE (Local json + JS Math)'}`);
    console.log(`==================================================\n`);
  });
});

// Background Interval: AUTO-SURGE PRICES FOR OLD PENDING ORDERS (every 10s)
setInterval(async () => {
  if (usePostgres) {
    try {
      if (pool) {
        // Increase delivery coefficient by 0.1 (max 3.0) for all orders still waiting for pickup
        await pool.query(`
          UPDATE orders 
          SET coefficient = LEAST(3.0, coefficient + 0.1)
          WHERE status = 'Ready for Pickup'
        `);
      }
    } catch (err) {
      console.error('Error in postgres auto-surge pricing job:', err.message);
    }
  } else {
    // Local memory db updates
    let updated = false;
    localDb.orders = localDb.orders.map(o => {
      if (o.status === 'Ready for Pickup') {
        const newCoeff = parseFloat(Math.min(3.0, (o.coefficient || 1.0) + 0.1).toFixed(1));
        if (newCoeff !== o.coefficient) {
          updated = true;
          return { ...o, coefficient: newCoeff };
        }
      }
      return o;
    });
    if (updated) {
      saveLocalDb();
    }
  }
}, 10000); // 10 seconds

export default app;
