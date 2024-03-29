const User = require('../models/user');
const Product = require('../models/product');
const Seller = require('../models/seller');
const Brand = require('../models/brand');
const { uploadImage } = require('../util/backblazeB2');
const tf = require('@tensorflow/tfjs');
const path = require('path');
const fs = require('fs');
const { recommender } = require('../util/recommender');
const Review = require('../models/review');
const Order = require('../models/order');
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
				let updatedPrice;
				if (fixedDiscount != undefined) {
					updatedPrice = price - fixedDiscount;
				} else if (percentageDiscount != undefined) {
					updatedPrice = price - price * (percentageDiscount / 100);
				} else {
					updatedPrice = price; // No discounts applied
				}
				// Compare the updated price with the existing price
				if (updatedPrice < existingPrice) {
					existingProduct.shippestProduct = product;
					existingProduct.price = updatedPrice;
				}
			} else {
				// Create a new entry for the brand if it doesn't exist
				let updatedPrice;
				if (fixedDiscount != undefined) {
					updatedPrice = price - fixedDiscount;
				} else if (percentageDiscount != undefined) {
					updatedPrice = price * (1 - percentageDiscount / 100);
				} else {
					updatedPrice = price; // No discounts applied
				}
				const newEntry = {
					brand,
					shippestProduct: product,
					price: updatedPrice
				};

				uniqueProducts.push(newEntry);
			}
		}
		// Calculate the mean rating for each brand
		for (const product of uniqueProducts) {
			const brandId = product.brand._id;

			const meanRating = await Review.aggregate([
				{ $match: { brand: brandId } },
				{
					$group: {
						_id: '$brand',
						averageRating: { $avg: '$rating' }
					}
				}
			]);

			if (meanRating.length > 0) {
				product.meanRating = meanRating[0].averageRating;
			} else {
				// No reviews for the brand
				product.meanRating = 0;
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
exports.getProductDetails = async (req, res, next) => {
	try {
		const productId = req.params.id;
		const product = await Product.findById(productId).populate('seller');
		let updatedPrice;
		if (product.fixedDiscount != undefined) {
			updatedPrice = product.price - product.fixedDiscount;
		} else if (product.percentageDiscount != undefined) {
			updatedPrice = product.price - product.price * (product.percentageDiscount / 100);
		} else {
			updatedPrice = product.price; // No discounts applied
		}
		res.status(200).json({ success: true, message: 'تم جلب تفاصيل هذا المنتج', product, updatedPrice });
	} catch (error) {
		next(error);
	}
};
exports.getMapProduct = async (req, res, next) => {
	try {
		const long = req.query.long;
		const lat = req.query.lat;
		const productId = req.params.id;
		const shippestProduct = await Product.findById(productId).populate('seller');
		const brand = shippestProduct.brand;

		const brandProducts = await Product.find({ brand: brand }).populate('seller');

		const sellers = brandProducts.map((brandProduct) => brandProduct.seller);
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

		res.status(200).json({
			success: true,
			message: 'تم جلب جميع البيانات بنجاح منعتذر عالتأخير ',
			shippestProduct,
			nearestProduct,
			productsWithDiscount,
			otherProducts
		});
	} catch (error) {
		next(error);
	}
};
exports.getSimilarProducts = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const users = await User.find();
		const brands = await Brand.find();

		const modelFilePath = path.join(__dirname, '..', 'util', 'model.json');
		const loadedModel = JSON.parse(fs.readFileSync(modelFilePath));
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

		let updatedReco = recommendation.filter((reco) => reco != null);
		const recommendationFinal = [];
		for (const product of updatedReco) {
			let updatedPrice;
			if (product.fixedDiscount != undefined) {
				updatedPrice = product.price - product.fixedDiscount;
			} else if (product.percentageDiscount != undefined) {
				updatedPrice = product.price - product.price * (product.percentageDiscount / 100);
			} else {
				updatedPrice = product.price; // No discounts applied
			}
			const brandId = product.brand;
			let meanRating;
			const meanRating1 = await Review.aggregate([
				{ $match: { brand: brandId } },
				{
					$group: {
						_id: '$brand',
						averageRating: { $avg: '$rating' }
					}
				}
			]);

			if (meanRating1.length > 0) {
				meanRating = meanRating1[0].averageRating;
			} else {
				// No reviews for the brand
				meanRating = 0;
			}
			recommendationFinal.push({ product, updatedPrice, meanRating });
		}
		res.status(200).json({
			success: true,
			message: 'تم جلب المنتجات المشابهة بنجاح منعتذر عالتأخير ',
			recommendation: recommendationFinal
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
exports.addReview = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const brandId = req.params.id;
		const value = req.body.value;

		const review = await Review.findOneAndUpdate(
			{ user: userId, brand: brandId },
			{ rating: parseInt(value) },
			{ upsert: true, new: true }
		);

		// Recalculate meanRating
		const meanRating = await Review.find({ brand: brandId }).select('rating');

		let sum = 0;
		for (const review of meanRating) {
			sum += review.rating;
		}

		const averageRating = sum / meanRating.length;

		res.status(201).json({
			success: true,
			message: 'تمت اضافة التقييم بنجاح',
			meanRating: averageRating
		});
	} catch (error) {
		next(error);
	}
};

exports.getOffers = async (req, res, next) => {
	try {
		const products = await Product.find({
			$or: [
				
				{ percentageDiscount: { $ne: null } },
				{ fixedDiscount: { $ne: 0 } }
			]
		});
		let productsWithRating = [];
		if (products.length > 0) {
			for (const product of products) {
				const brandId = product.brand;
				const { fixedDiscount, percentageDiscount, price } = product;
				let updatedPrice;
				if (fixedDiscount != null) {
					updatedPrice = price - fixedDiscount;
				} else if (percentageDiscount != null) {
					updatedPrice = price * (1 - percentageDiscount / 100);
				} else {
					updatedPrice = price; // No discounts applied
				}
				const meanRating = await Review.aggregate([
					{ $match: { brand: brandId } },
					{
						$group: {
							_id: '$brand',
							averageRating: { $avg: '$rating' }
						}
					}
				]);

				if (meanRating.length > 0) {
					productsWithRating.push({
						product,
						updatedPrice,
						meanRating: meanRating[0].averageRating
					});
				} else {
					// No reviews for the brand
					productsWithRating.push({
						product,
						updatedPrice,
						meanRating: 0
					});
				}
			}
			res.status(200).json({
				success: true,
				message: 'تم جلب جميع المنتجات التي تملك عرض ',
				products: productsWithRating
			});
		} else {
			res.status(200).json({
				success: false,
				message: 'لا يوجد اي منتجات عليها عرض او تخفيض'
			});
		}
	} catch (error) {
		next(error);
	}
};

exports.myPurchase = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const orders = await Order.find({ user: userId }).populate('user');
		if (orders.length == 0) {
			return res.status(200).json({ success: false, message: 'لا يوجد اي منتجات لعرضها' });
		}
		res.status(200).json({ success: true, message: 'تم جلب جميع الطلبات ', orders });
	} catch (error) {
		next(error);
	}
};
