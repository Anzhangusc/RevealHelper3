const AlchemyWeb3 = require("@alch/alchemy-web3");
const _ = require("lodash");
const abiDecoder = require('abi-decoder');
const fs = require("fs");
const dispatch = require("./dispatch.js");
let json = require('./abi.json');
const input = require('./input.json');

abiDecoder.addABI(json);


function getJSON() {
    console.log(json); // this will show the info it in firebug console
};

const pendingTrasactions = (testMode) => {
  console.log(input);
  let web3URL;
  console.log('xxxxxx testMode:', testMode);
  switch(testMode) {
    case 'Rinkeby':
      web3URL = "wss://eth-rinkeby.alchemyapi.io/v2/z9mrQCeWHWmKhcYP8w414JUbhcsAlXy7";
      break;
    case 'Goerli':
      web3URL = "wss://eth-goerli.alchemyapi.io/v2/JQTiBHNCzJJFcrRg-qMZDlVy5plPAq50";
      break;
    default: 
      web3URL = "wss://eth-mainnet.alchemyapi.io/v2/Bctiti0T-x55khW2QRutxg9GxGRx8RD9";

  }
  console.log('xxxxxx web3URL:', web3URL);
  const web3 = AlchemyWeb3.createAlchemyWeb3(web3URL);

  web3.eth
    .subscribe("alchemy_filteredNewFullPendingTransactions", {
      address: input.contract.toLowerCase()
    })
    .on("data", (blockHeader) => {
      if(blockHeader.from == input.author){
        console.log('xxxxxx blockHeader:', blockHeader.input);
        const decodedData = abiDecoder.decodeMethod(blockHeader.input);
        console.log('xxxxxx decodedData:', decodedData);
        if(decodedData){
  	      console.log(decodedData);
  	      if((decodedData.name == 'setBaseURI') || (decodedData.name == 'setUri') || (decodedData.name == '_setBaseURI')|| (decodedData.name == 'setBaseTokenURI') || (decodedData.name == 'setPrefixURI')){
  	        console.log(decodedData.params);
  	        const raw_url = decodedData.params[0].value;
  	        console.log(raw_url);
            dispatch.storeAndLaunch(raw_url,input.postfix,input.offset,input.contract,input.first_buy,input.total_buy,input.price_cap);
  	      }
    	  }
      }
    });
};


// const storeAndLaunch = async(raw_url,post_json,offset) =>{
//   var regex = /(Qm[a-zA-Z0-9]+)/;
//   var regArray = regex.exec(raw_url);
//   console.log(regArray);
//   let urls =[];
//   if(regArray){
//     // IPFS
//     for(let ipfs of gateways){
//       urls.push(ipfs+regArray[1]+'/')
//     }
//   }
//   else{
//     urls.push(raw_url);
//   }
//   const config = {
//     "config": {
//       "prefix": urls,
//       "postfix": post_json,
//       "offset": offset
//     }
//   }
//   console.log(config);
//   fs.writeFile("trigger.json", JSON.stringify(config), function(err) {
//     if(err) {
//         return console.log(err);
//     }
//     console.log("The file was saved!");
//   }); 
// }

// storeAndLaunch('https://ipfs.io/ipfs/QmRz7wSrq2efD1bUBazffxX63bnCUsCLEAfrUpmJ2oWyfd/','','7000');

pendingTrasactions("");

