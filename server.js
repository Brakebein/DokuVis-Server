const express = require('express');
const bodyParser = require('body-parser');
const log4js = require('log4js');

// logger
log4js.configure({
	appenders: {
		out: { type: 'console' },
		logfile: {
			type: 'file',
			filename: 'logs/server.log'
		}
	},
	categories: {
		default: { appenders: ['out', 'logfile'], level: 'all' }
	}
});
const logger = log4js.getLogger('DokuVis');
console.log = logger.info.bind(logger);
console.debug = logger.debug.bind(logger);
console.warn = logger.warn.bind(logger);
console.error = logger.error.bind(logger);


// express
const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.all('/*', function (req, res, next) {
	// CORS headers
	res.header("Access-Control-Allow-Origin", "*");	// restrict it to the required domain
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELELTE,OPTIONS');
	// set custom headers for CORS
	res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');

	if (req.method === 'OPTIONS') {
		res.status(200).end();
	}
	else {
		next();
	}
});

// Auth Middleware - This will check if the token is valid
// Only the requests that start with /api/v1/* will be checked for the token.
// Any URL's that do not follow the below pattern should be avoided unless you 
// are sure that authentication is not needed
app.all('/auth/*', [require('./middlewares/validateRequest')]);

app.use('/', require('./routes'));

// if no route is matched by now, it must be 404
app.use(function (req, res) {
	res.status(404);
	res.json({
		"status": 404,
		"message": "Not Found #1"
	});
});

// start server
app.set('port', process.env.PORT || 3000);

const server = app.listen(app.get('port'), function () {
	console.log('Express server listening on port ' + server.address().port);
});
server.timeout = 600000; // 10 minutes


// properly shutdown server
process.on('exit', function () {
	server.close();
	log4js.shutdown();
});

// catch ctrl+c event and exit properly
process.on('SIGINT', function () {
	console.log('Shutdown...');
	process.exit();
});

// catch uncaught exception and exit properly
process.on('uncaughtException', function (err) {
	console.error('Uncaught Exception', err);
	process.exit();
});
