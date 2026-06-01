import { verifyToken } from '../utils/authUtils.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please log in to access this action!' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again!' });
  }

  req.user = decoded;
  next();
}

export function authorizeOwner(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'User is not authenticated!' });
  }

  const targetId = req.params.id || req.body.customerId || req.body.courierId || req.query.customerId;

  if (req.user.role === 'admin') {
    return next();
  }

  if (targetId && req.user.id !== targetId) {
    return res.status(403).json({ error: 'Access denied: you are not the owner of this profile!' });
  }

  next();
}
