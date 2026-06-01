import * as vendorsService from '../services/vendorsService.js';

export const getVendors = async (req, res, next) => {
  try {
    const result = await vendorsService.getVendors();
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};

export const getVendorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await vendorsService.getVendorById(id);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await vendorsService.getCustomerById(id);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};

export const getCustomers = async (req, res, next) => {
  try {
    const result = await vendorsService.getCustomers();
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const { name, lastName, email, phone, address, lat, lng } = req.body;
    const result = await vendorsService.createCustomer({ name, lastName, email, phone, address, lat, lng });
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.status(201).json(result.data);
  } catch (err) {
    next(err);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, lastName, phone, address, password, house, apartment, floor, notes, lat, lng } = req.body;
    const result = await vendorsService.updateCustomer(id, { name, lastName, phone, address, password, house, apartment, floor, notes, lat, lng });
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};
