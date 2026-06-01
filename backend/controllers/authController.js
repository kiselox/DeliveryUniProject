// backend/controllers/authController.js
import { pool, usePostgres, localDb, saveLocalDb } from '../db.js';
import { hashPassword, generateToken, verifyToken } from '../utils/authUtils.js';

export const verify = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Токен отсутствует!' });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Неверный или просроченный токен сессии!' });

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
      return res.status(404).json({ error: 'Пользователь не найден!' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: decoded.role
      }
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { role, email, password } = req.body;
    if (!role || !email || !password) {
      return res.status(400).json({ error: 'Пожалуйста, заполните Email, пароль и выберите роль!' });
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
      return res.status(401).json({ error: 'Неверный адрес электронной почты или пароль!' });
    }

    // Generate token
    const token = generateToken({ id: user.id, email: user.email, name: user.name, role });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role
      }
    });
  } catch (err) {
    next(err);
  }
};

export const registerCustomer = async (req, res, next) => {
  try {
    const { name, lastName, email, phone, address, lat, lng, password } = req.body;

    if (!name || !lastName || !email || !phone || !address || !password) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения!' });
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Check uniqueness
    let exists = false;
    if (usePostgres) {
      const result = await pool.query('SELECT id FROM customers WHERE email = $1', [emailTrimmed]);
      exists = result.rows.length > 0;
    } else {
      exists = localDb.customers.some(c => (c.email || '').toLowerCase() === emailTrimmed);
    }

    if (exists) {
      return res.status(400).json({ error: 'Клиент с таким email уже зарегистрирован!' });
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

    res.status(201).json({
      token,
      user: {
        id,
        name: name.trim(),
        lastName: lastName.trim(),
        email: emailTrimmed,
        phone: phone.trim(),
        role: 'customer'
      }
    });
  } catch (err) {
    next(err);
  }
};

export const registerCourier = async (req, res, next) => {
  try {
    const { name, lastName, email, phone, vehicle, password } = req.body;

    if (!name || !lastName || !email || !phone || !vehicle || !password) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения!' });
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Check uniqueness
    let exists = false;
    if (usePostgres) {
      const result = await pool.query('SELECT id FROM couriers WHERE email = $1', [emailTrimmed]);
      exists = result.rows.length > 0;
    } else {
      exists = localDb.couriers.some(c => (c.email || '').toLowerCase() === emailTrimmed);
    }

    if (exists) {
      return res.status(400).json({ error: 'Курьер с таким email уже зарегистрирован!' });
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

    res.status(201).json({
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
    });
  } catch (err) {
    next(err);
  }
};

export const developerBypass = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) {
      return res.status(400).json({ error: 'Не указан userId или роль!' });
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

    // Default mock data if the user doesn't exist yet
    if (!user) {
      user = {
        id: userId,
        name: userId === 'c1' ? 'Денис' : 'Курьер ' + userId.replace(/^\D+/g, ''),
        lastName: 'Тест',
        email: `${userId}@polonez-delivery.pl`,
        phone: '+48 000 000 000'
      };
    }

    const token = generateToken({ id: user.id, email: user.email, name: user.name, role });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role
      }
    });
  } catch (err) {
    next(err);
  }
};
