const express = require('express');
const router = express.Router();
const { login } = require('../controllers/auth.controller');
const { loginValidator } = require('../validators/auth.validator');
const { validate } = require('../middleware/validate');

router.post('/login', loginValidator, validate, login);

module.exports = router;
