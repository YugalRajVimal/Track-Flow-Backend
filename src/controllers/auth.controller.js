const authService = require('../services/auth.service');
const { sendSuccess, sendError } = require('../utils/response');

const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    return sendSuccess(res, 200, 'Login successful', data);
  } catch (error) {
    next(error);
  }
};

module.exports = { login };
