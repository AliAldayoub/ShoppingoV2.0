const User = require('../models/user');
const Product = require('../models/product');
const Seller = require('../models/seller');
const Brand = require('../models/brand');
const { uploadImage } = require('../util/backblazeB2');
const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const { recommender } = require('../util/recommender');
const Review = require('../models/review');
const Cart = require('../models/cart');
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
				items: [ { product: productId, size, color, quantity } ]
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
		);
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
		} = getCartDetails(cart);
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
		} = getCartDetails(cart);
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
