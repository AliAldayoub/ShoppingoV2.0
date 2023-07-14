require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
app.use(
	cors({
		origin: true,
		credentials: true
	})
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(helmet());

// start routes
const ErrorHandler = require('./middleware/ErrorHandler');
const db = require('./util/database');
const authRoute = require('./routes/auth');
const shopRoute = require('./routes/shop');
const storeRoute = require('./routes/store');
const cartRoute = require('./routes/cart');

app.use('/api/v2.0/auth', authRoute);
app.use('/api/v2.0/shop', shopRoute);
app.use('/api/v2.0/store', storeRoute);
app.use('/api/v2.0/cart', cartRoute);
app.get('/', (req, res, next) => {
	res.send('hello from Shoppingo Site');
});
app.use(ErrorHandler);
db.on('error', console.error.bind(console, 'connection error : '));
db.once('open', () => {
	console.log('connected successfuly to shoppingo Database ');
});

app.listen(process.env.PORT, () => {
	console.log(`heey again in shoppingo server on port ${process.env.PORT}`);
});
