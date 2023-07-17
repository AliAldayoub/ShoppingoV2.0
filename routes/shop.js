const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const shopController = require('../controllers/shop');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post(
	'/addProduct',
	authMiddleware.authenticateUser,
	authMiddleware.authenticateSeller,
	upload.fields([ { name: 'frontImgURL' }, { name: 'backImgURL' } ]),
	shopController.addProduct
);
router.get('/getAllProduct', shopController.getAllProduct);
router.get('/getOffers', shopController.getOffers);
router.get('/getProductDetails/:id', authMiddleware.authenticateUser, shopController.getProductDetails);
router.get('/getMapProduct/:id', authMiddleware.authenticateUser, shopController.getMapProduct);
router.get('/getSimilarProducts', authMiddleware.authenticateUser, shopController.getSimilarProducts);
router.delete(
	'/deleteProduct/:id',
	authMiddleware.authenticateUser,
	authMiddleware.authenticateSeller,
	shopController.deleteProduct
);
router.post('/addReview/:id', authMiddleware.authenticateUser, shopController.addReview);
router.get('/myPurchase', authMiddleware.authenticateUser, shopController.myPurchase);

module.exports = router;
