import * as authService from '../services/authService.js';

export const verify = async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await authService.verify(token);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { role, email, password } = req.body;
    const result = await authService.login({ role, email, password });
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};

export const registerCustomer = async (req, res, next) => {
  try {
    const { name, lastName, email, phone, address, lat, lng, password } = req.body;
    const result = await authService.registerCustomer({ name, lastName, email, phone, address, lat, lng, password });
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.status(201).json(result.data);
  } catch (err) {
    next(err);
  }
};

export const registerCourier = async (req, res, next) => {
  try {
    const { name, lastName, email, phone, vehicle, password } = req.body;
    const result = await authService.registerCourier({ name, lastName, email, phone, vehicle, password });
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.status(201).json(result.data);
  } catch (err) {
    next(err);
  }
};

export const developerBypass = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const result = await authService.developerBypass({ userId, role });
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};
