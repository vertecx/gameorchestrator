'use strict';

const spawn = require('child_process').spawn;
const go = require('./gameorchestrator');

const log = go.log;
const mcFake = new go.MinecraftFake('/usr/home/minecraft/lans');
const mcMon = new go.MinecraftMonitor('/usr/home/minecraft/lans', 898, 6);
const trinityMon = new go.Trinity3Monitor('/usr/home/trinity3/server/etc/worldserver.conf', 902, 6);

function service(script, action) {
	const actionTitle = action.charAt(0).toUpperCase() + action.substr(1);
	const service = spawn('/usr/local/bin/sudo', ['/usr/sbin/service', script, action]);

	service.on('exit', (code) => {
		if (code === 0) {
			log.simpleLogger(log.info, `${actionTitle} of the ${script} server was successful.`);
		} else {
			log.simpleLogger(log.error, `${actionTitle} of the ${script} server resulted in exit code ${code}.`);
		}
	});

	service.on('error', (err) => {
		log.simpleLogger(log.error, `${actionTitle} of the ${script} server failed: ${err.message}`);
	});
}

mcFake.once('configured', (err) => {
	if (err) {
		log.simpleLogger(log.error, `LANS Minecraft fake failed to configure: ${err.message}. Starting real server.`);

		service('minecraft', 'start');
	} else {
		mcFake.start();
		mcMon.configure();
	}
});

mcFake.on('login', () => {
	service('minecraft', 'start');
});

mcMon.once('configured', (err) => {
	if (err) return log.simpleLogger(log.error, `LANS Minecraft monitor failed to configure: ${err.message}`);

	mcMon.start();
});

mcMon.on('stop', () => {
	service('minecraft', 'stop');
});

trinityMon.once('configured', (err) => {
	if (err) return log.simpleLogger(log.error, `LANS WoW monitor failed to configure: ${err.message}`);

	trinityMon.start();
});

trinityMon.on('stop', () => {
	service('trinity3world', 'stop');
});

mcFake.on('log', log.simpleLogger);
mcMon.on('log', log.simpleLogger);
trinityMon.on('log', log.simpleLogger);

mcFake.configure();
trinityMon.configure();
