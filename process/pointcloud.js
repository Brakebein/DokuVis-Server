const config = require('../config');
const utils = require('../modules/utils');
const fs = require('fs-extra-promise');
const exec = require('child-process-promise').execFile;
const log4js = require('log4js');

// logger
log4js.configure({
	appenders: {
		out: { type: 'console' },
		logfile: {
			type: 'file',
			filename: 'logs/pointcloud-process.log'
		}
	},
	categories: {
		default: { appenders: ['out', 'logfile'], level: 'all' }
	}
});
const logger = log4js.getLogger('POINTCLOUD');
console.log = logger.info.bind(logger);
console.debug = logger.debug.bind(logger);
console.warn = logger.warn.bind(logger);
console.error = logger.error.bind(logger);


var file = process.argv[2];

if (!file) {
	process.send({ error: 'arguments missing' });
	process.exit();
}

var subsampleSpacing = 0.02;

exec(config.exec.CloudCompare, [
	'-C_EXPORT_FMT', 'LAS',
	'-O', filename,
	'-SS', 'SPATIAL', subsampleSpacing
]);

exec(config.exec.PotreeConv, [filename, '-o', folder]);
