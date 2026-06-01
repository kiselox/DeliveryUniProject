import * as ordersService from '../services/ordersService.js';

export const getOrders = async (req, res, next) => {
  try {
    const result = await ordersService.getOrders();
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};

export const createOrder = async (req, res, next) => {
  try {
    const result = await ordersService.createOrder(req.body);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.status(201).json(result.data);
  } catch (err) {
    next(err);
  }
};

export const updateOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const result = await ordersService.updateOrder(orderId, req.body);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};
