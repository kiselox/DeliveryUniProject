import express from 'express';
import { getOrders, createOrder, updateOrder } from '../controllers/ordersController.js';

const router = express.Router();

router.get('/', getOrders);
router.post('/', createOrder);
router.patch('/:id', updateOrder);

export default router;
