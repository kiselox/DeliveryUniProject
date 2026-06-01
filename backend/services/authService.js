import { pool, usePostgres, localDb, saveLocalDb } from '../db.js';
import { hashPassword, generateToken, verifyToken } from '../utils/authUtils.js';

export const verify = async (token) => {
  if (!token) return { status: 400, error: 'Token is missing!' };

  const decoded = verifyToken(token);
  if (!decoded) return { status: 401, error: 'Invalid or expired session token!' };

  let user = null;

  if (usePostgres) {
    const table = decoded.role === 'customer' ? 'customers' : 'couriers';
    const result = await pool.query(
      `SELECT id, name, last_name as "lastName", email, phone 
       FROM ${table} WHERE id = $1`,
      [decoded.id]
    );
    if (result.rows.length > 0) {
      user = result.rows[0];
    }
  } else {
    const list = decoded.role === 'customer' ? localDb.customers : localDb.couriers;
    user = list.find(u => u.id === decoded.id);
  }

  if (!user) {
    return { status: 404, error: 'User not found!' };
  }

  return {
    status: 200,
    data: {
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: decoded.role
      }
    }
  };
};

export const login = async ({ role, email, password }) => {
  if (!role || !email || !password) {
    return { status: 400, error: 'Please enter your email, password, and select a role!' };
  }

  const hashed = hashPassword(password);
  let user = null;

  if (usePostgres) {
    const table = role === 'customer' ? 'customers' : 'couriers';
    const result = await pool.query(
      `SELECT id, name, last_name as "lastName", email, phone, password 
       FROM ${table} WHERE email = $1`,
      [email.trim().toLowerCase()]
    );
    if (result.rows.length > 0) {
      user = result.rows[0];
    }
  } else {
    const list = role === 'customer' ? localDb.customers : localDb.couriers;
    user = list.find(u => (u.email || '').toLowerCase() === email.trim().toLowerCase());
  }

  if (!user || user.password !== hashed) {
    return { status: 401, error: 'Invalid email address or password!' };
  }

  const token = generateToken({ id: user.id, email: user.email, name: user.name, role });

  return {
    status: 200,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role
      }
    }
  };
};

export const registerCustomer = async ({ name, lastName, email, phone, address, lat, lng, password }) => {
  if (!name || !lastName || !email || !phone || !address || !password) {
    return { status: 400, error: 'All fields are required!' };
  }

  const emailTrimmed = email.trim().toLowerCase();

  let exists;
  if (usePostgres) {
    const result = await pool.query('SELECT id FROM customers WHERE email = $1', [emailTrimmed]);
    exists = result.rows.length > 0;
  } else {
    exists = localDb.customers.some(c => (c.email || '').toLowerCase() === emailTrimmed);
  }

  if (exists) {
    return { status: 400, error: 'A customer with this email is already registered!' };
  }

  const id = 'c_' + Date.now();
  const customerLat = lat !== undefined ? parseFloat(lat) : 52.4140;
  const customerLng = lng !== undefined ? parseFloat(lng) : 16.9295;
  const hashed = hashPassword(password);

  if (usePostgres) {
    await pool.query(
      `INSERT INTO customers (id, name, last_name, email, phone, address, location, password) 
       VALUES ($1, $2, $3, $4, $5, $6, ST_MakePoint($7, $8)::geography, $9)`,
      [id, name.trim(), lastName.trim(), emailTrimmed, phone.trim(), address.trim(), customerLng, customerLat, hashed]
    );
  } else {
    const newCustomer = {
      id,
      name: name.trim(),
      lastName: lastName.trim(),
      email: emailTrimmed,
      phone: phone.trim(),
      address: address.trim(),
      lat: customerLat,
      lng: customerLng,
      password: hashed
    };
    if (!localDb.customers) localDb.customers = [];
    localDb.customers.push(newCustomer);
    saveLocalDb();
  }

  const token = generateToken({ id, email: emailTrimmed, name: name.trim(), role: 'customer' });

  return {
    status: 201,
    data: {
      token,
      user: {
        id,
        name: name.trim(),
        lastName: lastName.trim(),
        email: emailTrimmed,
        phone: phone.trim(),
        role: 'customer'
      }
    }
  };
};

export const registerCourier = async ({ name, lastName, email, phone, vehicle, password }) => {
  if (!name || !lastName || !email || !phone || !vehicle || !password) {
    return { status: 400, error: 'All fields are required!' };
  }

  const emailTrimmed = email.trim().toLowerCase();

  let exists;
  if (usePostgres) {
    const result = await pool.query('SELECT id FROM couriers WHERE email = $1', [emailTrimmed]);
    exists = result.rows.length > 0;
  } else {
    exists = localDb.couriers.some(c => (c.email || '').toLowerCase() === emailTrimmed);
  }

  if (exists) {
    return { status: 400, error: 'A courier with this email is already registered!' };
  }

  const id = 'cour_' + Date.now();
  const courierLat = 52.4140;
  const courierLng = 16.9295;
  const hashed = hashPassword(password);

  if (usePostgres) {
    await pool.query(
      `INSERT INTO couriers (id, name, last_name, email, phone, vehicle, location, password) 
       VALUES ($1, $2, $3, $4, $5, $6, ST_MakePoint($7, $8)::geography, $9)`,
      [id, name.trim(), lastName.trim(), emailTrimmed, phone.trim(), vehicle, courierLng, courierLat, hashed]
    );
  } else {
    const newCourier = {
      id,
      name: name.trim(),
      lastName: lastName.trim(),
      email: emailTrimmed,
      phone: phone.trim(),
      vehicle,
      lat: courierLat,
      lng: courierLng,
      password: hashed
    };
    if (!localDb.couriers) localDb.couriers = [];
    localDb.couriers.push(newCourier);
    saveLocalDb();
  }

  const token = generateToken({ id, email: emailTrimmed, name: name.trim(), role: 'courier' });

  return {
    status: 201,
    data: {
      token,
      user: {
        id,
        name: name.trim(),
        lastName: lastName.trim(),
        email: emailTrimmed,
        phone: phone.trim(),
        vehicle,
        role: 'courier'
      }
    }
  };
};

export const developerBypass = async ({ userId, role }) => {
  if (!userId || !role) {
    return { status: 400, error: 'userId or role not specified!' };
  }

  let user = null;

  if (usePostgres) {
    const table = role === 'customer' ? 'customers' : 'couriers';
    const result = await pool.query(
      `SELECT id, name, last_name as "lastName", email, phone 
       FROM ${table} WHERE id = $1`,
      [userId]
    );
    if (result.rows.length > 0) {
      user = result.rows[0];
    }
  } else {
    const list = role === 'customer' ? localDb.customers : localDb.couriers;
    user = list.find(u => u.id === userId);
  }

  if (!user) {
    user = {
      id: userId,
      name: userId === 'c1' ? 'Denis' : 'Courier ' + userId.replace(/^\D+/g, ''),
      lastName: 'Test',
      email: `${userId}@polonez-delivery.pl`,
      phone: '+48 000 000 000'
    };
  }

  const token = generateToken({ id: user.id, email: user.email, name: user.name, role });

  return {
    status: 200,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role
      }
    }
  };
};
