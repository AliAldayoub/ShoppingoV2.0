const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const reviewSchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},
		brand: {
			type: Schema.Types.ObjectId,
			ref: 'Brand',
			required: true
		},
		rating: {
			type: Number,
			required: true,
			min: 1,
			max: 5
		}
	},
	{
		timestamps: true
	}
);

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
