'use strict';

const iplocation = require('iplocation').default;

// Fix IPV6 for IP Location ([2001:db8:1234:0000:0000:0000:0000:0000] -> 2001:db8:1234:0000:0000:0000:0000:0000)
const ipv6Fix = (ip) => {
  if(ip.indexOf('[') >= 0 && ip.indexOf(']') > ip.indexOf('[')){
    ip = ip.slice(1, ip.indexOf(']'));
  }
  return ip;
}

// locates IP
exports.locate = async (ip) => {
  ip = ipv6Fix(ip);
  let ob;
  await iplocation(ip).then(res => {
    ob = {
      ip: ip,
      city: res.city,
      country: res.country,
      region: res.region,
      lat: res.latitude,
      long: res.longitude
    }
  }).catch(err => {
    if(err.message === 'All providers failed.'){
			ob = {
        error: 'All providers failed. This error is most likely being thrown due to a malformed IP'
      };
    } else if(err.message === 'Invalid IP address.') {
      ob = {
        error: 'Invalid IP address'
      };
		} else {
      console.log('Errored trying to locate IP '+ip);
      console.log(err);
      return;
    }
  });
  return ob;
}
