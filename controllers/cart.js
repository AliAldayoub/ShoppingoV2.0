const Cart = require('../models/cart');
const Order = require('../models/order');
const { getCartDetails } = require('../util/cartMethods');

exports.addItemToCart = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const { productId, size, color, quantity, price } = req.body;

		const cart = await Cart.findOne({ user: userId });

		if (cart) {
			const newItem = { product: productId, size, color, quantity, price };
			cart.items.push(newItem);
			await cart.save();
		} else {
			const newCart = new Cart({
				user: userId,
				items: [ { product: productId, size, color, quantity, price } ]
			});
			await newCart.save();
		}
		res.status(201).json({ success: true, message: 'تمت اضافة المنتج بنجاح الى سلة التسوق' });
	} catch (error) {
		next(error);
	}
};

exports.deleteItemFromCart = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const itemId = req.params.id;
		const cart = await Cart.findOneAndUpdate(
			{ user: userId },
			{ $pull: { items: { _id: itemId } } },
			{ new: true }
		).populate({
			path: 'items.product',
			populate: {
				path: 'seller',
				model: 'Seller'
			}
		});
		if (cart.items.length === 0) {
			return res.status(200).json({
				success: false,
				message: 'تم حذف المنتج بنجاح ولم يتبقى أي منتجات ضمن السلة لعرضها',
				totalPrice: 0
			});
		}
		const {
			onDeliveryItems,
			onDeliveryItemsPrice,
			wepayItems,
			wepayItemsPrice,
			restItems,
			restItemsPrice,
			totalPrice
		} = await getCartDetails(cart);
		res.status(201).json({
			success: true,
			message: 'تم حذف المنتج بنجاح',
			cart: {
				cartItems: cart.items,
				totalPrice
			},
			onDelivery: {
				onDeliveryItemsPrice: onDeliveryItems.length * 5000 + onDeliveryItemsPrice,
				onDeliveryItems
			},
			wepayItems: {
				wepayItemsPrice: wepayItems.length * 5000 + wepayItemsPrice,
				wepayItems
			},
			restItems: {
				restItemsPrice: restItems.length * 5000 + restItemsPrice,
				restItems
			}
		});
	} catch (error) {
		next(error);
	}
};

exports.deleteCartItems = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const cart = await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } }, { new: true });
		res.status(201).json({ success: true, message: 'تم حذف جميع المنتجات بنجاح', cart });
	} catch (error) {
		next(error);
	}
};

exports.getCart = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const cart = await Cart.findOne({ user: userId }).populate({
			path: 'items.product',
			populate: {
				path: 'seller',
				model: 'Seller'
			}
		});
		if (!cart) {
			return res.status(200).json({
				success: false,
				message: 'لم تقم بإضافة اي منتج ولا يوجد شيء لعرضه'
			});
		}
		if (cart.items.length === 0) {
			return res.status(200).json({
				success: false,
				message: 'لا يوجد أي منتجات ضمن السلة لعرضها',
				totalPrice: 0
			});
		}
		const {
			onDeliveryItems,
			onDeliveryItemsPrice,
			wepayItems,
			wepayItemsPrice,
			restItems,
			restItemsPrice,
			totalPrice
		} = await getCartDetails(cart);
		res.status(200).json({
			success: true,
			message: 'تم جلب جميع المنتجات ضمن السلة',
			cart: {
				cartItems: cart.items,
				totalPrice
			},
			onDelivery: {
				onDeliveryItemsPrice: onDeliveryItems.length * 5000 + onDeliveryItemsPrice,
				onDeliveryItems
			},
			wepayItems: {
				wepayItemsPrice: wepayItems.length * 5000 + wepayItemsPrice,
				wepayItems
			},
			restItems: {
				restItemsPrice: restItems.length * 5000 + restItemsPrice,
				restItems
			}
		});
	} catch (error) {
		next(error);
	}
};

exports.deliveryOrder = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const { firstName, lastName, middleName, email, phoneNumber, city, address, onDeliveryItems } = req.body;
		const order = new Order({
			user: userId,
			deliveryStatus: false,
			details: {
				firstName,
				lastName,
				middleName,
				email,
				phoneNumber,
				city,
				address
			},
			onDeliveryItems: onDeliveryItems
		});
		order.save();
		res.status(201).json({ success: true, message: 'تم اضافة الطلبية', order });
	} catch (error) {
		next(error);
	}
};

exports.wepayOrder = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const orderId = req.body.orderId;
		const wepayItems = JSON.parse(req.body.wepayItems);
		if (!orderId) {
			const { firstName, lastName, middleName, email, phoneNumber, city, address } = req.body;
			const order = new Order({
				user: userId,
				wepayStatus: true,
				details: {
					firstName,
					lastName,
					middleName,
					email,
					phoneNumber,
					city,
					address
				},
				wepayItems: wepayItems
			});
			order.save();
			res.status(201).json({ success: true, message: 'تم اضافة الطلبية', order });
		} else {
			const order = await Order.findById(orderId);
			order.wepayItems = wepayItems;
			order.wepayStatus = true;
			order.save();
			res.status(201).json({ success: true, message: 'تم اضافة المنتجات للطلبية الخاصة بهذه العملية ', order });
		}
	} catch (error) {
		next(error);
	}
};
