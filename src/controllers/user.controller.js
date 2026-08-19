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

const verifyPaymentDepartmentPasscode = async (req, res, next) => {
  try {
    const { passcode } = req.body;
    console.log(req.user);
    const user = await userService.verifyPaymentDepartmentPasscode(req.user,passcode);
    // Don't expose sensitive fields
    const sanitizedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      // add more fields as needed, but avoid sensitive ones
    };
    return sendSuccess(res, 200, 'Passcode valid', sanitizedUser);
  } catch (error) {
    next(error);
  }
};

const verifyVerificationPasscode = async (req, res, next) => {
  try {
    const { passcode } = req.body;
    const user = await userService.verifyVerificationPasscode(req.user, passcode);
    // Don't expose sensitive fields
    const sanitizedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      // add more fields as needed, but avoid sensitive ones
    };
    return sendSuccess(res, 200, 'Verification passcode valid', sanitizedUser);
  } catch (error) {
    next(error);
  }
};

const verifyCostManagementPasscode = async (req, res, next) => {
  try {
    const { passcode } = req.body;
    const user = await userService.verifyCostManagementPasscode(req.user, passcode);
    // Don't expose sensitive fields
    const sanitizedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      // add more fields as needed, but avoid sensitive ones
    };
    return sendSuccess(res, 200, 'Cost management passcode valid', sanitizedUser);
  } catch (error) {
    next(error);
  }
};






module.exports = { getUsers, createUser, updateUser, deleteUser, updateUserStatus, verifyPaymentDepartmentPasscode, verifyVerificationPasscode, verifyCostManagementPasscode };
