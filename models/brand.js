const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const brandSchema = new Schema(
	{
		brand: {
			type: String,
			required: true
		},
		modelNumber: {
			type: String,
			required: true
		}
	},
	{
		timestamps: true
	}
);

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;
