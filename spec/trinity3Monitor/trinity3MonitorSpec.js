'use strict';

const path = require('path');
const Trinity3Monitor = require('../../gameorchestrator/trinity3Monitor');

describe('Trinity3Monitor', () => {
	describe('configure()', () => {
		it('handles missing configuration file', (done) => {
			const monitor = new Trinity3Monitor(path.join(__dirname, 'DoesNotExist.conf'), 905, 6);

			monitor.on('configured', (err) => {
				expect(err).toBeDefined();
				expect(err).toEqual(jasmine.any(Error));
				expect(err.code).toEqual('ENOENT');
				expect(monitor._options).toBeUndefined();
				done();
			});

			monitor.configure();
		});

		it('handles missing CharacterDatabaseInfo', (done) => {
			const monitor = new Trinity3Monitor(path.join(__dirname, 'NoCharacterDatabaseInfo.conf'), 905, 6);

			monitor.on('configured', (err) => {
				expect(err).toBeDefined();
				expect(err).toEqual(jasmine.any(Error));
				expect(err.message).toContain('Could not find CharacterDatabaseInfo');
				expect(monitor._options).toBeUndefined();
				done();
			});

			monitor.configure();
		});

		it('handles missing AuctionHouseBot.Account when bot enabled', (done) => {
			const monitor = new Trinity3Monitor(path.join(__dirname, 'NoAuctionHouseBotAccountBotEnabled.conf'), 905, 6);

			monitor.on('configured', (err) => {
				expect(err).toBeDefined();
				expect(err).toEqual(jasmine.any(Error));
				expect(err.message).toContain('Auction House bot is enabled');
				expect(monitor._options).toBeUndefined();
				done();
			});

			monitor.configure();
		});

		it('doesn\'t care about missing AuctionHouseBot.Account when bot disabled', (done) => {
			const monitor = new Trinity3Monitor(path.join(__dirname, 'NoAuctionHouseBotAccountBotDisabled.conf'), 905, 6);

			monitor.on('configured', (err) => {
				expect(err).toBeUndefined();
				expect(monitor._ahBotAccount).toBeNull();
				done();
			});

			monitor.configure();
		});

		it('can parse a connection string with UNIX socket', (done) => {
			const monitor = new Trinity3Monitor(path.join(__dirname, 'UnixSocket.conf'), 905, 6);

			monitor.on('configured', (err) => {
				expect(err).toBeUndefined();
				expect(monitor._options.socketPath).toBe('/tmp/mysql.sock');
				expect(monitor._options.host).toBeUndefined();
				expect(monitor._options.port).toBeUndefined();
				expect(monitor._ahBotAccount).toBeNull();
				done();
			});

			monitor.configure();
		});

		it('can parse a connection string with host and port', (done) => {
			const monitor = new Trinity3Monitor(path.join(__dirname, 'HostPort.conf'), 905, 6);

			monitor.on('configured', (err) => {
				expect(err).toBeUndefined();
				expect(monitor._options.socketPath).toBeUndefined();
				expect(monitor._options.host).toBe('127.0.0.1');
				expect(monitor._options.port).toBe(3306);
				expect(monitor._ahBotAccount).toBe(5);
				done();
			});

			monitor.configure();
		});
	});

	describe('start()', () => {

	});
});
