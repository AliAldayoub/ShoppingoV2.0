const User = require('../models/user');
const Seller = require('../models/seller');
const jwt = require('jsonwebtoken');
const { uploadImage } = require('../util/backblazeB2');

exports.signup = async (req, res, next) => {
	try {
		const { fullName, email, password } = req.body;
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res
				.status(200)
				.json({ success: false, message: 'هذا الإيميل موجود من قبل , قم بتسجيل الدخول أو استخدم حساب أخر' });
		}
		const user = new User({
			fullName,
			email,
			password,
			imgURL: process.env.defaultAvatar
		});
		// to  sending email here .......

		// end sending email
		await user.save();
		const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY);
		return res.status(201).json({
			message: 'تم إنشاء الحساب',
			success: true,
			user,
			token
		});
	} catch (error) {
		next(error);
	}
};
exports.login = async (req, res, next) => {
	try {
		const { email, password } = req.body;

		let user = await User.findOne({ email });
		if (!user) {
			return res
				.status(200)
				.json({ success: false, message: 'هذا الإيميل غير صحيح قم بالتأكد والمحاولة مرة أخرى' });
		}

		const isPasswordValid = await user.validatePassword(password);
		if (!isPasswordValid) {
			return res.status(200).json({ success: false, message: 'كلمة السر غير صحيحة' });
		}

		const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY);

		res.status(200).json({ success: true, message: 'تم تسجيل الدخول بنجاح', user, token });
	} catch (error) {
		next(error);
	}
};

exports.updateInfo = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const user = await User.findById(userId);

		const { fullName, storeName, location, paymentMethod, wepayCode, oldPassword, newPassword } = req.body;
		const isPasswordValid = await user.validatePassword(oldPassword);
		if (!isPasswordValid) {
			return res.status(200).json({ success: false, message: 'كلمة السر غير صحيحة لم يتم تعديل البيانات' });
		}
		const imgURL = req.file ? req.file : undefined;
		let fileURL;
		if (imgURL) {
			fileURL = await uploadImage(imgURL);
		}
		fileURL ? (user.imgURL = fileURL) : null;
		fullName ? (user.fullName = fullName) : null;
		newPassword ? (user.password = newPassword) : null;

		await user.save();
		let seller;
		if (user.role === 'seller') {
			seller = await Seller.findOneAndUpdate(
				{ user: userId },
				{ storeName, location, paymentMethod, wepayCode },
				{
					new: true
				}
			);
			await seller.save();
		}
		res.status(201).json({ success: true, message: 'تم تعديل البيانات بنجاح', user, seller });
	} catch (error) {
		next(error);
	}
};

exports.getUserInfo = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const user = await User.findById(userId, '-password');
		res.status(200).json({ success: true, message: 'تم جلب بيانات المستخدم بنجاح', user });
	} catch (error) {
		next(error);
	}
};
exports.resetPassword = async (req, res, next) => {
	try {
		const { email } = req.body;
		const type = req.query.type;
		const user = await User.findOne({ email });
		if (user) {
			if (type == 'sendCode') {
				randomNumber = Math.ceil(Math.random() * 10000);
				return res.status(200).json({
					success: true,
					message: 'قم بمراجعة الإيميل الخاص بك للحصول على كود التفعيل ',
					randomNumber
				});
			} else if (type == 'reset') {
				const password = req.body.password;
				user.password = password;
				user.save();
				return res.status(201).json({ success: true, message: 'تم تعديل كلمة السر بنجاح' });
			} else {
				return res
					.status(200)
					.json({ success: false, message: 'حدث خطأ في العملية لم يتم تغيير كلمة السر حاول مجدداً' });
			}
		} else {
			return res.status(200).json({ success: false, message: 'هذا الايميل غير موجود تحقق منه وحاول مجدداً' });
		}
	} catch (error) {
		next(error);
	}
};

exports.updateUserToAdmin = async (req, res, next) => {
	try {
		const { email } = req.body;
		const updatedUser = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
		res.status(200).json({
			success: true,
			message: 'user Updated to Admin successfully',
			user: updatedUser
		});
	} catch (error) {
		next();
	}
};
