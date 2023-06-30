const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sellerSchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},
		storeImageURL: {
			type: String
		},
		storeName: {
			type: String,
			required: true
		},
		storePhoneNumber: {
			type: String,
			required: true
		},
		location: {
			type: String,
			required: true
		},
		coo: {
			type: Array,
			required: true
		},
		paymentMethod: [
			{
				type: String,
				enum: [ 'wepay', 'on delivery' ]
			}
		],
		wepayCode: {
			type: String,
			required: function() {
				return this.paymentMethod.includes('wepay');
			}
		},
		status: {
			type: Boolean,
			required: true
		}
	},
	{
		timestamps: true
	}
);

const Seller = mongoose.model('Seller', sellerSchema);

module.exports = Seller;
