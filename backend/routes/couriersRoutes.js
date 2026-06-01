// backend/routes/couriersRoutes.js
import express from 'express';
import { getCouriers, getCourierById, createCourier } from '../controllers/couriersController.js';
import { requireAuth, authorizeOwner } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getCouriers);
router.get('/:id', requireAuth, authorizeOwner, getCourierById);
router.post('/', createCourier);

export default router;
