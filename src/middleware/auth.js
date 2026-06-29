const { verifyToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Authenticate Middleware: Authorization Header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Authenticate Middleware: No token provided or token does not start with Bearer');
      return sendError(res, 401, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];
    console.log('Authenticate Middleware: Extracted Token:', token);

    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('Authenticate Middleware: Decoded Token:', decoded);
    } catch (err) {
      console.log('Authenticate Middleware: Invalid or expired token.', err);
      return sendError(res, 401, 'Invalid or expired token.');
    }

    const user = await User.findById(decoded.id).select('-password');
    console.log('Authenticate Middleware: User Fetched:', user);

    if (!user) {
      console.log('Authenticate Middleware: User no longer exists.');
      return sendError(res, 401, 'User no longer exists.');
    }

    if (!user.isActive) {
      console.log('Authenticate Middleware: User account deactivated.');
      return sendError(res, 403, 'Your account has been deactivated.');
    }

    req.user = user;
    console.log('Authenticate Middleware: Authentication successful, proceeding to next middleware.');
    next();
  } catch (error) {
    console.log('Authenticate Middleware: Authentication error:', error);
    return sendError(res, 500, 'Authentication error.');
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Authorize Middleware: Required roles:', roles, '| User role:', req.user ? req.user.role : null);
    if (!roles.includes(req.user.role)) {
      console.log('Authorize Middleware: Permission denied for role:', req.user.role);
      return sendError(res, 403, 'You do not have permission to perform this action.');
    }
    console.log('Authorize Middleware: Authorization successful, proceeding to next middleware.');
    next();
  };
};

module.exports = { authenticate, authorize };
