const mysql = require('promise-mysql');
const config = require('../config');

let pool = mysql.createPool({
	host: config.database.host,
	user: config.database.user,
	password: config.database.password,
	database: config.database.database
});

module.exports = pool;

process.on('exit', function () {
	pool.end();
});
