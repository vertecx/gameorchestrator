'use strict';

const EventEmitter = require('events').EventEmitter;
const mc = require('minecraft-protocol');
const log = require('./log');
const utils = require('./utils');

class MinecraftMonitor extends EventEmitter {
	constructor(root, checkInterval, checksBeforeStop) {
		super();

		this._root = root;
		this._checkInterval = checkInterval * 1000;
		this._stopDiff = this._checkInterval * checksBeforeStop;
		this._options = {};
		this._lastPlayerSeen = Date.now();
	}

	configure() {
		const self = this;
		const configured = 'configured';

		utils.minecraftVersion(self._root, (err, version) => {
			if (err) return self.emit(configured, err);

			self._options.version = version;

			utils.minecraftProperties(self._root, (err, properties) => {
				if (err) return self.emit(configured, err);

				if (properties['server-ip']) self._options.host = properties['server-ip'];
				if (properties['server-port']) self._options.port = properties['server-port'];

				self.emit(configured);
			});
		});
	}

	start() {
		const self = this;

		setInterval(() => {
			mc.ping(self._options, (err, pingResults) => {
				if (err) {
					self.emit(log.event, log.warn, `Minecraft Monitor: Could not get number of online players: ${err.message}`);
				} else {
					if (pingResults.players.online > 0) self._lastPlayerSeen = Date.now();
					if (Date.now() - self._lastPlayerSeen >= self._stopDiff) self.emit('stop');
				}
			});
		}, self._checkInterval);
	}
}

module.exports = MinecraftMonitor;
