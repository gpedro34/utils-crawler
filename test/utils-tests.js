'use strict';

/* eslint no-undef: "off" */

const { expect } = require('chai');

const utils = require('./../lib/utils');
const brs = require('./../lib/brs');
const def = require('./../config/defaults').tests;

describe('Utils Tests', () => {
	describe('Util normalizeDomain', () => {
		describe('No protocol', () => {
			it('Domain without port', () => {
				const url = utils.normalizeDomain('localhost');
				expect(url).to.equal('localhost');
			});
			it('Domain with port', () => {
				const url = utils.normalizeDomain('localhost:8125');
				expect(url).to.equal('localhost');
			});
			it('IPv4 without port', () => {
				const url = utils.normalizeDomain('123.123.123.123');
				expect(url).to.equal('123.123.123.123');
			});
			it('IPv4 with port', () => {
				const url = utils.normalizeDomain('123.123.123.123:8125');
				expect(url).to.equal('123.123.123.123');
			});
			it('IPv6 without port', () => {
				const url = utils.normalizeDomain(
					'[2001:19f0:4400:432c:5400:1ff:fe35:2641]'
				);
				expect(url).to.equal('[2001:19f0:4400:432c:5400:1ff:fe35:2641]');
			});
			it('IPv6 with port', () => {
				const url = utils.normalizeDomain(
					'[2001:19f0:4400:432c:5400:1ff:fe35:2641]:8125'
				);
				expect(url).to.equal('[2001:19f0:4400:432c:5400:1ff:fe35:2641]');
			});
		});
		describe('HTTP', () => {
			it('Domain without port', () => {
				const url = utils.normalizeDomain('http://localhost');
				expect(url).to.equal('localhost');
			});
			it('Domain with port', () => {
				const url = utils.normalizeDomain('http://localhost:8125');
				expect(url).to.equal('localhost');
			});
			it('IPv4 without port', () => {
				const url = utils.normalizeDomain('http://123.123.123.123');
				expect(url).to.equal('123.123.123.123');
			});
			it('IPv4 with port', () => {
				const url = utils.normalizeDomain('http://123.123.123.123:8125');
				expect(url).to.equal('123.123.123.123');
			});
			it('IPv6 without port', () => {
				const url = utils.normalizeDomain(
					'http://[2001:19f0:4400:432c:5400:1ff:fe35:2641]'
				);
				expect(url).to.equal('[2001:19f0:4400:432c:5400:1ff:fe35:2641]');
			});
			it('IPv6 with port', () => {
				const url = utils.normalizeDomain(
					'http://[2001:19f0:4400:432c:5400:1ff:fe35:2641]:8125'
				);
				expect(url).to.equal('[2001:19f0:4400:432c:5400:1ff:fe35:2641]');
			});
		});
		describe('HTTPS', () => {
			it('Domain without port', () => {
				const url = utils.normalizeDomain('https://localhost');
				expect(url).to.equal('localhost');
			});
			it('Domain with port', () => {
				const url = utils.normalizeDomain('https://localhost:8125');
				expect(url).to.equal('localhost');
			});
			it('IPv4 without port', () => {
				const url = utils.normalizeDomain('https://123.123.123.123');
				expect(url).to.equal('123.123.123.123');
			});
			it('IPv4 with port', () => {
				const url = utils.normalizeDomain('https://123.123.123.123:8125');
				expect(url).to.equal('123.123.123.123');
			});
			it('IPv6 without port', () => {
				const url = utils.normalizeDomain(
					'https://[2001:19f0:4400:432c:5400:1ff:fe35:2641]'
				);
				expect(url).to.equal('[2001:19f0:4400:432c:5400:1ff:fe35:2641]');
			});
			it('IPv6 with port', () => {
				const url = utils.normalizeDomain(
					'https://[2001:19f0:4400:432c:5400:1ff:fe35:2641]:8125'
				);
				expect(url).to.equal('[2001:19f0:4400:432c:5400:1ff:fe35:2641]');
			});
		});
	});
	describe('Util normalizePeer', () => {
		it('No port', () => {
			const url = utils.normalizePeer('localhost');
			expect(url).to.equal('localhost:8123');
		});
		it('Port 8123', () => {
			const url = utils.normalizePeer('localhost:8123');
			expect(url).to.equal('localhost:8123');
		});
		it('Port 8125', () => {
			const url = utils.normalizePeer('localhost:8125');
			expect(url).to.equal('localhost:8123');
		});
		it('Different than 8125 (8000)', () => {
			const url = utils.normalizePeer('localhost:8000');
			expect(url).to.equal('localhost:8000');
		});
	});
	describe('Util normalizeAPIPort', () => {
		it('No port', () => {
			const url = utils.normalizeAPIPort('localhost');
			expect(url).to.equal('localhost:8125');
		});
		it('Port 8123', () => {
			const url = utils.normalizeAPIPort('localhost:8123');
			expect(url).to.equal('localhost:8125');
		});
		it('Port 8125', () => {
			const url = utils.normalizeAPIPort('localhost:8125');
			expect(url).to.equal('localhost:8125');
		});
		it('Different than 8123 (8000)', () => {
			const url = utils.normalizeAPIPort('localhost:8000');
			expect(url).to.equal('localhost:8000');
		});
	});
	describe('Util getPort', () => {
		describe('No protocol', () => {
			it('Domain', () => {
				const data = utils.getPort(def.utils.domain);
				expect(data).to.equal('8125');
			});
			it('undefined if no port in the domain', () => {
				const url = def.utils.domain.slice(0, def.utils.domain.indexOf(':'));
				const data = utils.getPort(url);
				expect(data).to.equal(undefined);
			});
			it('IPv4', () => {
				const data = utils.getPort(def.utils.IPv4);
				expect(data).to.equal('8125');
			});
			it('undefined if no port in the IPv4', () => {
				const url = def.utils.IPv4.slice(0, def.utils.IPv4.indexOf(':'));
				const data = utils.getPort(url);
				expect(data).to.equal(undefined);
			});
			it('IPv6', () => {
				const data = utils.getPort(def.utils.IPv6);
				expect(data).to.equal('8125');
			});
			it('undefined if no port in the IPv6', () => {
				const url = def.utils.IPv6.slice(
					0,
					def.utils.IPv6.indexOf(':', def.utils.IPv6.indexOf(']'))
				);
				const data = utils.getPort(url);
				expect(data).to.equal(undefined);
			});
		});
		describe('HTTP', () => {
			it('Domain', () => {
				const data = utils.getPort('http://' + def.utils.domain);
				expect(data).to.equal('8125');
			});
			it('undefined if no port in the domain', () => {
				const url =
					'http://' + def.utils.domain.slice(0, def.utils.domain.indexOf(':'));
				const data = utils.getPort(url);
				expect(data).to.equal(undefined);
			});
			it('IPv4', () => {
				const data = utils.getPort('http://' + def.utils.IPv4);
				expect(data).to.equal('8125');
			});
			it('undefined if no port in the IPv4', () => {
				const url =
					'http://' + def.utils.IPv4.slice(0, def.utils.IPv4.indexOf(':'));
				const data = utils.getPort(url);
				expect(data).to.equal(undefined);
			});
			it('IPv6', () => {
				const data = utils.getPort('http://' + def.utils.IPv6);
				expect(data).to.equal('8125');
			});
			it('undefined if no port in the IPv6', () => {
				const url =
					'http://' +
					def.utils.IPv6.slice(
						0,
						def.utils.IPv6.indexOf(':', def.utils.IPv6.indexOf(']'))
					);
				const data = utils.getPort(url);
				expect(data).to.equal(undefined);
			});
		});
		describe('HTTPS', () => {
			it('Domain', () => {
				const data = utils.getPort('https://' + def.utils.domain);
				expect(data).to.equal('8125');
			});
			it('undefined if no port in the domain', () => {
				const url =
					'https://' + def.utils.domain.slice(0, def.utils.domain.indexOf(':'));
				const data = utils.getPort(url);
				expect(data).to.equal(undefined);
			});
			it('IPv4', () => {
				const data = utils.getPort('https://' + def.utils.IPv4);
				expect(data).to.equal('8125');
			});
			it('undefined if no port in the IPv4', () => {
				const url =
					'https://' + def.utils.IPv4.slice(0, def.utils.IPv4.indexOf(':'));
				const data = utils.getPort(url);
				expect(data).to.equal(undefined);
			});
			it('IPv6', () => {
				const data = utils.getPort('https://' + def.utils.IPv6);
				expect(data).to.equal('8125');
			});
			it('undefined if no port in the IPv6', () => {
				const url =
					'https://' +
					def.utils.IPv6.slice(
						0,
						def.utils.IPv6.indexOf(':', def.utils.IPv6.indexOf(']'))
					);
				const data = utils.getPort(url);
				expect(data).to.equal(undefined);
			});
		});
	});
	describe('Util withoutPort', () => {
		describe('No protocol', () => {
			it('Domain', () => {
				const data = utils.withoutPort(def.utils.domain);
				expect(data).to.equal(
					def.utils.domain.slice(0, def.utils.domain.length - 5)
				);
			});
			it('IPv4', () => {
				const data = utils.withoutPort(def.utils.IPv4);
				expect(data).to.equal(
					def.utils.IPv4.slice(0, def.utils.IPv4.length - 5)
				);
			});
			it('IPv6', () => {
				const data = utils.withoutPort(def.utils.IPv6);
				expect(data).to.equal(
					def.utils.IPv6.slice(0, def.utils.IPv6.length - 5)
				);
			});
		});
		describe('HTTP', () => {
			it('Domain', () => {
				const data = utils.withoutPort('http://' + def.utils.domain);
				expect(data).to.equal(
					'http://' + def.utils.domain.slice(0, def.utils.domain.length - 5)
				);
			});
			it('IPv4', () => {
				const data = utils.withoutPort('http://' + def.utils.IPv4);
				expect(data).to.equal(
					'http://' + def.utils.IPv4.slice(0, def.utils.IPv4.length - 5)
				);
			});
			it('IPv6', () => {
				const data = utils.withoutPort('http://' + def.utils.IPv6);
				expect(data).to.equal(
					'http://' + def.utils.IPv6.slice(0, def.utils.IPv6.length - 5)
				);
			});
		});
		describe('HTTPS', () => {
			it('Domain', () => {
				const data = utils.withoutPort('https://' + def.utils.domain);
				expect(data).to.equal(
					'https://' + def.utils.domain.slice(0, def.utils.domain.length - 5)
				);
			});
			it('IPv4', () => {
				const data = utils.withoutPort('https://' + def.utils.IPv4);
				expect(data).to.equal(
					'https://' + def.utils.IPv4.slice(0, def.utils.IPv4.length - 5)
				);
			});
			it('IPv6', () => {
				const data = utils.withoutPort('https://' + def.utils.IPv6);
				expect(data).to.equal(
					'https://' + def.utils.IPv6.slice(0, def.utils.IPv6.length - 5)
				);
			});
		});
	});
	describe('Util asyncForEach', () => {
		it('Syncronous callback', async () => {
			const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
			const resArr = [];
			try {
				await utils.asyncForEach(arr, el => {
					resArr.push(el + 10);
				});
			} finally {
				expect(resArr).to.have.lengthOf(arr.length);
				for (let count = 0; count < resArr.length; count++) {
					expect(resArr[count]).to.equal(arr[count] + 10);
				}
			}
		});
		it('Asyncronous callback', async () => {
			const arr = [0, 1, 2];
			const resArr = [];
			try {
				await utils.asyncForEach(arr, async el => {
					const data = await brs.callBRS(
						def.brs.publicWalletWithSSL,
						brs.BRS_API_REQUESTS.TIME,
						true
					);
					resArr.push(data);
				});
			} finally {
				expect(resArr).to.have.lengthOf(arr.length);
				for (let a = 0; a < resArr.length; a++) {
					expect(resArr[a]).to.have.property('time');
					expect(resArr[a]).to.have.property('requestProcessingTime');
				}
			}
		});
	});
	describe('Util readFileTrim', () => {
		it('Should be able to read test.txt', () => {
			const data = utils.readFileTrim(__dirname + '/test.txt');
			expect(data).to.equal('test');
		});
		it("Should return null if a file doesn't exist", () => {
			const data = utils.readFileTrim(__dirname + '/non_existing_file');
			expect(data).to.equal(null);
		});
	});
});
