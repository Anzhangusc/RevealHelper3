var constant = require("./const.js");


module.exports.sleep = function (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports.getRandomInt = function (max) {
  return Math.floor(Math.random() * max);
}

module.exports.isUnreveal = function (obj) {
  for(let i in obj){
    if(constant.unreveal.includes(i)){
      return true;
    }
    if(constant.unreveal.includes(obj[i])){
      return true;
    }
  }
  return false;
}