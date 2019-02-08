'use strict';

const dns = require('dns');

// Resolves domain using DNS - Exampleof implementation
exports.lookup = async (domain) =>{
  let res;
  await dns.lookup(domain, (err, address)=>{
    if(err){
      // Invalid Domain
      res = "Couldn't resolve domain: "+domain;
    } else {
      res = address;
    }
    console.log('res ', res)
  })
}
