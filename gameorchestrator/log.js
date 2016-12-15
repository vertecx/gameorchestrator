'use strict';

module.exports.event = 'log';
module.exports.info = 0;
module.exports.warn = 1;
module.exports.error = 2;

/* eslint no-console: 'off' */
module.exports.simpleLogger = (severity, message) => {
	const ts = new Date().toISOString();

	if (severity === 0) {
		console.log(ts, 'I', message);
	} else if (severity === 1) {
		console.warn(ts, 'W', message);
	} else if (severity === 2) {
		console.error(ts, 'E', message);
	} else {
		console.error(ts, 'Invalid log severity:', severity);
	}
};
