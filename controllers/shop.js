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

function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371; // Radius of the Earth in kilometers
	const dLat = (lat2 - lat1) * (Math.PI / 180); // Convert to radians
	const dLon = (lon2 - lon1) * (Math.PI / 180); // Convert to radians
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c * 1000; // Distance in meters
	return distance;
}
function findNearestSeller(userLat, userLon, sellers) {
	let nearestSeller = null;
	let minDistance = Infinity;

	for (const seller of sellers) {
		const sellerLat = seller.coo[1]; // Latitude of the seller
		const sellerLon = seller.coo[0]; // Longitude of the seller
		const distance = calculateDistance(userLat, userLon, sellerLat, sellerLon);

		if (distance < minDistance) {
			minDistance = distance;
			nearestSeller = seller;
		}
	}

	return nearestSeller;
}

exports.addProduct = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const seller = await Seller.findOne({ user: userId });
		const frontImgURL = req.files['frontImgURL'][0] ? req.files['frontImgURL'][0] : undefined;
		const backImgURL = req.files['backImgURL'][0] ? req.files['backImgURL'][0] : undefined;
		let frontFileImgURL;
		if (frontImgURL) {
			frontFileImgURL = await uploadImage(frontImgURL);
		}
		let backFileImgURL;
		if (backImgURL) {
			backFileImgURL = await uploadImage(backImgURL);
		}
		const {
			gender,
			type,
			style,
			brand,
			modelNumber,
			price,
			fixedDiscount,
			percentageDiscount,
			description
		} = req.body;
		let brandId;
		const variationsString = req.body.variations;
		const variationsArray = JSON.parse(variationsString);
		const existBrand = await Brand.findOne({ brand, modelNumber });
		if (existBrand) brandId = existBrand._id;
		else {
			const newBrand = new Brand({ brand, modelNumber });
			await newBrand.save();
			brandId = newBrand._id;
		}
		const product = new Product({
			gender,
			type,
			style,
			brand: brandId,
			price: parseInt(price),
			fixedDiscount: fixedDiscount ? parseInt(fixedDiscount) : fixedDiscount,
			percentageDiscount: percentageDiscount ? parseInt(percentageDiscount) : percentageDiscount,
			description,
			variations: variationsArray,
			frontImgURL: frontFileImgURL,
			backImgURL: backFileImgURL,
			seller: seller._id
		});
		await product.save();
		res.status(201).json({ success: true, message: 'تمت إضافة المنتج بنجاح', product });
	} catch (error) {
		next(error);
	}
};

exports.getAllProduct = async (req, res, next) => {
	try {
		const products = await Product.find().populate('brand');
		const uniqueProducts = [];

		// Iterate over all products
		for (const product of products) {
			const { brand, fixedDiscount, percentageDiscount, price } = product;

			// Check if there are existing products with the same brand
			const existingProduct = uniqueProducts.find((p) => p.brand._id.toString() === brand._id.toString());

			if (existingProduct) {
				const existingPrice = existingProduct.price;

				// Calculate the updated price based on discounts (if any)
				const updatedPrice =
					fixedDiscount !== undefined ? price - fixedDiscount : price * (1 - percentageDiscount / 100);

				// Compare the updated price with the existing price
				if (updatedPrice < existingPrice) {
					existingProduct.shippestProduct = product;
					existingProduct.price = updatedPrice;
				}
			} else {
				// Create a new entry for the brand if it doesn't exist
				const newEntry = {
					brand,
					shippestProduct: product,
					price: fixedDiscount !== undefined ? price - fixedDiscount : price
				};

				uniqueProducts.push(newEntry);
			}
		}

		if (uniqueProducts.length > 0) {
			return res.status(200).json({
				success: true,
				message: 'تم جلب جميع المنتجات بنجاح',
				uniqueProducts
			});
		} else {
			return res.status(200).json({
				success: false,
				message: 'لا يوجد أي منتجات لعرضها'
			});
		}
	} catch (error) {
		next(error);
	}
};

exports.getProduct = async (req, res, next) => {
	try {
		const productId = req.params.id;
		const long = req.query.long;
		const lat = req.query.lat;
		const userId = req.user._id;
		const shippestProduct = await Product.findById(productId);
		const brandProducts = await Product.find({ brand: shippestProduct.brand }).populate('seller');

		console.log(brandProducts);
		const sellers = brandProducts.map((brandProduct) => brandProduct.seller);
		console.log(sellers);
		const nearestSeller = findNearestSeller(lat, long, sellers);
		const nearestProduct = brandProducts.find((brandProduct) => brandProduct.seller.equals(nearestSeller._id));

		const productsWithDiscount = brandProducts.filter((brandProduct) => {
			return brandProduct.fixedDiscount || brandProduct.percentageDiscount;
		});
		const otherProducts = brandProducts.filter((brandProduct) => {
			return (
				!brandProduct._id.equals(shippestProduct._id) &&
				!brandProduct._id.equals(nearestProduct._id) &&
				!productsWithDiscount.includes(brandProduct)
			);
		});
		const users = await User.find();
		const brands = await Brand.find();

		const loadedModel = JSON.parse(fs.readFileSync('F:\\ShoppingoV2.0\\util\\model.json'));
		const userMatrix = tf.tensor(loadedModel.userMatrixData);
		const itemMatrix = tf.tensor(loadedModel.itemMatrixData);

		const matrix = [];
		const userRatingsArray = [];
		for (const user of users) {
			const userReviews = [];
			let isUser;
			user._id == userId ? (isUser = true) : (isUser = false);
			for (const brand of brands) {
				const review = await Review.findOne({ user: user._id, brand: brand._id });

				if (review) {
					userReviews.push(review.rating);
					if (isUser) userRatingsArray.push(review.rating);
				} else {
					userReviews.push(0);
					if (isUser) userRatingsArray.push(0);
				}
			}

			matrix.push(userReviews);
		}
		const ratingsData = tf.tensor2d(matrix);
		let isRated = false;
		for (let i = 0; i < userRatingsArray.length; i++) {
			if (userRatingsArray[i] != 0) {
				isRated = true;
				break;
			}
		}
		const items = [];

		for (const brand of brands) {
			let product;

			product = await Product.findOne({
				brand: brand._id,
				$or: [ { fixedDiscount: { $exists: true } }, { percentageDiscount: { $exists: true } } ]
			});

			if (!product) {
				product = await Product.findOne({ brand: brand._id }).sort('price');
			}

			if (product) {
				items.push(product);
			}
		}
		const recommendation = recommender(items, 10, ratingsData, isRated, userRatingsArray, itemMatrix);
		res.status(200).json({
			success: true,
			message: 'تم جلب جميع البيانات بنجاح منعتذر عالتأخير ',
			shippestProduct,
			nearestProduct,
			productsWithDiscount,
			otherProducts,
			recommendation
		});
	} catch (error) {
		next(error);
	}
};
exports.deleteProduct = async (req, res, next) => {
	const productId = req.params.id;

	try {
		const product = await Product.findByIdAndDelete(productId);
		if (!product) {
			return res.status(404).json({ success: false, message: 'هذا المنتج غير موجود' });
		}

		const brandId = product.brand;

		// Check if the brand is no longer referenced by any other product
		const remainingProducts = await Product.find({ brand: brandId });
		if (remainingProducts.length === 0) {
			// Delete the brand
			await Brand.findByIdAndDelete(brandId);
		}

		res.status(200).json({ success: true, message: 'تم حذف المنتج بنجاح' });
	} catch (error) {
		next(error);
	}
};

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
