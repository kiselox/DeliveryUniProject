// backend/controllers/vendorsController.js
import { pool, usePostgres, localDb, saveLocalDb } from '../db.js';

export const getVendors = async (req, res, next) => {
  try {
    if (usePostgres) {
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
    } else {
      res.json(localDb.vendors);
    }
  } catch (err) {
    next(err);
  }
};

export const getVendorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (usePostgres) {
      const result = await pool.query(`
        SELECT id, name, cuisine, image_url, hero_image, menu,
               ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
        FROM vendors WHERE id = $1
      `, [id]);
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
    } else {
      const v = localDb.vendors.find(item => item.id === id);
      if (!v) return res.status(404).json({ error: 'Vendor not found' });
      res.json(v);
    }
  } catch (err) {
    next(err);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (usePostgres) {
      const result = await pool.query(`
        SELECT id, name, last_name as "lastName", email, phone, address,
               ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
        FROM customers WHERE id = $1
      `, [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
      res.json(result.rows[0]);
    } else {
      const c = localDb.customers.find(item => item.id === id);
      if (!c) return res.status(404).json({ error: 'Customer not found' });
      res.json(c);
    }
  } catch (err) {
    next(err);
  }
};

export const getCustomers = async (req, res, next) => {
  try {
    if (usePostgres) {
      const result = await pool.query(`
        SELECT id, name, last_name as "lastName", email, phone, address,
               ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
        FROM customers
      `);
      res.json(result.rows);
    } else {
      res.json(localDb.customers || []);
    }
  } catch (err) {
    next(err);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const { name, lastName, email, phone, address, lat, lng } = req.body;
    if (!name || !lastName || !email || !phone || !address) {
      return res.status(400).json({ error: 'Имя, фамилия, email, телефон и адрес обязательны!' });
    }
    const id = 'c_' + Date.now();
    const customerLat = lat !== undefined ? parseFloat(lat) : 52.4140;
    const customerLng = lng !== undefined ? parseFloat(lng) : 16.9295;

    if (usePostgres) {
      await pool.query(
        `INSERT INTO customers (id, name, last_name, email, phone, address, location) 
         VALUES ($1, $2, $3, $4, $5, $6, ST_MakePoint($7, $8)::geography)`,
        [id, name, lastName, email, phone, address, customerLng, customerLat]
      );
      res.status(201).json({ id, name, lastName, email, phone, address, lat: customerLat, lng: customerLng });
    } else {
      const newCustomer = { id, name, lastName, email, phone, address, lat: customerLat, lng: customerLng };
      if (!localDb.customers) localDb.customers = [];
      localDb.customers.push(newCustomer);
      saveLocalDb();
      res.status(201).json(newCustomer);
    }
  } catch (err) {
    next(err);
  }
};
