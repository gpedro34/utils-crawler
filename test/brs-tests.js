'use strict';

const expect = require('chai').expect;

const brs = require('./../lib/brs');
const def = require('./../config/defaults').tests.brs;

describe('BRS Tests', ()=>{
  describe('API checks', ()=>{
    it('getTime', async ()=>{
      const data = await brs.callBRS(def.publicWallet, brs.BRS_API_REQUESTS.TIME);
      expect(data).to.have.property('time');
      expect(data).to.have.property('requestProcessingTime');
    });
    it('getTime throught HTTPS', async ()=>{
      const data = await brs.callBRS(def.publicWalletWithSSL, brs.BRS_API_REQUESTS.TIME, true);
      expect(data).to.have.property('time');
      expect(data).to.have.property('requestProcessingTime');
    });
  });
  describe('P2P checks', ()=>{
    it('P2P call getInfo', async ()=>{
      const data = await brs.callBRS(def.p2pWallet, brs.BRS_REQUESTS.INFO);
      expect(data).to.have.property('announcedAddress');
      expect(data).to.have.property('application');
      expect(data).to.have.property('version');
      expect(data).to.have.property('platform');
      expect(data).to.have.property('shareAddress');
    });
    it('P2P call getPeers', async ()=>{
      const data = await brs.callBRS(def.p2pWallet, brs.BRS_REQUESTS.PEERS);
      expect(data).to.have.property('peers');
    });
  });
  describe('Normalized peer URLs for API calls', ()=>{
    describe("Don't add API path", ()=>{
      it("host:8125", async()=>{
        const data = await brs.normalizeAPI('localhost:8125', true);
        expect(data).to.equal('localhost:8125');
      });
      it("host:8000", async()=>{
        const data = await brs.normalizeAPI('localhost:8000', true);
        expect(data).to.equal('localhost:8000');
      });
      it("host:8123", async()=>{
        const data = await brs.normalizeAPI('localhost:8123', true);
        expect(data).to.equal('localhost:8125');
      });
      it("IPv6:8123", async()=>{
        const data = await brs.normalizeAPI('[2001:19f0:4400:432c:5400:1ff:fe35:2641]:8123', true);
        expect(data).to.equal('[2001:19f0:4400:432c:5400:1ff:fe35:2641]:8123');
      });
      it("host:8125 (HTTP)", async()=>{
        const data = await brs.normalizeAPI('http://localhost:8125', true);
        expect(data).to.equal('http://localhost:8125');
      });
      it("host:8000 (HTTP)", async()=>{
        const data = await brs.normalizeAPI('http://localhost:8000', true);
        expect(data).to.equal('http://localhost:8000');
      });
      it("host:8123 (HTTP)", async()=>{
        const data = await brs.normalizeAPI('http://localhost:8123', true);
        expect(data).to.equal('http://localhost:8125');
      });
    });
    describe('Add API path', ()=>{
      it("host:8125", async()=>{
        const data = await brs.normalizeAPI('localhost:8125');
        expect(data).to.equal('localhost:8125/burst?requestType=');
      });
      it("host:8000", async()=>{
        const data = await brs.normalizeAPI('localhost:8000');
        expect(data).to.equal('localhost:8000/burst?requestType=');
      });
      it("host:8123", async()=>{
        const data = await brs.normalizeAPI('localhost:8123');
        expect(data).to.equal('localhost:8125/burst?requestType=');
      });
      it("host:8125 (HTTP)", async()=>{
        const data = await brs.normalizeAPI('http://localhost:8125');
        expect(data).to.equal('http://localhost:8125/burst?requestType=');
      });
      it("host:8000 (HTTP)", async()=>{
        const data = await brs.normalizeAPI('http://localhost:8000');
        expect(data).to.equal('http://localhost:8000/burst?requestType=');
      });
      it("host:8123 (HTTP)", async()=>{
        const data = await brs.normalizeAPI('http://localhost:8123');
        expect(data).to.equal('http://localhost:8125/burst?requestType=');
      });
      it("IPv6", async()=>{
        const data = await brs.normalizeAPI('[2001:19f0:4400:432c:5400:1ff:fe35:2641]:8123');
        expect(data).to.equal('[2001:19f0:4400:432c:5400:1ff:fe35:2641]:8123/burst?requestType=');
      });
    });
    describe('No Ports', ()=>{
      it("Domain", async()=>{
        const data = await brs.normalizeAPI('localhost');
        expect(data).to.equal('localhost:8125/burst?requestType=');
      });
      it("IPv4", async()=>{
        const data = await brs.normalizeAPI('123.123.123.123');
        expect(data).to.equal('123.123.123.123:8125/burst?requestType=');
      });
      it("IPv6", async()=>{
        const data = await brs.normalizeAPI('[2001:19f0:4400:432c:5400:1ff:fe35:2641]');
        expect(data).to.equal('[2001:19f0:4400:432c:5400:1ff:fe35:2641]:8125/burst?requestType=');
      });
    });
    describe('Error Handling', ()=>{
      it("No params error", async()=>{
        const data = await brs.normalizeAPI();
        expect(data).to.have.property('message');
        expect(data.message).to.equal('You must provide a peer to normalize');
      });
    });
  });
});
