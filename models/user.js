const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;
const userSchema = new Schema(
	{
		fullName: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		role: { type: String, enum: [ 'user', 'admin', 'seller' ], default: 'user' },
		imgURL: { type: String },
		wePayQrcode: { type: Number }
	},
	{
		timestamps: true
	}
);

userSchema.pre('save', async function(next) {
	const user = this;
	if (!user.isModified('password')) return next();

	try {
		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(user.password, salt);
		user.password = hash;
		next();
	} catch (err) {
		return next(err);
	}
});

userSchema.methods.validatePassword = async function(password) {
	return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
