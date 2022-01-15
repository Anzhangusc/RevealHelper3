const OpenseajsLib = require("opensea-js/lib/types");
const MnemonicWalletSubprovider =  require("@0x/subproviders");
const constant = require("./const.js");
const SECRET = require('../secret.json');
const RPCSubprovider = require("web3-provider-engine/subproviders/rpc");
const INFURA_URL = "https://mainnet.infura.io/v3/c2f55f15e8c446e1b2e5adec7416674a";
const Web3ProviderEngine = require("web3-provider-engine");
const OpeanseaJS = require("opensea-js");
var util = require("./util.js");
const fs = require("fs");

// import * as RPCSubprovider from 'web3-provider-engine/subproviders/rpc.js';

var buy_now_list = {};
var seaport = {};


module.exports.initialSeaPort = initialSeaPort;

function initialSeaPort() {
  try {
    const BASE_DERIVATION_PATH = `44'/60'/0'/0`;

    const mnemonicWalletSubprovider = new MnemonicWalletSubprovider.MnemonicWalletSubprovider({
      mnemonic: SECRET.MNEMONIC_PHRASE,
      baseDerivationPath: BASE_DERIVATION_PATH,
    });
    const infuraRpcSubprovider = new RPCSubprovider({
      rpcUrl: INFURA_URL,
    });

    const providerEngine = new Web3ProviderEngine();
    providerEngine.addProvider(mnemonicWalletSubprovider);
    providerEngine.addProvider(infuraRpcSubprovider);
    providerEngine.start();

    seaport = new OpeanseaJS.OpenSeaPort(providerEngine, {
      networkName: OpeanseaJS.Network.Main,
      apiKey: SECRET.API_KEY,
    });
  }catch (err) {
    console.log("ERROR initlize",err.message);
  }

}

module.exports.buyItem = buyItem;

async function buyItem(tokenId, contract, price_cap) {

  try {
    if (!seaport){
      initialSeaPort();
    }

    seaport.gasIncreaseFactor = 1.5;

    const order = await seaport.api.getOrder({
      asset_contract_address: contract,
      token_id: tokenId,
      is_english: 'false',
      side: OpenseajsLib.OrderSide.Sell,
      sale_kind: OpenseajsLib.SaleKind.FixedPrice,
    });
    if(order){
      console.log(order);
      const price_now = order.currentPrice.toNumber()/constant.WET_TO_ETH;
      console.log(price_now);
      if(price_now <= parseFloat(price_cap)){
        console.log("DEFAULT_GAS_INCREASE_FACTOR",seaport.gasIncreaseFactor);
        const transactionHash = await seaport.fulfillOrder({
          order,
          accountAddress: constant.BUYER,
        });
        console.log(transactionHash);
      }
      else{
        console.log("PURCHASE FAIL price increased")
      }
    }
  } catch (err) {
    console.log("ERROR TEST",err.message);
  }
};

module.exports.listenCurrentOrder = listenCurrentOrder;

async function listenCurrentOrder(contract,price_cap,offset) {
  
  initialSeaPort();
    
  while(1){
    const buy_now_map = new Map();
    const loop = Math.ceil(offset/20);
    var start = 0;

    for(let i = 0 ; i < loop ; i++){
      start = i * 20;
      const check_ids = new Array();
      for(let j = start; j < start + 20 ; j ++){
        check_ids.push(j.toString());
      }
      console.log(check_ids);
      const {orders} = await seaport.api.getOrders({
        sale_kind: OpenseajsLib.SaleKind.FixedPrice,
        asset_contract_address: contract,
        bundled: false,
        side: OpenseajsLib.OrderSide.Sell,
        is_english: false,
        limit: 50,
        token_ids: check_ids
      });
      const found = new Array();
      orders.map(order => {
        //console.log(order);
        var price_now = order.currentPrice.toNumber()/constant.WET_TO_ETH;
        if(price_now < parseFloat(price_cap)){
          //console.log(order.asset.tokenId + ":" +price_now);
          found.push(order.asset.tokenId);
          if(!buy_now_map.get(order.asset.tokenId)){
            buy_now_map.set(order.asset.tokenId,price_now);
            //fs.appendFile('sales', order.asset.tokenId+" "+price_now + "\n", function (err) {
            //  if (err) throw err;
            console.log('Added!',order.asset.tokenId,price_now);
            //});
          }
        }
      })
      for(let j = start; j < start + 20 ; j ++){
        if(!found.includes(j.toString())){
          if(buy_now_map.get(j.toString())){
            buy_now_map.delete(j.toString());
            console.log('Delete!',j.toString());
          }
        }
      }
      var sleep_time = util.getRandomInt(3000,4000);
      await util.sleep(sleep_time)
    }
    console.log(JSON.stringify(Object.fromEntries(buy_now_map)));
    fs.writeFile("sales.json", JSON.stringify(Object.fromEntries(buy_now_map)), function(err) {
      if(err) {
          return console.log(err);
      }
      console.log("The file was saved!");
    }); 

  }

}

module.exports.getBuyNowList = function(){
  var obj;
  fs.readFile("sales.json", 'utf8', function (err, data) {
    if (err) {
      console.log(err.message);
      return;
    }
    obj = JSON.parse(data);
    //console.log(obj);
    addonState(state,obj);
  });
  return obj;
}


// listenCurrentOrder('0x9Bf252f97891b907F002F2887EfF9246e3054080',2,9999);
// initialSeaPort();
// buyItem('15749','0x22c08c358f62f35b742d023bf2faf67e30e5376e','0.01')
