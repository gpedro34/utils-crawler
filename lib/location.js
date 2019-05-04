'use strict';

const iplocation = require('iplocation').default;
const path = require('path');
const fs = require('fs');

const utils = require('./utils');
// Providers
// base configs
const def = require('./../config/defaults').locationProviders;
const providers = [];
if (def.ipdata.length > 0) {
	def.ipdata.forEach(el => {
		providers.push('https://api.ipdata.co/*?api-key=' + el);
	});
}
if (def.ipgeolocation.length > 0) {
	def.ipgeolocation.forEach(el => {
		providers.push('https://api.ipgeolocation.io/ipgeo?apiKey=' + el + '&ip=*');
	});
}
providers.push('http://api.db-ip.com/v2/free/*');
if (def.ipinfo.length > 0) {
	def.ipinfo.forEach(el => {
		providers.push('https://ipinfo.io/*?token=' + el);
	});
}
if (def.dbip.length > 0) {
	def.dbip.forEach(el => {
		providers.push('http://api.db-ip.com/v2/' + el + '/*');
	});
}
if (def.ipify.length > 0) {
	def.ipify.forEach(el => {
		providers.push(
			'https://geo.ipify.org/api/v1?apiKey=' + el + '&ipAddress=*'
		);
	});
}
if (def.ipstack.length > 0) {
	def.ipstack.forEach(el => {
		providers.push('http://api.ipstack.com/*?access_key=' + el);
	});
}
providers.push('https://api.ipdata.co/*?api-key=test');
// ensure file and folder exist
let dir = path.join(__dirname.slice(0, __dirname.indexOf('lib')), 'data');
fs.existsSync(dir) || fs.mkdirSync(dir);
dir = path.join(dir, 'blacklists.json');
fs.existsSync(dir) || fs.writeFileSync(dir, JSON.stringify({ blacklists: [] }));
let blacklists = utils.readFileTrim(dir); // eslint-disable-line no-unused-vars
try {
	blacklists = JSON.parse(blacklists);
} catch (err) {
	if (err.message.indexOf('Unexpected token') >= 0) {
		fs.writeFileSync(dir, JSON.stringify({ blacklists: [] }));
		blacklists = { blacklists: [] };
	}
}

// Functions

// Updates the providers considering the json blacklist and updates said list
const updateBlacklisted = () => {
	let black = utils.readFileTrim(dir);
	try {
		black = JSON.parse(black);
	} catch (err) {
		if (err.message.indexOf('Unexpected') >= 0) {
			black = { blacklists: [] };
		} else {
			utils.logger(
				'Unexpected Error trying to parse blacklisted Location Providers: ',
				err
			);
		}
	} finally {
		black = black.blacklists;
		const newFile = { blacklists: [] };
		if (black.length > 0) {
			black.forEach(el => {
				let keep = true;
				// check if it is repeated
				newFile.blacklists.forEach(ele => {
					if (el.link === ele.link) {
						if (Math.abs(new Date(el.date) - new Date(ele.date)) > 0) {
							keep = false;
						}
					}
				});
				// check if cooldown time has passed
				const newDate = new Date();
				if (
					Math.abs(newDate - new Date(el.date)) >
					def.blacklistCooldown * 60 * 1000
				) {
					// utils.logger('Whitelisted: ', el);
					providers.push(el.link);
					keep = false;
				} else {
					if (providers.indexOf(el.link) >= 0) {
						providers.splice(providers.indexOf(el.link), 1);
						// utils.logger('Blacklisted: ', el);
					}
				}
				if (keep) {
					// utils.logger('Kept: ', el);
					newFile.blacklists.push(el);
				}
			});
		}
		// utils.logger('Updated blacklisted providers')
		fs.writeFileSync(dir, JSON.stringify(newFile));
	}
};
updateBlacklisted();

// Blacklists a given provider URL
const blacklistProvider = prov => {
	utils.logger('Blacklisting IP location provider: ' + prov);
	utils.logger('Providers left: ', providers.length + 1);
	let list = utils.readFileTrim(dir);
	let add = true;
	try {
		list = JSON.parse(list);
		list.forEach(el => {
			if (el.link === prov) {
				add = false;
			}
		});
	} catch (err) {
		if (err.indexOf('Unexpected') >= 0) {
			list = { blacklists: [] };
		} else {
			utils.logger(
				'Unexpected Error trying to parse blacklisted Location Providers: ',
				err
			);
		}
	} finally {
		if (add) {
			list.blacklists.push({ link: prov, date: new Date() });
		}
		fs.writeFileSync(dir, JSON.stringify(list));
	}
};

// Fix IPV6 for IP Location ([2001:db8:1234:0000:0000:0000:0000:0000] -> 2001:db8:1234:0000:0000:0000:0000:0000)
const ipv6Fix = ip => {
	if (ip.indexOf('[') >= 0 && ip.indexOf(']') > ip.indexOf('[')) {
		ip = ip.slice(1, ip.indexOf(']'));
	}
	return ip;
};

// locates IP
exports.locate = async ip => {
	ip = ipv6Fix(ip);
	let ob;
	await iplocation(ip, providers)
		.then(res => {
			// Blacklist provider
			try {
				if (!res || (!res.country && !res.city)) {
					blacklistProvider(providers[0]);
					res.country = 'N/A';
					res.city = 'N/A';
				}
			} catch (err) {
				if (err.indexOf("Cannot read property 'c") >= 0) {
					blacklistProvider(providers[0]);
					res.country = 'N/A';
					res.city = 'N/A';
				}
			}
			ob = {
				ip: ip,
				city: res.city,
				country: res.country,
				region: res.region,
				lat: res.latitude,
				long: res.longitude
			};
		})
		.catch(err => {
			if (err.message === 'All providers failed.') {
				ob = {
					ip: ip,
					error:
						'All providers failed. This error is most likely being thrown due to a malformed IP'
				};
			} else if (err.message === 'Invalid IP address.') {
				ob = {
					ip: ip,
					error: 'Invalid IP address'
				};
			}
		});
	return ob;
};
