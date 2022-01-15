const fetch = require("node-fetch-commonjs");
const util = require("./util.js");
const fs = require("fs");
const _ = require("lodash");
const dispatch = require("./dispatch.js");
//let proxy = require("./proxies.json");
const input = require('./input.json');

const keepTryURI = async(url) => {
  console.log(input);
  setInterval(async function () {
    let final_url = url + util.getRandomInt(1000).toString() + input.postfix;
    console.log(final_url);
    fetch(final_url, {
      method: "GET",
      cache: 'no-cache',
      timeout: 7000
      //proxies: proxy
    })
    .then(response => response.json())
    .then(async response => {
      console.log(response);
      if('attributes' in response){
        if(Object.prototype.toString.call(response.attributes) === '[object Array]'){
          if(response.attributes.length > 0){
            dispatch.storeAndLaunch(url,input.postfix,input.offset,input.contract,input.first_buy,input.total_buy,input.price_cap);
          }
        }
      }
    })
    .catch(err => {
      console.log(err);
    });
  },(500+util.getRandomInt(800)));
  
}

keepTryURI(input.prefix);