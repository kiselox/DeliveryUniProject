import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_JSON_PATH = path.join(__dirname, 'db.json');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;

// Global settings
let settings = {
  pricePerKm: 4.0,
  scooterPricePerKm: 5.5,
  carPricePerKm: 7.0,
  globalSurcharge: 0.0
};

// Haversine Distance Formula in JS (Fallback mode)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // returns distance in meters
}

// Poznań coordinates for restaurants (Vendors)
const VENDOR_COORDINATES = {
  v1: { name: 'KFC', lat: 52.4018, lng: 16.9205 },        // Galeria Malta / Center
  v2: { name: "McDonald's", lat: 52.4023, lng: 16.9261 }, // Półwiejska
  v3: { name: 'Burger King', lat: 52.4029, lng: 16.9125 },// Poznań Główny
  v4: { name: 'Pasibus', lat: 52.4048, lng: 16.9255 },    // Półwiejska
  v5: { name: "Misha's Pizza", lat: 52.4115, lng: 16.9068 } // Jeżyce
};

// Normalizes text by removing Polish diacritics and converting to lowercase
function normalizeText(str) {
  if (!str) return '';
  return str.toString().toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/ó/g, 'o')
    .replace(/ż/g, 'z')
    .replace(/ź/g, 'z')
    .replace(/ś/g, 's')
    .replace(/ą/g, 'a')
    .replace(/ę/g, 'e')
    .replace(/ć/g, 'c')
    .replace(/ń/g, 'n');
}

// Built-in dictionary of street names in Poznań for quick geocoding (normalized keys)
const POZNAN_ADDRESSES = {
  "polwiejska": { lat: 52.4023, lng: 16.9261 },
  "garbary": { lat: 52.4045, lng: 16.9372 },
  "jezyce": { lat: 52.4115, lng: 16.9068 },
  "malta": { lat: 52.4018, lng: 16.9205 },
  "cdv": { lat: 52.4140, lng: 16.9295 },
  "dormitory": { lat: 52.4140, lng: 16.9295 },
  "roosevelta": { lat: 52.4081, lng: 16.9118 },
  "glogowska": { lat: 52.3855, lng: 16.8942 },
  "kopernika": { lat: 52.4005, lng: 16.9299 },
  "rynek": { lat: 52.4082, lng: 16.9348 }
};

// Poznań coordinates for customers
const CUSTOMER_COORDINATES = {
  c1: { name: 'Денис', lat: 52.4140, lng: 16.9295 } // Dormitory CDV
};

// Courier starting coordinates
const COURIER_COORDINATES = {
  cour1: { lat: 52.4140, lng: 16.9295 }, // Starts at CDV Dormitory
  cour2: { lat: 52.4081, lng: 16.9118 }, // Starts at Roosevelta
  cour3: { lat: 52.4045, lng: 16.9372 }  // Starts at Garbary
};

let pool = null;
let usePostgres = false;

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

// Memory db for Fallback Mode
let localDb = {
  customers: [],
  couriers: [],
  vendors: [],
  orders: []
};

// Load db.json
function loadLocalDb() {
  try {
    const data = fs.readFileSync(DB_JSON_PATH, 'utf8');
    localDb = JSON.parse(data);
    
    // Restore or initialize settings
    if (localDb.settings) {
      settings = { ...settings, ...localDb.settings };
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

function saveLocalDb() {
  try {
    localDb.settings = { ...settings };
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(localDb, null, 2), 'utf8');
  } catch (err) {
    console.error('⚠️ Error writing to db.json:', err.message);
  }
}

// PostgreSQL Table Initialization & Seeding with PostGIS
async function initPostgresDb() {
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
        created_at VARCHAR(20),
        house VARCHAR(50) NULL,
        apartment VARCHAR(50) NULL,
        floor VARCHAR(50) NULL,
        notes TEXT NULL,
        phone VARCHAR(50) NULL,
        coefficient NUMERIC DEFAULT 1.0 NULL
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

// Determine mode and run initialization
if (usePostgres) {
  initPostgresDb();
} else {
  console.log('📂 Running in JSON File Mode (No Database URL specified).');
  loadLocalDb();
}

// Background Interval: AUTO-SURGE PRICES FOR OLD PENDING ORDERS (every 10s)
setInterval(async () => {
  if (usePostgres) {
    try {
      // Increase delivery coefficient by 0.1 (max 3.0) for all orders still waiting for pick up
      await pool.query(`
        UPDATE orders 
        SET coefficient = LEAST(3.0, COALESCE(coefficient, 1.0) + 0.1)
        WHERE status = 'Ready for Pickup'
      `);
    } catch (err) {
      console.error("❌ Failed to auto-surge Postgres orders:", err.message);
    }
  } else {
    let updated = false;
    localDb.orders.forEach(o => {
      if (o.status === 'Ready for Pickup') {
        o.coefficient = Math.min(3.0, (parseFloat(o.coefficient) || 1.0) + 0.1);
        updated = true;
      }
    });
    if (updated) {
      saveLocalDb();
    }
  }
}, 10000); // 10 seconds

// ==========================================
// API ENDPOINTS
// ==========================================

// Global Settings API
app.get('/settings', (req, res) => {
  res.json(settings);
});

app.post('/settings', (req, res) => {
  const { pricePerKm, scooterPricePerKm, carPricePerKm, globalSurcharge } = req.body;
  if (pricePerKm !== undefined) settings.pricePerKm = parseFloat(pricePerKm);
  if (scooterPricePerKm !== undefined) settings.scooterPricePerKm = parseFloat(scooterPricePerKm);
  if (carPricePerKm !== undefined) settings.carPricePerKm = parseFloat(carPricePerKm);
  if (globalSurcharge !== undefined) settings.globalSurcharge = parseFloat(globalSurcharge);
  
  if (!usePostgres) {
    saveLocalDb();
  }
  
  console.log(`⚙️ Support updated settings: Velo ${settings.pricePerKm} PLN/km, Scooter ${settings.scooterPricePerKm} PLN/km, Car ${settings.carPricePerKm} PLN/km, +${settings.globalSurcharge} PLN Surcharge.`);
  res.json(settings);
});

// 1. Vendors (Restaurants)
app.get('/vendors', async (req, res) => {
  if (usePostgres) {
    try {
      const result = await pool.query(`
        SELECT id, name, cuisine, image_url, hero_image, menu,
               ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
        FROM vendors
      `);
      res.json(result.rows.map(row => ({
        id: row.id,
        name: row.name,
        cuisine: row.cuisine,
        imageUrl: row.image_url,
        heroImage: row.hero_image,
        menu: row.menu,
        lat: row.lat,
        lng: row.lng
      })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.json(localDb.vendors);
  }
});

app.get('/vendors/:id', async (req, res) => {
  if (usePostgres) {
    try {
      const result = await pool.query(`
        SELECT id, name, cuisine, image_url, hero_image, menu,
               ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
        FROM vendors WHERE id = $1
      `, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Vendor not found' });
      const row = result.rows[0];
      res.json({
        id: row.id,
        name: row.name,
        cuisine: row.cuisine,
        imageUrl: row.image_url,
        heroImage: row.hero_image,
        menu: row.menu,
        lat: row.lat,
        lng: row.lng
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const v = localDb.vendors.find(item => item.id === req.params.id);
    if (!v) return res.status(404).json({ error: 'Vendor not found' });
    res.json(v);
  }
});

// 2. Customers
app.get('/customers/:id', async (req, res) => {
  if (usePostgres) {
    try {
      const result = await pool.query(`
        SELECT id, name, address,
               ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
        FROM customers WHERE id = $1
      `, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const c = localDb.customers.find(item => item.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Customer not found' });
    res.json(c);
  }
});

// 3. Couriers
app.get('/couriers', async (req, res) => {
  if (usePostgres) {
    try {
      const result = await pool.query(`
        SELECT id, name, vehicle,
               ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
        FROM couriers
      `);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.json(localDb.couriers);
  }
});

app.get('/couriers/:id', async (req, res) => {
  if (usePostgres) {
    try {
      const result = await pool.query(`
        SELECT id, name, vehicle,
               ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
        FROM couriers WHERE id = $1
      `, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Courier not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const c = localDb.couriers.find(item => item.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Courier not found' });
    res.json(c);
  }
});

// 4. Orders
app.get('/orders', async (req, res) => {
  if (usePostgres) {
    try {
      const result = await pool.query('SELECT * FROM orders');
      res.json(result.rows.map(row => ({
        id: row.id,
        customerId: row.customer_id,
        vendorId: row.vendor_id,
        vendorName: row.vendor_name,
        items: row.items,
        status: row.status,
        distance: parseFloat(row.distance),
        fee: parseFloat(row.fee),
        totalPrice: parseFloat(row.total_price),
        courierId: row.courier_id,
        createdAt: row.created_at,
        deliveryAddress: row.delivery_address,
        deliveryLat: parseFloat(row.delivery_lat),
        deliveryLng: parseFloat(row.delivery_lng),
        house: row.house,
        apartment: row.apartment,
        floor: row.floor,
        notes: row.notes,
        phone: row.phone,
        coefficient: row.coefficient ? parseFloat(row.coefficient) : 1.0
      })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    // Ensure all orders have coefficient mapped
    const ordersWithCoeff = localDb.orders.map(o => ({
      ...o,
      coefficient: o.coefficient ? parseFloat(o.coefficient) : 1.0
    }));
    res.json(ordersWithCoeff);
  }
});

app.post('/orders', async (req, res) => {
  const o = req.body;
  const newId = o.id || Math.random().toString(36).substring(2, 11);
  const status = o.status || 'Ready for Pickup';
  const createdAt = o.createdAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Geocode custom delivery address
  const deliveryAddress = o.deliveryAddress || "Poznań Dormitory CDV";
  let deliveryLat = parseFloat(o.deliveryLat);
  let deliveryLng = parseFloat(o.deliveryLng);

  const house = o.house || "";
  const apartment = o.apartment || "";
  const floor = o.floor || "";
  const notes = o.notes || "";
  const phone = o.phone || "";

  if (!deliveryLat || !deliveryLng) {
    const cleanAddr = normalizeText(deliveryAddress);
    let matched = null;
    for (const [key, coords] of Object.entries(POZNAN_ADDRESSES)) {
      if (cleanAddr.includes(key)) {
        matched = coords;
        break;
      }
    }
    if (matched) {
      deliveryLat = matched.lat;
      deliveryLng = matched.lng;
    } else {
      // Random coordinates around Poznań Old Town (radius ~1.5km)
      deliveryLat = 52.406374 + (Math.random() - 0.5) * 0.02;
      deliveryLng = 16.925168 + (Math.random() - 0.5) * 0.02;
    }
  }

  // 2. Fetch selected restaurant coordinates
  let vendorLat = 52.4064;
  let vendorLng = 16.9252;

  if (usePostgres) {
    try {
      const vendorRes = await pool.query(`
        SELECT ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
        FROM vendors WHERE id = $1
      `, [o.vendorId]);
      if (vendorRes.rows.length > 0) {
        vendorLat = parseFloat(vendorRes.rows[0].lat);
        vendorLng = parseFloat(vendorRes.rows[0].lng);
      }
    } catch (err) {
      console.error('Error fetching vendor location in Postgres:', err.message);
    }
  } else {
    const vendor = localDb.vendors.find(v => v.id === o.vendorId);
    if (vendor) {
      vendorLat = vendor.lat;
      vendorLng = vendor.lng;
    }
  }

  // 3. Calculate distance between restaurant and customer address
  const distanceMeters = calculateHaversineDistance(deliveryLat, deliveryLng, vendorLat, vendorLng);
  const distanceKm = parseFloat((distanceMeters / 1000).toFixed(1));

  // 4. Calculate fee: (distanceKm * pricePerKm) + globalSurcharge
  const clientFee = parseFloat(o.fee) || 0;
  const clientTotal = parseFloat(o.totalPrice) || 0;
  const foodPrice = Math.max(0, clientTotal - clientFee);

  const computedFee = Math.max(5.00, Math.round(distanceKm * settings.pricePerKm + settings.globalSurcharge));
  const finalTotalPrice = foodPrice > 0 ? (foodPrice + computedFee) : (40 + computedFee);

  if (usePostgres) {
    try {
      await pool.query(`
        INSERT INTO orders (id, customer_id, vendor_id, vendor_name, items, status, distance, fee, total_price, courier_id, created_at, delivery_address, delivery_lat, delivery_lng, house, apartment, floor, notes, phone, coefficient)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      `, [
        newId, o.customerId, o.vendorId, o.vendorName, o.items, status, 
        distanceKm, computedFee, finalTotalPrice, o.courierId || null, createdAt,
        deliveryAddress, deliveryLat, deliveryLng, house, apartment, floor, notes, phone,
        1.0
      ]);

      res.status(201).json({
        id: newId,
        customerId: o.customerId,
        vendorId: o.vendorId,
        vendorName: o.vendorName,
        items: o.items,
        status,
        distance: distanceKm,
        fee: computedFee,
        totalPrice: finalTotalPrice,
        courierId: o.courierId || null,
        createdAt,
        deliveryAddress,
        deliveryLat,
        deliveryLng,
        house,
        apartment,
        floor,
        notes,
        phone,
        coefficient: 1.0
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const newOrder = {
      id: newId,
      customerId: o.customerId,
      vendorId: o.vendorId,
      vendorName: o.vendorName,
      items: o.items,
      status,
      distance: distanceKm,
      fee: computedFee,
      totalPrice: finalTotalPrice,
      courierId: o.courierId || null,
      createdAt,
      deliveryAddress,
      deliveryLat,
      deliveryLng,
      house,
      apartment,
      floor,
      notes,
      phone,
      coefficient: 1.0
    };
    localDb.orders.push(newOrder);
    saveLocalDb();
    res.status(201).json(newOrder);
  }
});

// Update order (e.g. status, courier assignment, fee adjustment)
app.patch('/orders/:id', async (req, res) => {
  const orderId = req.params.id;
  const updates = req.body;

  if (usePostgres) {
    try {
      const fields = [];
      const values = [];
      let idx = 1;
      
      if (updates.status !== undefined) {
        fields.push(`status = $${idx++}`);
        values.push(updates.status);
      }
      if (updates.courierId !== undefined) {
        fields.push(`courier_id = $${idx++}`);
        values.push(updates.courierId);
      }
      if (updates.fee !== undefined) {
        fields.push(`fee = $${idx++}`);
        values.push(parseFloat(updates.fee));
      }
      if (updates.house !== undefined) {
        fields.push(`house = $${idx++}`);
        values.push(updates.house);
      }
      if (updates.apartment !== undefined) {
        fields.push(`apartment = $${idx++}`);
        values.push(updates.apartment);
      }
      if (updates.floor !== undefined) {
        fields.push(`floor = $${idx++}`);
        values.push(updates.floor);
      }
      if (updates.notes !== undefined) {
        fields.push(`notes = $${idx++}`);
        values.push(updates.notes);
      }
      if (updates.phone !== undefined) {
        fields.push(`phone = $${idx++}`);
        values.push(updates.phone);
      }
      if (updates.coefficient !== undefined) {
        fields.push(`coefficient = $${idx++}`);
        values.push(parseFloat(updates.coefficient));
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(orderId);
      const query = `UPDATE orders SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
      
      const row = result.rows[0];
      res.json({
        id: row.id,
        customerId: row.customer_id,
        vendorId: row.vendor_id,
        vendorName: row.vendor_name,
        items: row.items,
        status: row.status,
        distance: parseFloat(row.distance),
        fee: parseFloat(row.fee),
        totalPrice: parseFloat(row.total_price),
        courierId: row.courier_id,
        createdAt: row.created_at,
        deliveryAddress: row.delivery_address,
        deliveryLat: parseFloat(row.delivery_lat),
        deliveryLng: parseFloat(row.delivery_lng),
        house: row.house,
        apartment: row.apartment,
        floor: row.floor,
        notes: row.notes,
        phone: row.phone,
        coefficient: row.coefficient ? parseFloat(row.coefficient) : 1.0
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const orderIdx = localDb.orders.findIndex(o => o.id === orderId);
    if (orderIdx === -1) return res.status(404).json({ error: 'Order not found' });
    
    if (updates.coefficient !== undefined) {
      updates.coefficient = parseFloat(updates.coefficient);
    }
    
    localDb.orders[orderIdx] = {
      ...localDb.orders[orderIdx],
      ...updates
    };
    saveLocalDb();
    
    const resOrder = {
      ...localDb.orders[orderIdx],
      coefficient: localDb.orders[orderIdx].coefficient ? parseFloat(localDb.orders[orderIdx].coefficient) : 1.0
    };
    res.json(resOrder);
  }
});

// 5. GEOLOCATION REAL-TIME DISTANCE API (PostGIS / Haversine)
app.post('/api/couriers/location', async (req, res) => {
  const { courierId, lat, lng, restaurantId } = req.body;

  if (!courierId || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing courierId, lat, or lng in request body' });
  }

  if (usePostgres) {
    try {
      // 1. Update courier location in PostGIS
      await pool.query(
        `UPDATE couriers 
         SET location = ST_MakePoint($2, $3)::geography 
         WHERE id = $1`,
        [courierId, lng, lat]
      );

      // 2. If a restaurant ID is provided, calculate the precise distance using PostGIS ST_Distance
      let distanceMeters = 0;
      if (restaurantId) {
        const distResult = await pool.query(
          `SELECT ST_Distance(
             (SELECT location FROM couriers WHERE id = $1),
             (SELECT location FROM vendors WHERE id = $2)
           ) AS distance_meters`,
          [courierId, restaurantId]
        );
        if (distResult.rows.length > 0 && distResult.rows[0].distance_meters !== null) {
          distanceMeters = Math.round(distResult.rows[0].distance_meters);
        }
      }

      res.json({
        success: true,
        mode: 'PostGIS Spheroid',
        lat,
        lng,
        distanceMeters,
        distanceKm: parseFloat((distanceMeters / 1000).toFixed(2))
      });
    } catch (err) {
      console.error('❌ PostGIS computation failed, falling back to math formula...', err.message);
      // Math fallback inside express if DB query errors out
      let distanceMeters = 0;
      const vendorCoords = VENDOR_COORDINATES[restaurantId];
      if (vendorCoords) {
        distanceMeters = Math.round(calculateHaversineDistance(lat, lng, vendorCoords.lat, vendorCoords.lng));
      }
      res.json({
        success: true,
        mode: 'Haversine Fallback',
        lat,
        lng,
        distanceMeters,
        distanceKm: parseFloat((distanceMeters / 1000).toFixed(2))
      });
    }
  } else {
    // Local JSON Mode: update local coordinates & compute using Haversine
    const courierIdx = localDb.couriers.findIndex(c => c.id === courierId);
    if (courierIdx !== -1) {
      localDb.couriers[courierIdx].lat = lat;
      localDb.couriers[courierIdx].lng = lng;
      saveLocalDb();
    }

    let distanceMeters = 0;
    const vendor = localDb.vendors.find(v => v.id === restaurantId);
    if (vendor) {
      distanceMeters = Math.round(calculateHaversineDistance(lat, lng, vendor.lat, vendor.lng));
    } else {
      const vendorCoords = VENDOR_COORDINATES[restaurantId];
      if (vendorCoords) {
        distanceMeters = Math.round(calculateHaversineDistance(lat, lng, vendorCoords.lat, vendorCoords.lng));
      }
    }

    res.json({
      success: true,
      mode: 'Haversine JS Spheroid Math',
      lat,
      lng,
      distanceMeters,
      distanceKm: parseFloat((distanceMeters / 1000).toFixed(2))
    });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 POLONEZ Express Server running on http://localhost:${PORT}`);
  console.log(`👉 Mode: ${usePostgres ? '🟢 DATABASE MODE (PostgreSQL + PostGIS)' : '🟡 FALLBACK MODE (Local json + JS Math)'}`);
  console.log(`==================================================\n`);
});
