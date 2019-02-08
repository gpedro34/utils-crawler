'use strict';

const expect = require('chai').expect;

const locate = require('./../lib/location').locate;
const def = require('./../config/defaults').tests.location;

describe('Location', ()=>{
  it('Locate IPv4', async ()=>{
    const data = await locate(def.IPv4ToTest);
    expect(data).to.have.property('ip');
    expect(data).to.have.property('city');
    expect(data).to.have.property('country');
    expect(data).to.have.property('region');
    expect(data).to.have.property('lat');
    expect(data).to.have.property('long');
  });
  it('Locate IPV6', async()=>{
    const data = await locate(def.IPv6ToTest);
    expect(data).to.have.property('ip');
    expect(data).to.have.property('city');
    expect(data).to.have.property('country');
    expect(data).to.have.property('region');
    expect(data).to.have.property('lat');
    expect(data).to.have.property('long');
  });
});
