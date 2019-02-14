'use strict';

const expect = require('chai').expect;

const control = require('./../lib/controller');

describe('Public API Check', ()=>{
  describe('With Port', ()=>{
    it('Invalid', async ()=>{
      const data = await control.walletAPICheck('wallet.burst-alliance.org:8125');
      // Object
      expect(data).to.have.property('isPublicAPI');
      expect(data).to.have.property('apiPort');
      // Data
      expect(data.isPublicAPI).to.equal(false);
    });
    it('Valid (using localhost)', async()=>{
      const data = await control.walletAPICheck('localhost:8125');
      // Object
      expect(data).to.have.property('isPublicAPI');
      expect(data).to.have.property('apiPort');
      // Data
      expect(data.isPublicAPI).to.equal(true);
    });
  });
  describe('Without Port', ()=>{
    it('Invalid', async ()=>{
      const data = await control.walletAPICheck('wallet.burst-alliance.org');
      // Object
      expect(data).to.have.property('isPublicAPI');
      expect(data).to.have.property('apiPort');
      // Data
      expect(data.isPublicAPI).to.equal(false);
    });
    it.skip('Valid (using localhost on port 80)', async()=>{
      const data = await control.walletAPICheck('localhost');
      // Object
      expect(data).to.have.property('isPublicAPI');
      expect(data).to.have.property('apiPort');
      // Data
      expect(data.isPublicAPI).to.equal(true);
    });
  });
});
