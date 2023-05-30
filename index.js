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

// start routes
const ErrorHandler = require('./middleware/ErrorHandler');
const db = require('./util/database');
const authRoute = require('./routes/auth');

// end routes

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// use routes
app.use('/api/v1.0/auth', authRoute);
app.get('/', (req, res, next) => {
	res.send('hello from Shoppingo Site');
});
app.use(ErrorHandler);
db.on('error', console.error.bind(console, 'connection error : '));
db.once('open', () => {
	console.log('connected  successfuly to shoppingo Database ');
});

app.listen(process.env.PORT, () => {
	console.log(`heey again in shoppingo server on port ${process.env.PORT}`);
});
