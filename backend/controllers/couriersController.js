import * as couriersService from '../services/couriersService.js';

export const getCouriers = async (req, res, next) => {
  try {
    const result = await couriersService.getCouriers();
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};

export const getCourierById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await couriersService.getCourierById(id);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};

export const updateCourierLocation = async (req, res, next) => {
  try {
    const { courierId, lat, lng, restaurantId } = req.body;
    const result = await couriersService.updateCourierLocation({ courierId, lat, lng, restaurantId });
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};

export const createCourier = async (req, res, next) => {
  try {
    const { name, lastName, email, phone, vehicle } = req.body;
    const result = await couriersService.createCourier({ name, lastName, email, phone, vehicle });
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.status(201).json(result.data);
  } catch (err) {
    next(err);
  }
};
