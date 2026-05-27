// backend/db.js
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { VENDOR_COORDINATES, POZNAN_ADDRESSES, CUSTOMER_COORDINATES, COURIER_COORDINATES } from './config/poznanAddresses.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_JSON_PATH = path.join(__dirname, '..', 'db.json');

const DATABASE_URL = process.env.DATABASE_URL;

export let usePostgres = false;
export let pool = null;

// Global settings in-memory
export const settings = {
  pricePerKm: 4.0,
  scooterPricePerKm: 5.5,
  carPricePerKm: 7.0,
  globalSurcharge: 0.0
};

// Local JSON in-memory state
export let localDb = {
  customers: [],
  couriers: [],
  vendors: [],
  orders: []
};

// Attempt to connect to PostgreSQL if URL is provided
if (DATABASE_URL) {
  try {
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    usePostgres = true;
    console.log('🔌 Found DATABASE_URL, attempting to connect to PostgreSQL...');
  } catch (err) {
    console.error('❌ Failed to create PostgreSQL pool. Falling back to JSON Mode.', err.message);
    usePostgres = false;
  }
}

export function loadLocalDb() {
  try {
    const data = fs.readFileSync(DB_JSON_PATH, 'utf8');
    localDb = JSON.parse(data);
    
    // Restore or initialize settings
    if (localDb.settings) {
      Object.assign(settings, localDb.settings);
    } else {
      localDb.settings = { ...settings };
    }
    
    // Add coordinates to local vendors & customers if missing
    localDb.vendors = localDb.vendors.map(v => ({
      ...v,
      lat: VENDOR_COORDINATES[v.id]?.lat || 52.4064,
      lng: VENDOR_COORDINATES[v.id]?.lng || 16.9252
    }));

    localDb.customers = localDb.customers.map(c => ({
      ...c,
      lat: CUSTOMER_COORDINATES[c.id]?.lat || 52.4140,
      lng: CUSTOMER_COORDINATES[c.id]?.lng || 16.9295
    }));

    localDb.couriers = localDb.couriers.map(cour => ({
      ...cour,
      lat: cour.lat || COURIER_COORDINATES[cour.id]?.lat || 52.4140,
      lng: cour.lng || COURIER_COORDINATES[cour.id]?.lng || 16.9295
    }));

    saveLocalDb();
  } catch (err) {
    console.error('⚠️ Could not load db.json, starting with empty database.', err.message);
  }
}

export function saveLocalDb() {
  try {
    localDb.settings = { ...settings };
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(localDb, null, 2), 'utf8');
  } catch (err) {
    console.error('⚠️ Error writing to db.json:', err.message);
  }
}

// PostgreSQL Table Initialization & Seeding with PostGIS
export async function initDb() {
  if (!usePostgres) {
    console.log('📂 Running in JSON File Mode (No Database URL specified).');
    loadLocalDb();
    return;
  }

  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database successfully!');

    // 1. Enable PostGIS
    console.log('🌍 Enabling PostGIS extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');

    // 2. Create tables
    console.log('🛠️ Creating tables if they do not exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100),
        address VARCHAR(255),
        location GEOGRAPHY(Point, 4326)
      );

      CREATE TABLE IF NOT EXISTS vendors (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100),
        cuisine VARCHAR(100),
        image_url VARCHAR(255),
        hero_image VARCHAR(255),
        menu JSONB,
        location GEOGRAPHY(Point, 4326)
      );

      CREATE TABLE IF NOT EXISTS couriers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100),
        vehicle VARCHAR(50),
        location GEOGRAPHY(Point, 4326)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50),
        vendor_id VARCHAR(50),
        vendor_name VARCHAR(100),
        items TEXT,
        status VARCHAR(50),
        distance NUMERIC,
        fee NUMERIC,
        total_price NUMERIC,
        courier_id VARCHAR(50) NULL,
        created_at VARCHAR(50),
        accepted_at VARCHAR(50) NULL,
        picked_up_at VARCHAR(50) NULL,
        delivery_address VARCHAR(255) NULL,
        delivery_lat NUMERIC NULL,
        delivery_lng NUMERIC NULL,
        house VARCHAR(50) NULL,
        apartment VARCHAR(50) NULL,
        floor VARCHAR(50) NULL,
        notes TEXT NULL,
        phone VARCHAR(50) NULL,
        coefficient NUMERIC DEFAULT 1.0 NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(50) PRIMARY KEY,
        chat_id VARCHAR(50),
        sender_id VARCHAR(50),
        sender_name VARCHAR(100),
        role VARCHAR(50),
        text TEXT,
        timestamp VARCHAR(50) NULL,
        resolved BOOLEAN DEFAULT FALSE
      );
    `);

    // 3. PostgreSQL migrations: add delivery address and custom coordinates columns if they don't exist
    console.log('⚙️ Migrating orders schema for delivery addresses...');
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address VARCHAR(255) NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat NUMERIC NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng NUMERIC NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS house VARCHAR(50) NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS apartment VARCHAR(50) NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS floor VARCHAR(50) NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone VARCHAR(50) NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS coefficient NUMERIC DEFAULT 1.0 NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at VARCHAR(50) NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_at VARCHAR(50) NULL;
    `);

    // 3b. Migrate customers and couriers tables for last_name, email, phone
    console.log('⚙️ Migrating customers and couriers schema for last_name, email, phone...');
    await client.query(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NULL;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(100) NULL;

      ALTER TABLE couriers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NULL;
      ALTER TABLE couriers ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL;
      ALTER TABLE couriers ADD COLUMN IF NOT EXISTS phone VARCHAR(100) NULL;
    `);

    // 3c. Migrate messages table for resolved column
    console.log('⚙️ Migrating messages schema for resolved column...');
    await client.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;
    `);

    // 4. Seed tables if empty
    const resVendors = await client.query('SELECT COUNT(*) FROM vendors');
    if (parseInt(resVendors.rows[0].count) === 0) {
      console.log('🌱 Seeding database with Poznań vendors, customers, and couriers...');
      
      // Load raw mock JSON
      const mockData = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));

      // Seed Customers
      for (const c of mockData.customers) {
        const coords = CUSTOMER_COORDINATES[c.id] || { lat: 52.4140, lng: 16.9295 };
        await client.query(
          `INSERT INTO customers (id, name, address, location) 
           VALUES ($1, $2, $3, ST_MakePoint($4, $5)::geography)`,
          [c.id, c.name, c.address, coords.lng, coords.lat]
        );
      }

      // Seed Vendors
      for (const v of mockData.vendors) {
        const coords = VENDOR_COORDINATES[v.id] || { lat: 52.4064, lng: 16.9252 };
        await client.query(
          `INSERT INTO vendors (id, name, cuisine, image_url, hero_image, menu, location) 
           VALUES ($1, $2, $3, $4, $5, $6, ST_MakePoint($7, $8)::geography)`,
          [v.id, v.name, v.cuisine, v.imageUrl, v.heroImage || null, JSON.stringify(v.menu), coords.lng, coords.lat]
        );
      }

      // Seed Couriers
      for (const cour of mockData.couriers) {
        const coords = COURIER_COORDINATES[cour.id] || { lat: 52.4140, lng: 16.9295 };
        await client.query(
          `INSERT INTO couriers (id, name, vehicle, location) 
           VALUES ($1, $2, $3, ST_MakePoint($4, $5)::geography)`,
          [cour.id, cour.name, cour.vehicle, coords.lng, coords.lat]
        );
      }

      // Seed Orders
      for (const o of mockData.orders) {
        await client.query(
          `INSERT INTO orders (id, customer_id, vendor_id, vendor_name, items, status, distance, fee, total_price, courier_id, created_at, delivery_address, delivery_lat, delivery_lng) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            o.id, o.customerId, o.vendorId, o.vendorName, o.items, o.status, 
            parseFloat(o.distance) || 0, o.fee, o.totalPrice || 0, o.courierId || null, o.createdAt,
            o.deliveryAddress || "Dormitory CDV, Poznan", o.deliveryLat || 52.4140, o.deliveryLng || 16.9295
          ]
        );
      }

      console.log('🚀 Seeding complete!');
    } else {
      console.log('📈 Database already seeded.');
    }
  } catch (err) {
    console.error('❌ Error initializing PostgreSQL + PostGIS:', err.message);
    console.log('🔄 Falling back to JSON File Mode...');
    usePostgres = false;
    loadLocalDb();
  } finally {
    if (client) client.release();
  }
}
