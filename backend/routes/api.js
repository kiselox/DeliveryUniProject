// backend/routes/api.js
import express from 'express';
import settingsRoutes from './settingsRoutes.js';
import vendorsRoutes from './vendorsRoutes.js';
import couriersRoutes from './couriersRoutes.js';
import ordersRoutes from './ordersRoutes.js';
import supportRoutes from './supportRoutes.js';
import authRoutes from './authRoutes.js';
import { getCustomerById, getCustomers, createCustomer, updateCustomer } from '../controllers/vendorsController.js';
import { updateCourierLocation } from '../controllers/couriersController.js';
import { requireAuth, authorizeOwner } from '../middleware/authMiddleware.js';

const router = express.Router();

// Mount authentication router
router.use('/auth', authRoutes);

// Mount sub-routers matching original paths exactly
router.use('/settings', settingsRoutes);
router.use('/vendors', vendorsRoutes);
router.use('/couriers', couriersRoutes);
router.use('/orders', ordersRoutes);
router.use('/support', supportRoutes);

// Customer management endpoints
router.get('/customers', getCustomers);
router.post('/customers', createCustomer); // Kept for backward compatibility, though registration goes via /auth/register
router.get('/customers/:id', requireAuth, authorizeOwner, getCustomerById);
router.patch('/customers/:id', requireAuth, authorizeOwner, updateCustomer);

router.post('/api/couriers/location', requireAuth, authorizeOwner, updateCourierLocation);

export default router;
