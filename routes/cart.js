const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const cartController = require('../controllers/cart');

const multer = require('multer');

router.post('addItemToCart', authMiddleware.authenticateUser, cartController.addItemToCart);

module.exports = router;
