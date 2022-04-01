#!/usr/bin/env node

const { program } = require('commander');
const fs = require("fs");
const EBG = require("./BalanceGroup.class.js");

program
  .option('-i --input <file>','JSON File with readings')
  .option('-s --storage <file>','default: ./ebg-storage.json')
  .option('-n --name <BalanceName>')
  .option('-f --feed <identifier>')
  .option('-m --feedMeta <type of stream>','Either upstream or downstream - select feed with -f')
  .option('-r --reading <number>','Set current reading for feed specified with -f')
  .option('-p --showPositions','Displays current balance positions')
  .option('-c --close','Close Balance')
  .option('--showConsensus','Displays all readings');

program.parse();

const options = program.opts();

if(typeof options.name == 'undefined') options.name ="";
const ebg = new EBG(options.name);

if(typeof options.storage == 'undefined') options.storage ="ebg-storage.json";
if(fs.existsSync(options.storage)) {
  const storage = fs.readFileSync(options.storage);
  ebg.fromString(storage);
}

if((typeof options.feed !== 'undefined') && (typeof options.feedMeta !== 'undefined')) {
  ebg.setFeedMeta(options.feed,options.feedMeta);
}

if((typeof options.feed !== 'undefined') && (typeof options.reading !== 'undefined')) {
  ebg.addReading(options.feed,options.reading * 1);
}

if(typeof options.input !== 'undefined') {
  let obj = JSON.parse(fs.readFileSync(options.input));
  for (const [key, value] of Object.entries(obj)) {
    if(!isNaN(value)) {
      ebg.addReading(key,value);
    }
  }
}

if(typeof options.showPositions !== 'undefined') {
  console.dir(ebg.positions());
}

if(typeof options.close !== 'undefined') {
  let last = ebg.close();
  console.dir(last);
}

if(typeof options.showConsensus !== 'undefined') {
  console.dir(ebg._feeds);
}

fs.writeFileSync(options.storage,ebg.toString());
