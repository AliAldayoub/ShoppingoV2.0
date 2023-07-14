const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const cartController = require('../controllers/cart');

const multer = require('multer');

router.get('/getCart', authMiddleware.authenticateUser, cartController.getCart);
router.post('/addItemToCart', authMiddleware.authenticateUser, cartController.addItemToCart);
router.delete('/deleteItemFromCart/:id', authMiddleware.authenticateUser, cartController.deleteItemFromCart);
router.delete('/deleteCartItems', authMiddleware.authenticateUser, cartController.deleteCartItems);

module.exports = router;
