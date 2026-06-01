import { pool, usePostgres, localDb, saveLocalDb } from '../db.js';
import { hashPassword } from '../utils/authUtils.js';

export const getVendors = async () => {
  if (usePostgres) {
    const result = await pool.query(`
      SELECT id, name, cuisine, image_url, hero_image, menu, rating,
             ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
      FROM vendors
    `);
    return {
      status: 200,
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        cuisine: row.cuisine,
        imageUrl: row.image_url,
        heroImage: row.hero_image,
        menu: row.menu,
        rating: row.rating ? parseFloat(row.rating) : null,
        lat: row.lat,
        lng: row.lng
      }))
    };
  } else {
    return {
      status: 200,
      data: localDb.vendors
    };
  }
};

export const getVendorById = async (id) => {
  if (usePostgres) {
    const result = await pool.query(`
      SELECT id, name, cuisine, image_url, hero_image, menu, rating,
             ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
      FROM vendors WHERE id = $1
    `, [id]);
    if (result.rows.length === 0) return { status: 404, error: 'Vendor not found' };
    const row = result.rows[0];
    return {
      status: 200,
      data: {
        id: row.id,
        name: row.name,
        cuisine: row.cuisine,
        imageUrl: row.image_url,
        heroImage: row.hero_image,
        menu: row.menu,
        rating: row.rating ? parseFloat(row.rating) : null,
        lat: row.lat,
        lng: row.lng
      }
    };
  } else {
    const v = localDb.vendors.find(item => item.id === id);
    if (!v) return { status: 404, error: 'Vendor not found' };
    return {
      status: 200,
      data: v
    };
  }
};

export const getCustomerById = async (id) => {
  if (usePostgres) {
    const result = await pool.query(`
      SELECT id, name, last_name as "lastName", email, phone, address,
             ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng,
             house, apartment, floor, notes
      FROM customers WHERE id = $1
    `, [id]);
    if (result.rows.length === 0) return { status: 404, error: 'Customer not found' };
    return {
      status: 200,
      data: result.rows[0]
    };
  } else {
    const c = localDb.customers.find(item => item.id === id);
    if (!c) return { status: 404, error: 'Customer not found' };
    return {
      status: 200,
      data: c
    };
  }
};

export const getCustomers = async () => {
  if (usePostgres) {
    const result = await pool.query(`
      SELECT id, name, last_name as "lastName", email, phone, address,
             ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
      FROM customers
    `);
    return {
      status: 200,
      data: result.rows
    };
  } else {
    return {
      status: 200,
      data: localDb.customers || []
    };
  }
};

export const createCustomer = async ({ name, lastName, email, phone, address, lat, lng }) => {
  if (!name || !lastName || !email || !phone || !address) {
    return { status: 400, error: 'First name, last name, email, phone, and address are required!' };
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
    return {
      status: 201,
      data: { id, name, lastName, email, phone, address, lat: customerLat, lng: customerLng }
    };
  } else {
    const newCustomer = { id, name, lastName, email, phone, address, lat: customerLat, lng: customerLng };
    if (!localDb.customers) localDb.customers = [];
    localDb.customers.push(newCustomer);
    saveLocalDb();
    return {
      status: 201,
      data: newCustomer
    };
  }
};

export const updateCustomer = async (id, { name, lastName, phone, address, password, house, apartment, floor, notes, lat, lng }) => {
  const hashedPassword = password ? hashPassword(password) : null;

  if (usePostgres) {
    const checkRes = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return { status: 404, error: 'Customer not found' };
    }

    await pool.query(
      `UPDATE customers 
       SET name = COALESCE($1, name), 
           last_name = COALESCE($2, last_name), 
           phone = COALESCE($3, phone), 
           address = COALESCE($4, address),
           password = COALESCE($5, password),
           house = COALESCE($6, house),
           apartment = COALESCE($7, apartment),
           floor = COALESCE($8, floor),
           notes = COALESCE($9, notes),
           location = CASE 
             WHEN $10::numeric IS NOT NULL AND $11::numeric IS NOT NULL THEN ST_MakePoint($11, $10)::geography 
             ELSE location 
           END
       WHERE id = $12`,
      [name, lastName, phone, address, hashedPassword, house, apartment, floor, notes, lat, lng, id]
    );

    const result = await pool.query(
      `SELECT id, name, last_name as "lastName", email, phone, address,
              ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng,
              house, apartment, floor, notes
       FROM customers WHERE id = $1`,
      [id]
    );
    return {
      status: 200,
      data: result.rows[0]
    };
  } else {
    const customerIndex = localDb.customers.findIndex(item => item.id === id);
    if (customerIndex === -1) {
      return { status: 404, error: 'Customer not found' };
    }

    const updatedCustomer = {
      ...localDb.customers[customerIndex],
      name: name !== undefined ? name : localDb.customers[customerIndex].name,
      lastName: lastName !== undefined ? lastName : localDb.customers[customerIndex].lastName,
      phone: phone !== undefined ? phone : localDb.customers[customerIndex].phone,
      address: address !== undefined ? address : localDb.customers[customerIndex].address,
      password: password ? hashPassword(password) : localDb.customers[customerIndex].password,
      house: house !== undefined ? house : localDb.customers[customerIndex].house,
      apartment: apartment !== undefined ? apartment : localDb.customers[customerIndex].apartment,
      floor: floor !== undefined ? floor : localDb.customers[customerIndex].floor,
      notes: notes !== undefined ? notes : localDb.customers[customerIndex].notes,
      lat: lat !== undefined ? parseFloat(lat) : localDb.customers[customerIndex].lat,
      lng: lng !== undefined ? parseFloat(lng) : localDb.customers[customerIndex].lng,
    };

    localDb.customers[customerIndex] = updatedCustomer;
    saveLocalDb();
    return {
      status: 200,
      data: updatedCustomer
    };
  }
};
