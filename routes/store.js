const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const storeController = require('../controllers/store');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post(
	'/sellerRequest',
	authMiddleware.authenticateUser,
	upload.single('storeImageURL'),
	storeController.sellerRequest
);
router.get(
	'/getAllSellerRequest',
	authMiddleware.authenticateUser,
	authMiddleware.authenticateAdmin,
	storeController.getAllSellerRequest
);
router.put(
	'/sellerResponse/:id',
	authMiddleware.authenticateUser,
	authMiddleware.authenticateAdmin,
	storeController.sellerResponse
);
router.put(
	'/sellerReject/:id',
	authMiddleware.authenticateUser,
	authMiddleware.authenticateAdmin,
	storeController.sellerResponse
);
router.get('/getAllSeller', storeController.getAllSeller);
router.get('/getSellerProducts/:id', storeController.getSellerProducts);
router.get(
	'/getSellerOrders',
	authMiddleware.authenticateUser,
	authMiddleware.authenticateSeller,
	storeController.getSellerOrders
);
module.exports = router;
