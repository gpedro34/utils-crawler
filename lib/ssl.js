'use strict';

const sslChecker = require('ssl-checker');

const utils = require('./utils');
const self = require('./ssl');

exports.SSL_CODES = {
  VALID: 0,
  INVALID: 1,
  NOT_FOUND: 2,
  IP_MISMATCH: 3,
  EXPIRED: 4
}

// check for SSL Information
exports.checkSSL = async (url,  port=443) => {
  url = utils.normalizeDomain(url);
  let ob;
  try{
    const resSSL = await sslChecker(url, 'GET', port);
    if(resSSL.valid === false){
      if(resSSL.days_remaining <= 0){
        ob = {
          status: self.SSL_CODES.EXPIRED,
          domain: url,
          expiredSince: resSSL.valid_to,
          expiredDays: resSSL.days_remaining
        };
      } else {
        ob = {
          status: self.SSL_CODES.IP_MISMATCH,
          domain: url,
          certFrom: resSSL.valid_from,
          certTo: resSSL.valid_to,
          daysRemaining: resSSL.days_remaining
        };
      }
    } else {
      // Valid SSL
      ob = {
        status: self.SSL_CODES.VALID,
        domain: url,
        validFrom: resSSL.valid_from,
        validTo: resSSL.valid_to,
        daysRemaining: resSSL.days_remaining
      };
    }
  } catch (err) {
    if(err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET'){
        // Host not found
        ob = {
          status: self.SSL_CODES.NOT_FOUND,
          domain: url
        };
    } else {
      // Invalid SSL
      ob = {
        status: self.SSL_CODES.INVALID,
        domain: url
      };
    }
  }
  return ob;
}
