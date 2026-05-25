// backend/routes/api.js
import express from 'express';
import settingsRoutes from './settingsRoutes.js';
import vendorsRoutes from './vendorsRoutes.js';
import couriersRoutes from './couriersRoutes.js';
import ordersRoutes from './ordersRoutes.js';
import supportRoutes from './supportRoutes.js';
import { getCustomerById, getCustomers, createCustomer } from '../controllers/vendorsController.js';
import { updateCourierLocation } from '../controllers/couriersController.js';

const router = express.Router();

// Mount sub-routers matching original paths exactly
router.use('/settings', settingsRoutes);
router.use('/vendors', vendorsRoutes);
router.use('/couriers', couriersRoutes);
router.use('/orders', ordersRoutes);
router.use('/support', supportRoutes);

// Customer management endpoints
router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.get('/customers/:id', getCustomerById);

router.post('/api/couriers/location', updateCourierLocation);

export default router;
