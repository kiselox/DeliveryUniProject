// backend/middleware/authMiddleware.js
import { verifyToken } from '../utils/authUtils.js';

/**
 * Authentication middleware that verifies the Bearer token in request headers.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Войдите в систему для доступа к этому действию!' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Сессия устарела или недействительна. Войдите заново!' });
  }

  req.user = decoded; // { id, role, email, name }
  next();
}

/**
 * Authorization middleware that ensures the authenticated user is the owner
 * of the resource or has an admin/support bypass.
 */
export function authorizeOwner(req, res, next) {
  // If no user object attached (should run after requireAuth)
  if (!req.user) {
    return res.status(401).json({ error: 'Пользователь не аутентифицирован!' });
  }

  const targetId = req.params.id || req.body.customerId || req.body.courierId || req.query.customerId;

  // Let admin role bypass owner check (e.g. support page actions)
  if (req.user.role === 'admin') {
    return next();
  }

  if (targetId && req.user.id !== targetId) {
    return res.status(403).json({ error: 'Доступ заблокирован: вы не являетесь владельцем этого профиля!' });
  }

  next();
}
