import { pool, usePostgres, localDb, saveLocalDb } from '../db.js';
import { calculateHaversineDistance } from '../utils/haversine.js';
import { VENDOR_COORDINATES } from '../config/poznanAddresses.js';

export const getCouriers = async () => {
  if (usePostgres) {
    const result = await pool.query(`
      SELECT id, name, last_name as "lastName", email, phone, vehicle, rating,
             ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
      FROM couriers
    `);
    return {
      status: 200,
      data: result.rows.map(row => ({
        ...row,
        rating: row.rating ? parseFloat(row.rating) : null
      }))
    };
  } else {
    return {
      status: 200,
      data: localDb.couriers
    };
  }
};

export const getCourierById = async (id) => {
  if (usePostgres) {
    const result = await pool.query(`
      SELECT id, name, last_name as "lastName", email, phone, vehicle, rating,
             ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
      FROM couriers WHERE id = $1
    `, [id]);
    if (result.rows.length === 0) return { status: 404, error: 'Courier not found' };
    return {
      status: 200,
      data: {
        ...result.rows[0],
        rating: result.rows[0].rating ? parseFloat(result.rows[0].rating) : null
      }
    };
  } else {
    const c = localDb.couriers.find(item => item.id === id);
    if (!c) return { status: 404, error: 'Courier not found' };
    return { status: 200, data: c };
  }
};

export const updateCourierLocation = async ({ courierId, lat, lng, restaurantId }) => {
  if (!courierId || lat === undefined || lng === undefined) {
    return { status: 400, error: 'Missing courierId, lat, or lng in request body' };
  }

  if (usePostgres) {
    await pool.query(
      `UPDATE couriers 
       SET location = ST_MakePoint($2, $3)::geography 
       WHERE id = $1`,
      [courierId, lng, lat]
    );

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

    return {
      status: 200,
      data: {
        success: true,
        mode: 'PostGIS Spheroid',
        lat,
        lng,
        distanceMeters,
        distanceKm: parseFloat((distanceMeters / 1000).toFixed(2))
      }
    };
  } else {
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

    return {
      status: 200,
      data: {
        success: true,
        mode: 'Haversine JS Spheroid Math',
        lat,
        lng,
        distanceMeters,
        distanceKm: parseFloat((distanceMeters / 1000).toFixed(2))
      }
    };
  }
};

export const createCourier = async ({ name, lastName, email, phone, vehicle }) => {
  if (!name || !lastName || !email || !phone || !vehicle) {
    return { status: 400, error: 'First name, last name, email, phone, and vehicle type are required!' };
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
    return {
      status: 201,
      data: { id, name, lastName, email, phone, vehicle, lat: courierLat, lng: courierLng }
    };
  } else {
    const newCourier = { id, name, lastName, email, phone, vehicle, lat: courierLat, lng: courierLng };
    if (!localDb.couriers) localDb.couriers = [];
    localDb.couriers.push(newCourier);
    saveLocalDb();
    return {
      status: 201,
      data: newCourier
    };
  }
};
