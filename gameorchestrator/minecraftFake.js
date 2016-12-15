'use strict';

const EventEmitter = require('events').EventEmitter;
const fs = require('fs');
const mc = require('minecraft-protocol');
const path = require('path');
const log = require('./log');
const utils = require('./utils');

class MinecraftFake extends EventEmitter {
	constructor(root) {
		super();

		this._root = root;
		this._motd = 'Join to start server...';
		this._options = {
			motd: this._motd,
			keepAlive: false
		};
		this._useWhitelist = false;
		this._realMotd = 'Could not find motd in server.properties';
	}

	configure() {
		const self = this;
		const event = 'configured';

		utils.minecraftVersion(self._root, (err, version) => {
			if (err) return self.emit(event, err);

			self._options.version = version;

			utils.minecraftProperties(self._root, (err, properties) => {
				if (err) return self.emit(event, err);

				if (isNaN(properties['server-port'])) {
					return self.emit(event, new Error('Missing or invalid port number.'));
				} else {
					self._options.port = properties['server-port'] + 1;
				}

				if (properties['server-ip']) self._options.host = properties['server-ip'];
				if (properties['max-players']) self._options['max-players'] = properties['max-players'];
				if (properties['online-mode']) self._options['online-mode'] = properties['online-mode'];
				if (properties['white-list']) self._useWhitelist = properties['white-list'];
				if (properties['motd']) self._realMotd = properties['motd'];

				self.emit(event);
			});
		});
	}

	start() {
		const self = this;
		const server = mc.createServer(self._options);

		server.on('connection', (client) => {
			client.on('error', (err) => {
				self._log(log.error, `Client connection error: ${err.message}`);
			});
		});

		server.on('login', (client) => {
			client.on('error', (err) => {
				self._log(log.error, `Client login error: ${err.message}`);
			});

			self._checkLists(client.uuid, (banned, whitelisted) => {
				let message, logMessage;

				if (banned) {
					message = 'You are banned on this server!';
					logMessage = `${client.username} connected but was found to be banned.`;
				} else if (!whitelisted) {
					message = 'You are not white-listed on this server!';
					logMessage = `${client.username} connected but was not found to be blacklisted.`;
				} else {
					self.emit('login');
					message = `Server is starting. This will take a few seconds.\nRefresh until "${self._realMotd}" is shown, then rejoin.`;
					server.motd = 'Server is starting... Please wait.';
					setTimeout(() => server.motd = self._motd, 30000);
					logMessage = `${client.username} connected and login event was emitted.`;
				}

				client.write('kick_disconnect', {
					reason: JSON.stringify({ text: message })
				});

				client.end();

				self._log(log.info, logMessage);
			});
		});

		server.on('error', (err) => {
			self._log(log.error, `Server error: ${err.message}`);
		});

		server.on('listening', () => {
			const bound = server.socketServer.address();

			self._log(log.info, `Listening on ${bound.address}:${bound.port}`);
		});
	}

	_checkLists(uuid, callback) {
		const self = this;

		fs.readFile(path.join(self._root, 'banned-players.json'), 'utf8', (err, data) => {
			if (err) {
				self._log(log.error, `Could not read banned-players.json: ${err.message}`);
			} else {
				try {
					if (JSON.parse(data).some(value => value.uuid === uuid)) {
						return callback(true, false);
					}
				} catch (ex) {
					self._log(log.error, `Could not JSON parse banned-players.json: ${ex.message}`);
				}
			}

			if (self._useWhitelist) {
				fs.readFile(path.join(self._root, 'whitelist.json'), 'utf8', (err, data) => {
					if (err) {
						self._log(log.error, `Could not read whitelist.json: ${err.message}`);
					} else {
						try {
							if (!JSON.parse(data).some(value => value.uuid === uuid)) {
								return callback(false, false);
							}
						} catch (ex) {
							self._log(log.error, `Could not JSON parse banned-players.json: ${ex.message}`);
						}
					}

					return callback(false, true);
				});
			} else {
				return callback(false, true);
			}
		});
	}

	_log(severity, message) {
		this.emit(log.event, severity, `Minecraft Fake: ${message}`);
	}
}

module.exports = MinecraftFake;
