const input = require('./input.json');
const opensea = require("./opensea.js");

if(input.contract && input.offset && input.price_cap){
	opensea.listenCurrentOrder(input.contract,input.price_cap,input.offset);
}
