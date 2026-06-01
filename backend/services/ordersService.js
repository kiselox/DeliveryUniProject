import { pool, usePostgres, localDb, saveLocalDb, settings } from '../db.js';
import { calculateHaversineDistance } from '../utils/haversine.js';
import { normalizeText } from '../utils/normalizer.js';
import { POZNAN_ADDRESSES } from '../config/poznanAddresses.js';

const recalculateVendorRating = (vendorId) => {
  const ratedOrders = localDb.orders.filter(o => o.vendorId === vendorId && o.ratingRestaurant !== null && o.ratingRestaurant !== undefined);
  if (ratedOrders.length > 0) {
    const sum = ratedOrders.reduce((acc, o) => acc + o.ratingRestaurant, 0);
    const avg = parseFloat((sum / ratedOrders.length).toFixed(1));
    const vendorIdx = localDb.vendors.findIndex(v => v.id === vendorId);
    if (vendorIdx !== -1) {
      localDb.vendors[vendorIdx].rating = avg;
    }
  }
};

const recalculateCourierRating = (courierId) => {
  if (!courierId) return;
  const ratedOrders = localDb.orders.filter(o => o.courierId === courierId && o.ratingCourier !== null && o.ratingCourier !== undefined);
  if (ratedOrders.length > 0) {
    const sum = ratedOrders.reduce((acc, o) => acc + o.ratingCourier, 0);
    const avg = parseFloat((sum / ratedOrders.length).toFixed(1));
    const courierIdx = localDb.couriers.findIndex(c => c.id === courierId);
    if (courierIdx !== -1) {
      localDb.couriers[courierIdx].rating = avg;
    }
  }
};

const recalculateVendorRatingPG = async (vendorId) => {
  const avgResult = await pool.query(
    'SELECT AVG(rating_restaurant) as avg_rating FROM orders WHERE vendor_id = $1 AND rating_restaurant IS NOT NULL',
    [vendorId]
  );
  if (avgResult.rows.length > 0 && avgResult.rows[0].avg_rating !== null) {
    const avg = parseFloat(parseFloat(avgResult.rows[0].avg_rating).toFixed(1));
    await pool.query('UPDATE vendors SET rating = $1 WHERE id = $2', [avg, vendorId]);
  }
};

const recalculateCourierRatingPG = async (courierId) => {
  if (!courierId) return;
  const avgResult = await pool.query(
    'SELECT AVG(rating_courier) as avg_rating FROM orders WHERE courier_id = $1 AND rating_courier IS NOT NULL',
    [courierId]
  );
  if (avgResult.rows.length > 0 && avgResult.rows[0].avg_rating !== null) {
    const avg = parseFloat(parseFloat(avgResult.rows[0].avg_rating).toFixed(1));
    await pool.query('UPDATE couriers SET rating = $1 WHERE id = $2', [avg, courierId]);
  }
};

export const getOrders = async () => {
  if (usePostgres) {
    const result = await pool.query('SELECT * FROM orders');
    return {
      status: 200,
      data: result.rows.map(row => ({
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
        acceptedAt: row.accepted_at,
        pickedUpAt: row.picked_up_at,
        deliveryAddress: row.delivery_address,
        deliveryLat: parseFloat(row.delivery_lat),
        deliveryLng: parseFloat(row.delivery_lng),
        house: row.house,
        apartment: row.apartment,
        floor: row.floor,
        notes: row.notes,
        phone: row.phone,
        coefficient: row.coefficient ? parseFloat(row.coefficient) : 1.0,
        ratingCourier: row.rating_courier ? parseInt(row.rating_courier) : null,
        ratingRestaurant: row.rating_restaurant ? parseInt(row.rating_restaurant) : null
      }))
    };
  } else {
    const ordersWithCoeff = localDb.orders.map(o => ({
      ...o,
      coefficient: o.coefficient ? parseFloat(o.coefficient) : 1.0
    }));
    return {
      status: 200,
      data: ordersWithCoeff
    };
  }
};

export const createOrder = async (o) => {
  const newId = o.id || Math.random().toString(36).substring(2, 11);
  const status = o.status || 'Ready for Pickup';
  const createdAt = o.createdAt || new Date().toISOString();

  const deliveryAddress = o.deliveryAddress || "Poznań Dormitory CDV";
  let deliveryLat = parseFloat(o.deliveryLat);
  let deliveryLng = parseFloat(o.deliveryLng);

  const house = o.house || "";
  const apartment = o.apartment || "";
  const floor = o.floor || "";
  const notes = o.notes || "";
  const phone = o.phone || "";

  if (isNaN(deliveryLat) || isNaN(deliveryLng)) {
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
      deliveryLat = 52.406374 + (Math.random() - 0.5) * 0.02;
      deliveryLng = 16.925168 + (Math.random() - 0.5) * 0.02;
    }
  }

  let vendorLat = 52.4064;
  let vendorLng = 16.9252;

  if (usePostgres) {
    const vendorRes = await pool.query(`
      SELECT ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng 
      FROM vendors WHERE id = $1
    `, [o.vendorId]);
    if (vendorRes.rows.length > 0) {
      vendorLat = parseFloat(vendorRes.rows[0].lat);
      vendorLng = parseFloat(vendorRes.rows[0].lng);
    }
  } else {
    const vendor = localDb.vendors.find(v => v.id === o.vendorId);
    if (vendor) {
      vendorLat = vendor.lat;
      vendorLng = vendor.lng;
    }
  }

  const distanceMeters = calculateHaversineDistance(deliveryLat, deliveryLng, vendorLat, vendorLng);
  const distanceKm = parseFloat((distanceMeters / 1000).toFixed(1));

  const clientFee = parseFloat(o.fee) || 0;
  const clientTotal = parseFloat(o.totalPrice) || 0;
  const foodPrice = Math.max(0, clientTotal - clientFee);

  const computedFee = Math.max(5.00, Math.round(distanceKm * settings.pricePerKm + settings.globalSurcharge));
  const finalTotalPrice = foodPrice > 0 ? (foodPrice + computedFee) : (40 + computedFee);

  if (usePostgres) {
    await pool.query(`
      INSERT INTO orders (id, customer_id, vendor_id, vendor_name, items, status, distance, fee, total_price, courier_id, created_at, delivery_address, delivery_lat, delivery_lng, house, apartment, floor, notes, phone, coefficient)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `, [
      newId, o.customerId, o.vendorId, o.vendorName, o.items, status, 
      distanceKm, computedFee, finalTotalPrice, o.courierId || null, createdAt,
      deliveryAddress, deliveryLat, deliveryLng, house, apartment, floor, notes, phone,
      1.0
    ]);

    return {
      status: 201,
      data: {
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
      }
    };
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
    return {
      status: 201,
      data: newOrder
    };
  }
};

export const updateOrder = async (orderId, updates) => {
  if (usePostgres) {
    const fields = [];
    const values = [];
    let idx = 1;
    
    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
      if (updates.status === "Accepted") {
        fields.push(`accepted_at = $${idx++}`);
        values.push(new Date().toISOString());
      } else if (updates.status === "Picked Up") {
        fields.push(`picked_up_at = $${idx++}`);
        values.push(new Date().toISOString());
      } else if (updates.status === "Cancelled") {
        fields.push(`courier_id = $${idx++}`);
        values.push(null);
      }
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
    if (updates.ratingCourier !== undefined) {
      fields.push(`rating_courier = $${idx++}`);
      values.push(updates.ratingCourier !== null ? parseInt(updates.ratingCourier) : null);
    }
    if (updates.ratingRestaurant !== undefined) {
      fields.push(`rating_restaurant = $${idx++}`);
      values.push(updates.ratingRestaurant !== null ? parseInt(updates.ratingRestaurant) : null);
    }

    if (fields.length === 0) {
      return { status: 400, error: 'No fields to update' };
    }

    values.push(orderId);
    const query = `UPDATE orders SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) return { status: 404, error: 'Order not found' };
    
    const row = result.rows[0];

    if (updates.ratingCourier !== undefined || updates.ratingRestaurant !== undefined) {
      if (updates.ratingRestaurant !== undefined && row.vendor_id) {
        await recalculateVendorRatingPG(row.vendor_id);
      }
      if (updates.ratingCourier !== undefined && row.courier_id) {
        await recalculateCourierRatingPG(row.courier_id);
      }
    }

    return {
      status: 200,
      data: {
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
        acceptedAt: row.accepted_at,
        pickedUpAt: row.picked_up_at,
        deliveryAddress: row.delivery_address,
        deliveryLat: parseFloat(row.delivery_lat),
        deliveryLng: parseFloat(row.delivery_lng),
        house: row.house,
        apartment: row.apartment,
        floor: row.floor,
        notes: row.notes,
        phone: row.phone,
        coefficient: row.coefficient ? parseFloat(row.coefficient) : 1.0,
        ratingCourier: row.rating_courier ? parseInt(row.rating_courier) : null,
        ratingRestaurant: row.rating_restaurant ? parseInt(row.rating_restaurant) : null
      }
    };
  } else {
    const orderIdx = localDb.orders.findIndex(o => o.id === orderId);
    if (orderIdx === -1) return { status: 404, error: 'Order not found' };
    
    if (updates.coefficient !== undefined) {
      updates.coefficient = parseFloat(updates.coefficient);
    }
    if (updates.ratingCourier !== undefined) {
      updates.ratingCourier = updates.ratingCourier !== null ? parseInt(updates.ratingCourier) : null;
    }
    if (updates.ratingRestaurant !== undefined) {
      updates.ratingRestaurant = updates.ratingRestaurant !== null ? parseInt(updates.ratingRestaurant) : null;
    }

    if (updates.status === "Accepted") {
      updates.acceptedAt = new Date().toISOString();
    } else if (updates.status === "Picked Up") {
      updates.pickedUpAt = new Date().toISOString();
    } else if (updates.status === "Cancelled") {
      updates.courierId = null;
    }
    
    localDb.orders[orderIdx] = {
      ...localDb.orders[orderIdx],
      ...updates
    };

    if (updates.ratingCourier !== undefined || updates.ratingRestaurant !== undefined) {
      const order = localDb.orders[orderIdx];
      if (updates.ratingRestaurant !== undefined && order.vendorId) {
        recalculateVendorRating(order.vendorId);
      }
      if (updates.ratingCourier !== undefined && order.courierId) {
        recalculateCourierRating(order.courierId);
      }
    }

    saveLocalDb();
    
    const resOrder = {
      ...localDb.orders[orderIdx],
      coefficient: localDb.orders[orderIdx].coefficient ? parseFloat(localDb.orders[orderIdx].coefficient) : 1.0
    };
    return {
      status: 200,
      data: resOrder
    };
  }
};
