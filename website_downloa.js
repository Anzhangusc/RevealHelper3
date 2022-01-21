const fetch = require("node-fetch-commonjs");
var util = require("./util.js");
var constant = require("./const.js");
// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the Region 
AWS.config.update({region: 'us-west-1'});
s3 = new AWS.S3({apiVersion: '2006-03-01'});

const traitLoad = (raw, state) =>{
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
          //console.log('traits_length ', traits_length);
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
  return fetch(url, {
    method: "GET",
    cache: 'no-cache',
    timeout: 7000,
  })
  .then(response => response.json())
  .then(response => {
    //console.log("RESPONESE",response);
    //const res = traitLoad(response, state);
    return response;
  })
  .catch(err => {
    console.log(err);
  });
}

const batchDownload  = async (url, start, offset, postfix, items, state, all) =>{
  for (let key of Object.keys(items)){
    const res = await download(url+key.toString()+postfix,state,items,key);
    if(traitLoad(res,state)){
      all[key] = res;
    }
    else{
      console.log("RETRY LATER")
    }    
  };
}

const writeState = async (state,contract) =>{
  let last_num = 0;
  if(state){
    if(state.num){
      const current_num = state.num;
      console.log(last_num,current_num);
      if(last_num != current_num){
        writeStateDB(contract,state);
        last_num = current_num;
      }
    }
  }
  console.log(state);
}

module.exports.trigger = trigger;

async function trigger(config){
  let state = {};
  let items = {};
  let all = {};

  console.log(util.getRandomInt(config.prefix.length));
  const url = config.prefix;
  const postfix = config.postfix;
  let offset = Math.ceil(config.offset);
  let start = config.start;

  for(let i = start; i < start + offset; i ++){
    items[i] = true;
  }

  await batchDownload(url, start, offset, postfix, items, state,all);
  writeState(state,config.contract);
  var sortable = [];
  var details = {};
  for(let i of Object.keys(all)){
    const [score, detail] = rarityScore(i,all[i],state,details);
    sortable.push([i,score,detail]);
  }
  sortable.sort(function(a, b) {
    return b[1] - a[1];
  });
  console.log(sortable);
  writeRank(sortable,config.contract);
}

const rarityScore = (key,raw,state,details) => {
  let res = -1.0;
  let printout = "";
  let detail = [];
  let TOTAL_SUPPLY = state.num;
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
              //const trait_score = 1/(freq*freq*size*size);
              const trait_score = 1/(freq*size);
              detail.push({
                'name': 'num_traits',
                'value': traits_length.toString(),
                'freq': quan.toString(),
                'prob': freq.toString(),
                'score': trait_score.toString()
              })
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
                    //const trait_score = 1/(freq*freq*size*size);
                    const trait_score = 1/(freq*size);
                    detail.push({
                      'name': trait_key,
                      'value': trait_value,
                      'freq': quan.toString(),
                      'prob': freq.toString(),
                      'score': trait_score.toString()
                    })
                    res += trait_score;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  details[key] = detail;
  return [res,detail];
}

const writeRank = (sortable,contract) => {
  var dynamodb = new AWS.DynamoDB();
  var docClient = new AWS.DynamoDB.DocumentClient();

  for (let rank = 0 ; rank < sortable.length; rank ++){
    
    const newRank = {
      TableName: "rank",
      Item:{
          Contract: contract.toLowerCase(),
          Token_id: sortable[rank][0],
          Rank: rank+1,
          Score: sortable[rank][1],
          Detail: JSON.stringify(sortable[rank][2]),
      }
    };
    docClient.put(newRank, function(err, data) {
      if (err) {
          console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          console.log("Added item:", JSON.stringify(data, null, 2));
      }
    });
  }
  
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

const config = {
  "prefix": "https://anzh.mypinata.cloud/ipfs/QmeBWSnYPEnUimvpPfNHuvgcK9wFH9Sa6cZ4KDfgkfJJis/",
  "postfix": "",
  "offset": 10000,
  "contract": "0xed5af388653567af2f388e6224dc7c4b3241c544",
  "start": 0
}

trigger(config);


