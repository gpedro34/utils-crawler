'use strict';

const expect = require('chai').expect;

const control = require('./../lib/controller');

describe('Flow Tests', ()=>{
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
    describe('Without Port (will use port 80)', ()=>{
      it('Invalid (using localhost on port 80)', async ()=>{
        const data = await control.walletAPICheck('localhost');
        // Object
        expect(data).to.have.property('isPublicAPI');
        expect(data).to.have.property('apiPort');
        // Data
        expect(data.isPublicAPI).to.equal(false);
      });
      it('Valid', async()=>{
        const data = await control.walletAPICheck('wallet.burst-alliance.org');
        // Object
        expect(data).to.have.property('isPublicAPI');
        expect(data).to.have.property('apiPort');
        // Data
        expect(data.isPublicAPI).to.equal(true);
      });
    });
  });
});
