const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authController = require('../controllers/auth');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/signup', authController.signup);

router.post('/login', authController.login);

router.put('/updateInfo', authMiddleware.authenticateUser, upload.single('imgURL'), authController.updateInfo);

router.post('/updateUserToAdmin', authController.updateUserToAdmin);
router.post('/resetPassword', authController.resetPassword);
router.get('/getUserInfo', authMiddleware.authenticateUser, authController.getUserInfo);

module.exports = router;
