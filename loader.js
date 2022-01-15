const fetch = require("node-fetch-commonjs");
var constant = require("./const.js");
var util = require("./util.js");
const fs = require("fs");
const _ = require("lodash");
const opensea = require("./opensea.js");

let TOTAL_SUPPLY = 1;
const is_buy = true;


const fileToJson = async (state,file) => {
  var obj;
  fs.readFile(constant.EFS_DIR+file, 'utf8', function (err, data) {
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

const addonState = async(state, tinfo) => {
  Object.keys(tinfo).forEach(function(key) {
    //console.log(key, tinfo[key]);
    if(key == 'num'){
      if('num' in state){
        state.num += tinfo[key];
      }
      else{
        state['num'] = tinfo[key];
      }
    }
    else{
      if(key in state){
        Object.entries(tinfo[key]).forEach(([trait_key, trait_value]) => {
          //console.log(trait_key, trait_value)
          if(trait_key in state[key]){
            state[key][trait_key] += trait_value;
          }
          else{
            state[key][trait_key] = trait_value;
          }
      });
      }
      else{
        state[key] = tinfo[key];
      }
    }
  });
}

const rarityScore = async (key,raw,sorted_result,state,printItems,downloaded,contract,price_cap) => {
  let res = -1.0;
  let printout = "";
  if(raw){
    if('attributes' in raw){
      if(raw.attributes.length > 0){
        let traits = raw.attributes;
        //console.log(traits);
        if(Object.prototype.toString.call(traits) === '[object Array]') {
          // if it's one on one, buy directly
          res = 0.0;
          if(traits.length === 1){
            const trait_1on1 = traits[0];
            if(util.isUnreveal(trait_1on1)){
              return false;
            }
            else{
              if(is_buy){
                console.log("Start buyinng",key);
                opensea.buyItem(key,contract,price_cap);
              }
            }
          }
          const traits_length = traits.length.toString();
          //console.log('traits_length ', traits_length);
          if('num_traits' in state){
            if(state.num_traits){
              let quan = TOTAL_SUPPLY;
              if(traits_length in state.num_traits){
                quan = state.num_traits[traits_length];
              }
              else{
                quan = 1;
              }
              const freq = quan/TOTAL_SUPPLY;
              var size = Object.keys(state.num_traits).length;
              //console.log('num_traits ',quan, " ", freq, " ", size)
              printout += '(num_traits: ' + traits_length.toString() + "-" + freq.toString() + ") ";
              const trait_score = 1/(freq*freq*size*size);
              res += trait_score;

            }
          }
          for(const trait of traits){
            if(trait == null){
              continue;
            }
            else{
              if('trait_type' in trait){
                if(trait.trait_type != null){
                  let quan = TOTAL_SUPPLY;
                  const trait_key = trait.trait_type.toString();
                  if(trait_key in state){
                    let trait_value = "";
                    if('value' in trait){
                      if(trait.value != null){
                        trait_value = trait.value.toString();
                        if(trait_value in state[trait_key]){
                          quan = state[trait_key][trait_value];
                        }
                        else{
                          quan = 1
                        }
                      }
                      else{
                        continue;
                      }
                    }
                    else{
                      continue;
                    }
                    const freq = quan/TOTAL_SUPPLY;
                    var size = Object.keys(state[trait_key]).length;
                    //console.log(trait_key , " " ,quan, " ", freq, " ", size)
                    if(trait_value) {
                      printout += '('+ trait_key +': ' + trait_value + "-" + freq.toString() + ") "
                    }
                    const trait_score = 1/(freq*freq*size*size);
                    res += trait_score;
                  }
                }
              }
            }
          }
          //console.log(key ,"score:",res , printout);
          sorted_result[key] = res;
          if(printItems){
            printItems[key] = key.toString() +" score:"+res + printout;
          }
          else{
            printItems = {
              key: key +" score:"+res + printout
            }
          }
          if(res>0){
            if(downloaded){
              downloaded[key] = raw;
            }
            else{
              downloaded = {
                key: raw
              }
            }
          }
        }
      }
    }
  }
}

const download = async (url,key,sorted_result,buyNow,state,downloaded,printItems,contract,price_cap) =>{
  console.log(url);
  fetch(url, {
    method: "GET",
    cache: 'no-cache',
    timeout: 7000
  })
  .then(response => response.json())
  .then(async response => {
    await rarityScore(key,response, sorted_result,state,printItems,downloaded,contract,price_cap);

  })
  .catch(err => {
    console.log(err);
  });
}

const urlGen = (token,config) => {
  return config.prefix + token + config.postfix;
}

// download live buy_now items info and get the score of them. Update sorted_result
const downloadBuyNow = async (buyNow, downloaded, sorted_result, config, state,printItems) =>{
  Object.keys(buyNow).forEach(function(key) {
    download(urlGen(key,config),key,sorted_result,buyNow,state,downloaded,printItems,config.contract,config.price_cap);
  })
}

const getPendingDownload = (buy_now, downloaded) =>{
  let res = {};
  Object.keys(buy_now).forEach(function(key) {
    if(!(key in downloaded)){
      res[key] = buy_now[key];
    }
  })
  return res;
}

const getBuyNowFromFile = () =>{
  return [];
}

// Load downloaded items every time to get live score when reveal. Update sorted_result
const loadRarity = async (downloaded, sorted_result, state,printItems,contract,price_cap) =>{
  Object.keys(downloaded).forEach(function(key) {
    rarityScore(key,downloaded[key], sorted_result,state,printItems,downloaded,contract,price_cap);
  })
}

module.exports.loader = loader;
async function loader(config,vm_info) {
  let state = {};
  let downloaded = {};
  let sorted_result = {};
  let printItems = {};
  let boughtItems = [];
  TOTAL_SUPPLY = config.offset;
  var intervalID = setInterval(async function(){
    console.log("Current Status of traits",state);
    console.log("Downloaded BUY NOW items",Object.keys(downloaded));
    const sort_tmp = Object.entries(sorted_result).sort((a,b) => b[1]-a[1]);
    const buy_list = Object.keys(sort_tmp);
    for(let i = 0; i < Math.min(40, buy_list.length); i++){
      console.log(printItems[buy_list[i]])
    }
       
    if(state.num){
      console.log("Loaded items",state.num,"/",config.offset);
      if(state.num > 0.6 * config.offset){
        if(buy_list.length > 75){
          if(boughtItems.length == 0){
            //TODO buy 1/2 here
            for(let i = 0 ; i < config.first_buy; i ++){
              if(is_buy){
                console.log("Start buyinng 1 ",buy_list[i]);
                opensea.buyItem(buy_list[i],config.contract,config.price_cap);
                boughtItems.push(buy_list[i]);
              }
            }
          }
        }
      }
      if(state.num > 0.8 * config.offset){
        if(buy_list.length > 80){
          if(boughtItems.length <= config.total_buy){
            //TODO buy 1/2 here
            for(let i = 0 ; i < config.total_buy ; i ++){
              if(boughtItems.includes(buy_list[i])){
                continue;
              }
              else{
                if(is_buy){
                  console.log("Start buyinng 2",buy_list[i]);
                  opensea.buyItem(buy_list[i],config.contract,config.price_cap);
                  boughtItems.push(buy_list[i]);
                }
                if(boughtItems.length >= config.total_buy ){
                  break;
                }
              }
            }
          }
        }
      }
    }
    console.log("BOUGHT ITMES",boughtItems);
    loadRarity(downloaded,sorted_result,state,printItems,config.contract,config.price_cap);
    state = {};
    for(let i = 0 ; i < vm_info.VM_NUM ; i ++){
      const tinfo = await fileToJson(state,i.toString());    
    }
  },1000)


  let buy_now_list = getBuyNowFromFile();
  let pending_download = getPendingDownload(buy_now_list,downloaded);
  console.log("PENDING DOWNLOAD BUY NOW",pending_download);
  if(pending_download){
    downloadBuyNow(pending_download, downloaded, sorted_result, config, state,printItems);
  }
  var intervalDownloadID = setInterval(async function(){
    buy_now_list = getBuyNowFromFile();
    pending_download = getPendingDownload(buy_now_list,downloaded);
    console.log("PENDING DOWNLOAD BUY NOW",pending_download);
    if(pending_download){
      downloadBuyNow(pending_download, downloaded, sorted_result, config, state,printItems);
    }
  },6000)

}

// const config = {"config":{"prefix":["https://api.apekidsclub.io/api/"],"postfix":"","offset":"9965","contract": "0x9Bf252f97891b907F002F2887EfF9246e3054080",
//       "first_buy": 2,
//       "total_buy": 3,
//       "price_cap": "3"}}

// loader(config.config,{
//   "VM_ID" : 12,
//   "VM_TYPE": 0,
//   "VM_NUM": 23
// });
