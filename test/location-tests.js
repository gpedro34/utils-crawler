'use strict';

/* eslint no-undef: "off" */

const { expect } = require('chai');

const { locate } = require('./../lib/location');
const def = require('./../config/defaults').tests.location;

describe('Location Check Tests', () => {
	describe('Locate', () => {
		it('IPv4', async () => {
			const data = await locate(def.IPv4ToTest);
			expect(data).to.have.property('ip');
			expect(data).to.have.property('city');
			expect(data).to.have.property('country');
			expect(data).to.have.property('region');
			expect(data).to.have.property('lat');
			expect(data).to.have.property('long');
		});
		it('IPV6', async () => {
			const data = await locate(def.IPv6ToTest);
			expect(data).to.have.property('ip');
			expect(data).to.have.property('city');
			expect(data).to.have.property('country');
			expect(data).to.have.property('region');
			expect(data).to.have.property('lat');
			expect(data).to.have.property('long');
		});
	});
	describe('Error Handling', () => {
		it('Invalid IP', async () => {
			const data = await locate('256.256.256.256');
			expect(data).to.have.property('error');
			expect(data.error).to.equal('Invalid IP address');
		});
		it.skip('All providers failed error', async () => {
			const data = await locate('aaaaaa');
			expect(data).to.have.property('error');
			expect(data.error).to.equal(
				'All providers failed. This error is most likely being thrown due to a malformed IP'
			);
		});
	});
});
