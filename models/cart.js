const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartItemSchema = new Schema({
	product: {
		type: Schema.Types.ObjectId,
		ref: 'Product',
		required: true
	},
	size: {
		type: String,
		required: true
	},
	color: {
		type: String,
		required: true
	},
	quantity: {
		type: Number,
		default: 1
	},
	price: {
		type: Number,
		required: true
	}
});

const cartSchema = new Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	items: [ cartItemSchema ]
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
