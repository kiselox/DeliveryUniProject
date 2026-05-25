// backend/routes/couriersRoutes.js
import express from 'express';
import { getCouriers, getCourierById, createCourier } from '../controllers/couriersController.js';

const router = express.Router();

router.get('/', getCouriers);
router.get('/:id', getCourierById);
router.post('/', createCourier);

export default router;
