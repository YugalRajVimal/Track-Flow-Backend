const userService = require('../services/user.service');
const { sendSuccess } = require('../utils/response');

const getMeta = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const { users, pagination } = await userService.getUsers({ page, limit, search });
    return sendSuccess(res, 200, 'Users fetched successfully', users, pagination);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body, req.user._id, getMeta(req));
    return sendSuccess(res, 201, 'User created successfully', user);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user._id, getMeta(req));
    return sendSuccess(res, 200, 'User updated successfully', user);
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id, req.user._id, getMeta(req));
    return sendSuccess(res, 200, 'User deleted successfully', {});
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await userService.updateUserStatus(req.params.id, isActive, req.user._id, getMeta(req));
    return sendSuccess(res, 200, `User ${isActive ? 'activated' : 'deactivated'} successfully`, user);
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser, updateUserStatus };
