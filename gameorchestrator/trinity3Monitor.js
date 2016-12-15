'use strict';

const EventEmitter = require('events').EventEmitter;
const fs = require('fs');
const mysql = require('mysql');
const log = require('./log');

class Trinity3Monitor extends EventEmitter {
	constructor(worldServerConfig, checkInterval, checksBeforeStop) {
		super();

		this._configFile = worldServerConfig;
		this._checkInterval = checkInterval * 1000;
		this._stopDiff = this._checkInterval * checksBeforeStop;
		this._lastPlayerSeen = Date.now();
		this._ahBotAccount = null;
		this._playerItemInAh = false;
	}

	configure() {
		const self = this;
		const configured = 'configured';

		fs.readFile(self._configFile, 'utf8', (err, data) => {
			if (err) return self.emit(configured, err);

			const connStrMatch = data.match(/^CharacterDatabaseInfo\s*=\s*"([^"]+)"/m);
			const buyerMatch = data.match(/^AuctionHouseBot.Buyer.Enabled\s*=\s*1/m);
			const sellerMatch = data.match(/^AuctionHouseBot.Seller.Enabled\s*=\s*1/m);
			const ahAccountMatch = data.match(/^AuctionHouseBot.Account\s*=\s*(\d+)/m);

			if (!connStrMatch || connStrMatch.length !== 2) return self.emit(configured, new Error('Could not find CharacterDatabaseInfo connection string in world server config.'));
			if ((buyerMatch || sellerMatch) && (!ahAccountMatch || ahAccountMatch.length !== 2)) return self.emit(configured, new Error('Auction House bot is enabled but account could not be found.'));

			const parts = connStrMatch[1].split(';');

			if (parts.length !== 5) return self.emit(configured, new Error('Splitting the connection string did not result in 5 parts.'));

			self._options = {
				user: parts[2],
				password: parts[3],
				database: parts[4]
			};

			if (isNaN(parts[1])) {
				// Using Unix socket.
				self._options.socketPath = parts[1];
			} else {
				// Using host and port.
				self._options.host = parts[0];
				self._options.port = parseInt(parts[1]);
			}

			if (buyerMatch || sellerMatch) {
				self._ahBotAccount = parseInt(ahAccountMatch[1]);
			}

			self.emit(configured);
		});
	}

	start() {
		const self = this;
		const stop = 'stop';

		setInterval(() => {
			const connection = mysql.createConnection(self._options);

			connection.connect((err) => {
				if (err) return self._log(log.error, `Connection error: ${err.message}`);

				let failed = false;

				connection.query('SELECT COUNT(guid) AS players_online FROM characters WHERE online = 1', (err, rows) => {
					if (err || rows.length !== 1) {
						failed = true;
						self._log(log.error, 'Could not get number of online players: ' + err ? err.message : `${rows.length} rows returned.`);
					} else {
						if (rows[0].players_online > 0) {
							self._lastPlayerSeen = Date.now();
						}
					}

					if (self._ahBotAccount === null) {
						connection.end(() => {
							if (!failed && Date.now() - self._lastPlayerSeen >= self._stopDiff) {
								self.emit(stop);
							}
						});
					} else {
						// Adding an index on characters.auctionhouse.itemowner is most likely beneficial.
						connection.query('SELECT COUNT(id) AS player_items FROM auctionhouse JOIN characters ON auctionhouse.itemowner = characters.guid WHERE account != ?', [self._ahBotAccount], (err, rows) => {
							if (err || rows.length !== 1) {
								failed = true;
								self._log(log.error, 'Could not get list of player owned AH items: ' + err ? err.message : `${rows.length} rows returned.`);
							} else {
								self._playerItemInAh = rows[0].player_items > 0;
							}

							connection.end(() => {
								if (!failed && Date.now() - self._lastPlayerSeen >= self._stopDiff && self._playerItemInAh === false) {
									self.emit(stop);
								}
							});
						});
					}
				});
			});
		}, self._checkInterval);
	}

	_log(severity, message) {
		this.emit(log.event, severity, `Trinity3 Monitor: ${message}`);
	}
}

module.exports = Trinity3Monitor;
