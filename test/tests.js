'use strict';

describe('Unit Tests', ()=>{
  require('./utils-tests');
  require('./location-tests');
  require('./ssl-tests');
  require('./brs-tests');
});
describe('Integration Tests', ()=>{
  require('./controller-tests');
});
