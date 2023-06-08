const User = require('../models/user');
const Seller = require('../models/seller');
const { uploadImage } = require('../util/backblazeB2');

exports.sellerRequest = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const storeImageURL = req.file ? req.file : undefined;
		const { storePhoneNumber, storeName, location, coo, paymentMethod, wepayCode } = req.body;
		let fileURL;
		if (storeImageURL) {
			fileURL = await uploadImage(storeImageURL);
		}
		const coordinate = JSON.parse(coo);
		const methods = JSON.parse(paymentMethod);
		const seller = new Seller({
			user: userId,
			storeImageURL: fileURL,
			storePhoneNumber,
			storeName,
			location,
			coo: coordinate,
			paymentMethod: methods,
			wepayCode,
			status: false
		});
		await seller.save();
		res
			.status(201)
			.json({ success: true, message: 'تم تسجيل طلبك بنجاح ستتم مراجعته خلال مدة اقصاها 24 ساعة', seller });
	} catch (error) {
		next(error);
	}
};
exports.getAllSellerRequest = async (req, res, next) => {
	try {
		const sellers = await Seller.find({ status: false });
		if (sellers.length == 0) {
			return res.status(200).json({ success: false, message: 'لا يوجد اي طلب ترقية لعرضه' });
		}
		res.status(201).json({ success: true, message: 'تم جلب جميع طلبات الترقية للتجار', sellers });
	} catch (error) {
		next(error);
	}
};
exports.sellerResponse = async (req, res, next) => {
	try {
		const sellerId = req.params.id;
		const seller = await Seller.findByIdAndUpdate(sellerId, { status: true }, { new: true });
		const user = await User.findByIdAndUpdate(seller.user, { role: 'seller' }, { new: true });
		res.status(201).json({ success: true, message: `تم ترقية حساب ${user.fullName} ل تاجر` });
	} catch (error) {
		next(error);
	}
};

exports.getAllSeller = async (req, res, next) => {
	try {
		const sellers = await Seller.find({ status: true }).populate('user');
		if (sellers.length == 0) {
			return res.status(200).json({ success: false, message: 'لا يوجد اي متجر لعرضه' });
		}
		res.status(200).json({ success: true, message: 'تم جلب جميع المتاجر', sellers });
	} catch (error) {
		next(error);
	}
};
