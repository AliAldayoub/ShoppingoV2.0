const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},
		deliveryStatus: {
			type: Boolean,
			required: true
		},
		products: {
			type: Array,
			required: true
		},
		details: {
			firstName: {
				type: String,
				required: true
			},
			middleName: {
				type: String
			},
			lastName: {
				type: String,
				required: true
			},
			email: {
				type: String,
				required: true
			},
			phoneNumber: {
				type: String,
				required: true
			},
			city: {
				type: String,
				required: true
			},
			address: {
				type: String,
				required: true
			}
		}
	},
	{
		timestamps: true
	}
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
