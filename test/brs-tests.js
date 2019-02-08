'use strict';

const expect = require('chai').expect;

const brs = require('./../lib/brs');
const def = require('./../config/defaults').tests.brs;

describe('BRS API checks', ()=>{
  it('API call getTime', async ()=>{
    const data = await brs.callBRS(def.publicWallet, brs.BRS_API_REQUESTS.TIME);
    expect(data).to.have.property('time');
    expect(data).to.have.property('requestProcessingTime');
  });
});
describe('BRS P2P checks', ()=>{
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
  it("normalizeAPI('localhost:8125', true)", async()=>{
    const data = await brs.normalizeAPI('localhost:8125', true);
    expect(data).to.equal('localhost:8125');
  });
  it("normalizeAPI('localhost:8123', true)", async()=>{
    const data = await brs.normalizeAPI('localhost:8123', true);
    expect(data).to.equal('localhost:8125');
  });
  it("normalizeAPI('http://localhost:8125', true)", async()=>{
    const data = await brs.normalizeAPI('http://localhost:8125', true);
    expect(data).to.equal('http://localhost:8125');
  });
  it("normalizeAPI('http://localhost:8123', true)", async()=>{
    const data = await brs.normalizeAPI('http://localhost:8123', true);
    expect(data).to.equal('http://localhost:8125');
  });
  it("normalizeAPI('localhost:8125')", async()=>{
    const data = await brs.normalizeAPI('localhost:8125');
    expect(data).to.equal('localhost:8125/burst?requestType=');
  });
  it("normalizeAPI('localhost:8125')", async()=>{
    const data = await brs.normalizeAPI('localhost:8123');
    expect(data).to.equal('localhost:8125/burst?requestType=');
  });
  it("normalizeAPI('http://localhost:8125')", async()=>{
    const data = await brs.normalizeAPI('http://localhost:8125');
    expect(data).to.equal('http://localhost:8125/burst?requestType=');
  });
  it("normalizeAPI('http://localhost:8125')", async()=>{
    const data = await brs.normalizeAPI('http://localhost:8123');
    expect(data).to.equal('http://localhost:8125/burst?requestType=');
  });
})
