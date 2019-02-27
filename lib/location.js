'use strict';

const iplocation = require('iplocation').default;
const def = require('./../config/defaults').locationProviders;
const providers = [
  "http://ip-api.com/json/*"
];
if(def.ipstack !== ''){
  providers.push("http://api.ipstack.com/*?access_key="+def.ipstack)
}
if(def.ipify !== ''){
  providers.push("https://geo.ipify.org/api/v1?apiKey="+def.ipify+"&ipAddress=*")
}
if(def.ipify !== ''){
  providers.push("https://api.ipgeolocation.io/ipgeo?apiKey="+def.ipgeolocation+"&ip=*");
}




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
  await iplocation(ip, providers).then(res => {
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
        ip: ip,
        error: 'All providers failed. This error is most likely being thrown due to a malformed IP'
      };
    } else if(err.message === 'Invalid IP address.') {
      ob = {
        ip: ip,
        error: 'Invalid IP address'
      };
		}
  });
  return ob;
}
