const fs = require("fs");
const constant = require("./const.js");


const gateways = ['https://anzh.mypinata.cloud/ipfs/','https://anzh1.mypinata.cloud/ipfs/','https://anzh2.mypinata.cloud/ipfs/','https://anzh3.mypinata.cloud/ipfs/' ];

module.exports.storeAndLaunch = storeAndLaunch;

async function storeAndLaunch(raw_url,postfix,offset,contract,first_buy,total_buy,price_cap) {
  var regex = /(Qm[a-zA-Z0-9]+)/;
  var regArray = regex.exec(raw_url);
  console.log(regArray);
  let urls =[];
  if(regArray){
    // IPFS
    for(let ipfs of gateways){
      urls.push(ipfs+regArray[1]+'/')
    }
  }
  else{
    urls.push(raw_url);
  }
  const config = {
    "config": {
      "prefix": urls,
      "postfix": postfix,
      "offset": offset,
      "contract": contract,
      "first_buy": first_buy,
      "total_buy": total_buy,
      "price_cap": price_cap
    }
  }
  console.log(config);
  fs.writeFile(constant.EFS_DIR+"trigger.json", JSON.stringify(config), function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("The file was saved!");
  }); 
}
