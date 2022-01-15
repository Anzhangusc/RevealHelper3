const Loader = require("./loader.js");
const Trigger = require("./download.js");
const fs = require("fs");
const _ = require("lodash");
const constant = require("./const.js");
const VM_INFO = require("../VM.json");

module.exports.readTrigger = readTrigger;

async function readTrigger() {
  let previous;
  console.log(VM_INFO);
  setInterval(async function(){
    var obj;
    fs.readFile(constant.EFS_DIR+'trigger.json', 'utf8', function (err, data) {
      if (err) {
        console.log(err.message);
        return;
      }
      try{
        obj = JSON.parse(data);
        //console.log("VM_INFO",VM_INFO);
        //console.log("Read from config json file",obj);
        if(obj){
          if(obj.config){
            const config = obj.config;
            if(!_.isEqual(previous, config)){
              if(VM_INFO.VM_TYPE == 1){
                Trigger.trigger(config,VM_INFO);
              }
              else{
                Loader.loader(config,VM_INFO);
              } 
              previous = config;
            }
          }
        }
      }
      catch(err){
        console.log(err.message);
      }
    });
    return obj;
  },500)
}

readTrigger();