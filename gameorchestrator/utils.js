'use strict';

const fs = require('fs');
const mc = require('minecraft-protocol');
const path = require('path');

/**
 * Get Minecraft server version from the symbolically linked JAR.
 * @param {string} root - Hello World
 * @param {testCallback} callback - Test
 */
module.exports.minecraftVersion = (root, callback) => {
	fs.readlink(path.join(root, 'minecraft_server.jar'), (err, linkString) => {
		if (err) return callback(err);

		const versionMatch = linkString.match(/minecraft_server\.([0-9.]+)\.jar$/);

		if (!versionMatch || versionMatch.length !== 2) return callback(new Error('Could not detect Minecraft version.'));
		if (!mc.supportedVersions.includes(versionMatch[1])) return callback(new Error(`Minecraft version ${versionMatch[1]} not supported by minecraft-protocol.`));

		callback(null, versionMatch[1]);
	});
};

/**
 * Read server.properties into an object literal.
 * @param {string} root Asd
 * @param {function} callback Test
 */
module.exports.minecraftProperties = (root, callback) => {
	fs.readFile(path.join(root, 'server.properties'), 'utf8', (err, data) => {
		if (err) return callback(err);

		const properties = {};

		for (const line of data.split('\n')) {
			if (!line.startsWith('#')) {
				const split = line.trim().split('=', 2);

				if (split.length === 2) {
					if (split[1].length === 0) {
						properties[split[0]] = null;
					} else if (!isNaN(split[1])) {
						properties[split[0]] = parseInt(split[1]);
					} else if (split[1] === 'true') {
						properties[split[0]] = true;
					} else if (split[1] === 'false') {
						properties[split[0]] = false;
					} else {
						// TODO: Unescape string
						properties[split[0]] = split[1];
					}
				}
			}
		}

		callback(null, properties);
	});
};
