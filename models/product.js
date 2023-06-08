const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema(
	{
		gender: {
			type: String,
			enum: [ 'male', 'female' ],
			required: true
		},
		type: {
			type: String,
			required: true
		},
		style: {
			type: String
		},
		brand: {
			type: Schema.Types.ObjectId,
			ref: 'Brand',
			required: true
		},
		price: {
			type: Number,
			required: true
		},
		fixedDiscount: {
			type: Number
		},
		percentageDiscount: {
			type: Number
		},
		description: {
			type: String,
			required: true
		},
		variations: [
			{
				size: {
					type: String,
					required: true
				},
				quantity: {
					type: Number,
					required: true
				},
				colors: {
					type: [ String ],
					required: true
				}
			}
		],
		frontImgURL: {
			type: String,
			required: true
		},
		backImgURL: {
			type: String
			// required: true
		},
		seller: {
			type: Schema.Types.ObjectId,
			ref: 'Seller',
			required: true
		}
	},
	{
		timestamps: true
	}
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
