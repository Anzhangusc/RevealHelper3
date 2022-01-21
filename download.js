const fetch = require("node-fetch-commonjs");
var util = require("./util.js");
const fs = require("fs");
var constant = require("./const.js");
// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the Region 
AWS.config.update({region: 'us-west-1'});
s3 = new AWS.S3({apiVersion: '2006-03-01'});

const traitLoad = async(raw, state) =>{
  let res = false;
  if(raw){
    if('attributes' in raw){
      if(Object.prototype.toString.call(raw.attributes) === '[object Array]'){
        if(raw.attributes.length > 0){
          let traits = raw.attributes;
          if(traits.length === 1){
            const trait_1on1 = traits[0];
            if(util.isUnreveal(trait_1on1)){
              return false;
            }
          }
          const traits_length = traits.length.toString();
          console.log('traits_length ', traits_length);
          if('num_traits' in state){
            if(state.num_traits){
              if(traits_length in state.num_traits){
                state['num_traits'][traits_length] += 1;
              }
              else{
                state['num_traits'][traits_length] = 1;
              }
            }
          }
          else{
            const tmp_num = new Object();
            tmp_num[traits_length] = 1; 
            state['num_traits'] = tmp_num;

          }
          for(const trait of traits){
            if(trait == null){
              continue;
            }
            else{
              if('trait_type' in trait){
                if(trait.trait_type != null){
                  const trait_key = trait.trait_type.toString();
                  if(!(trait_key in state)){
                    state[trait_key] = {};
                  }
                  if('value' in trait){
                    if(trait.value != null){
                      res = true;
                      const trait_value = trait.value.toString();
                      if(trait_value in state[trait_key]){
                        state[trait_key][trait_value] += 1;
                      }
                      else{
                        state[trait_key][trait_value]=1;
                      }
                    }
                    else{
                      continue;
                    }
                  }
                }
                else{
                  continue;
                }
              }
            }
          }
          if(res){
            if('num' in state){
              if(state['num'] != null){
                state['num'] += 1;
              }
              else{
                state['num'] = 1;
              }
            }
            else{
              state['num'] = 1;
            }
          }
        }
      }
    }
  }
  return res;
}

const download = async (url,state,items,key) =>{
  console.log(url);
  fetch(url, {
    method: "GET",
    cache: 'no-cache',
    timeout: 7000
  })
  .then(response => response.json())
  .then(async response => {
    // console.log(response);
    const res = await traitLoad(response, state);
    if(res){
      console.log("DELETE ",key);
      delete items[key];
    }
    return res;
  })
  .catch(err => {
    console.log(err);
  });
}

const batchDownload  = async (url, start, offset, postfix, items, state) =>{
  Object.keys(items).forEach(function(key) {
    download(url+key.toString()+postfix,state,items,key);
  });
}

const writeState = async (state,vm_id) =>{
  let last_num = 0;
  var intervalID = setInterval(async function(){
    if(state){
      if(state.num){
        const current_num = state.num;
        console.log(last_num,current_num);
        if(last_num != current_num){
          writeStateAWS(vm_id.toString(),state);
          last_num = current_num;
          // fs.writeFile(constant.EFS_DIR+vm_id.toString(), JSON.stringify(state), function(err) {
          //   if(err) {
          //       return console.log(err);
          //   }
          //   console.log("The file was saved!");
          //   last_num = current_num;
          // }); 
        }
      }
    }
    console.log(state);
  },1000)

  await util.sleep(180000);
  clearInterval(intervalID);
}

module.exports.trigger = trigger;

async function trigger(config,vm_info){
  let state = {};
  let items = {};

  console.log(util.getRandomInt(config.prefix.length));
  const url = config.prefix[util.getRandomInt(config.prefix.length)];
  const postfix = config.postfix;
  let offset = Math.ceil(config.offset/vm_info.VM_NUM);
  let start = vm_info.VM_ID*offset;

  for(let i = start; i < start + offset; i ++){
    items[i] = true;
  }

  batchDownload(url, start, offset, postfix, items, state);
  setInterval(async function(){
    batchDownload(url, start, offset, postfix, items, state);
  },6000)
  writeState(state,vm_info.VM_ID);
}

// const config = {"config":{"prefix":["https://api.apekidsclub.io/api/"],"postfix":"","offset":"9965"}}
// const state = trigger(config.config,{
//   "VM_ID" : 13,
//   "VM_TYPE": 1,
//   "VM_NUM": 23
// })

// trigger(config.config,{
//   "VM_ID" : 12,
//   "VM_TYPE": 1,
//   "VM_NUM": 23
// })

const writeStateAWS = async (file, json) =>{
  var uploadParams = {Bucket: 'nft-quant44219-staging', Key: 'public/'+file, Body: JSON.stringify(json)};
  s3.upload (uploadParams, function (err, data) {
    if (err) {
      console.log("Error", err);
    } if (data) {
      console.log("Upload Success", data.Location);
      var params = {
        Bucket: "nft-quant44219-staging", 
        Key: 'public/'+file,
        ACL: "public-read"
       };
      s3.putObjectAcl(params, function(err, data) {
         if (err) console.log(err, err.stack); // an error occurred
         else     console.log(data);           // successful response
       });
    }
  });
}

const writeStateDB = async (contract, json) =>{

  var dynamodb = new AWS.DynamoDB();
  var docClient = new AWS.DynamoDB.DocumentClient();

  const newState = {
    TableName: "Trait_State",
    Item:{
        Contract: contract.toLowerCase(),
        State: JSON.stringify(json)
    }
  };
  docClient.put(newState, function(err, data) {
    if (err) {
        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Added item:", JSON.stringify(data, null, 2));
    }
  });
}

