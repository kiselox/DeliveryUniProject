// backend/controllers/couriersController.js
import { pool, usePostgres, localDb, saveLocalDb } from '../db.js';
import { calculateHaversineDistance } from '../utils/haversine.js';
import { VENDOR_COORDINATES } from '../config/poznanAddresses.js';

export const getCouriers = async (req, res, next) => {
  try {
    if (usePostgres) {
      const result = await pool.query(`
        SELECT id, name, last_name as "lastName", email, phone, vehicle,
               ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
        FROM couriers
      `);
      res.json(result.rows);
    } else {
      res.json(localDb.couriers);
    }
  } catch (err) {
    next(err);
  }
};

export const getCourierById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (usePostgres) {
      const result = await pool.query(`
        SELECT id, name, last_name as "lastName", email, phone, vehicle,
               ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
        FROM couriers WHERE id = $1
      `, [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Courier not found' });
      res.json(result.rows[0]);
    } else {
      const c = localDb.couriers.find(item => item.id === id);
      if (!c) return res.status(404).json({ error: 'Courier not found' });
      res.json(c);
    }
  } catch (err) {
    next(err);
  }
};

export const updateCourierLocation = async (req, res, next) => {
  try {
    const { courierId, lat, lng, restaurantId } = req.body;

    if (!courierId || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Missing courierId, lat, or lng in request body' });
    }

    if (usePostgres) {
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
  } catch (err) {
    next(err);
  }
};

export const createCourier = async (req, res, next) => {
  try {
    const { name, lastName, email, phone, vehicle } = req.body;
    if (!name || !lastName || !email || !phone || !vehicle) {
      return res.status(400).json({ error: 'Имя, фамилия, email, телефон и тип транспорта обязательны!' });
    }
    const id = 'cour_' + Date.now();
    const courierLat = 52.4140;
    const courierLng = 16.9295;

    if (usePostgres) {
      await pool.query(
        `INSERT INTO couriers (id, name, last_name, email, phone, vehicle, location) 
         VALUES ($1, $2, $3, $4, $5, $6, ST_MakePoint($7, $8)::geography)`,
        [id, name, lastName, email, phone, vehicle, courierLng, courierLat]
      );
      res.status(201).json({ id, name, lastName, email, phone, vehicle, lat: courierLat, lng: courierLng });
    } else {
      const newCourier = { id, name, lastName, email, phone, vehicle, lat: courierLat, lng: courierLng };
      if (!localDb.couriers) localDb.couriers = [];
      localDb.couriers.push(newCourier);
      saveLocalDb();
      res.status(201).json(newCourier);
    }
  } catch (err) {
    next(err);
  }
};
