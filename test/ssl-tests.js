'use strict';
/*
    We Verify:
    - If there is a Certificate
    - errors verified by the browser itself (IP mismatches)
    . Time Validity of certificate

    We don't verify:
    - Protocol Security
    - Key Exchange
    - Cipher Security

    A much deeper analisys can be done in the browser by acessing
    'https://globalsign.ssllabs.com/analyze.html?d=' + DOMAIN_TO_SEARCH
*/
/* eslint no-undef: "off" */

const { expect } = require('chai');

const ssl = require('./../lib/ssl');
const def = require('./../config/defaults').tests.ssl;

describe('SSL Check Tests', () => {
	describe('Test', () => {
		it('Verify SSL', async () => {
			const data = await ssl.checkSSL('google.com');
			// Object
			expect(data).to.have.property('status');
			expect(data).to.have.property('domain');
			expect(data).to.have.property('validFrom');
			expect(data).to.have.property('validTo');
			expect(data).to.have.property('daysRemaining');
			// Data
			expect(data.status).to.equal(ssl.SSL_CODES.VALID);
		});
	});
	describe('Responses', () => {
		it('Valid', async () => {
			const data = await ssl.checkSSL(def.valid);
			// Object
			expect(data).to.have.property('status');
			expect(data).to.have.property('domain');
			expect(data).to.have.property('validFrom');
			expect(data).to.have.property('validTo');
			expect(data).to.have.property('daysRemaining');
			// Data
			expect(data.status).to.equal(ssl.SSL_CODES.VALID);
		});
		it('Valid with port', async () => {
			const data = await ssl.checkSSL(def.validWithPort, 8125);
			// Object
			expect(data).to.have.property('status');
			expect(data).to.have.property('domain');
			expect(data).to.have.property('validFrom');
			expect(data).to.have.property('validTo');
			expect(data).to.have.property('daysRemaining');
			// Data
			expect(data.status).to.equal(ssl.SSL_CODES.VALID);
		});
		it('IP mismatch', async () => {
			const data = await ssl.checkSSL(def.ipMismatch);
			// Object
			expect(data).to.have.property('status');
			expect(data).to.have.property('domain');
			expect(data).to.have.property('certFrom');
			expect(data).to.have.property('certTo');
			expect(data).to.have.property('daysRemaining');
			// Data
			expect(data.status).to.equal(ssl.SSL_CODES.IP_MISMATCH);
		});
		it('Expired', async () => {
			const data = await ssl.checkSSL(def.expired);
			// Object
			expect(data).to.have.property('status');
			expect(data).to.have.property('domain');
			expect(data).to.have.property('expiredSince');
			expect(data).to.have.property('expiredDays');
			// Data
			expect(data.status).to.equal(ssl.SSL_CODES.EXPIRED);
		});
	});
	describe('Error Handling', () => {
		it('Invalid', async () => {
			const data = await ssl.checkSSL(def.invalid);
			// Object
			expect(data).to.have.property('status');
			expect(data).to.have.property('domain');
			// Data
			expect(data.status).to.equal(ssl.SSL_CODES.INVALID);
		});
		it('Domain not found', async () => {
			const data = await ssl.checkSSL(def.notFound);
			// Object
			expect(data).to.have.property('status');
			expect(data).to.have.property('domain');
			// Data
			expect(data.status).to.equal(ssl.SSL_CODES.NOT_FOUND);
		});
	});
});
