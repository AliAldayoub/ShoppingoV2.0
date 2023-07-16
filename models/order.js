const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},
		wepayItems: [
			{
				item: {
					type: Object
				},
				seller: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Seller'
				},
				deliveryStatus: {
					type: String,
					default: false
				}
			}
		],
		onDeliveryItems: [
			{
				item: {
					type: Object
				},
				seller: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Seller'
				},
				deliveryStatus: {
					type: String,
					default: false
				}
			}
		],
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
