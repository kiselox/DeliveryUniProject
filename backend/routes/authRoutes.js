// backend/routes/authRoutes.js
import express from 'express';
import { login, registerCustomer, registerCourier, verify, developerBypass } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/register/customer', registerCustomer);
router.post('/register/courier', registerCourier);
router.post('/verify', verify);
router.post('/developer-bypass', developerBypass);

export default router;
