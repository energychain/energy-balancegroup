#!/usr/bin/env node

const EBG = require("./BalanceGroup.class.js");

const virtualMeters = {
 'oven': { type: 'downstream', reading:0},
 'microwave': { type: 'downstream', reading:0},
 'dishwasher': { type: 'downstream', reading:0},
 'coffee': { type: 'downstream', reading:0},
 'kitchenmeter': { type: 'upstream', reading:0}
}

const simulateReadings = function() {
  let totalConsumption = 0;
  for (const [key, value] of Object.entries(virtualMeters)) {
    let deviceConsumption = Math.round(Math.random() * 10);
    if(value.type == 'downstream') {
        value.reading += deviceConsumption;
        totalConsumption += deviceConsumption;
    }
  }
  virtualMeters.kitchenmeter.reading += totalConsumption;
  // add some metering variation
  virtualMeters.kitchenmeter.reading += Math.round( (Math.random() * 2) - 1 );
}

const updateBalance = function() {
  for (const [key, value] of Object.entries(virtualMeters)) {
      ebg.addReading(key,value.reading);
  }
}

let demo_name = "Kitchen Demo";
console.log(demo_name);

// Initialize Balance
const ebg = new EBG(demo_name);

for (const [key, value] of Object.entries(virtualMeters)) {
    ebg.setFeedMeta(key,{type:value.type});
}

let itteration = 0;
const runReadingStep = function() {
  itteration++;
  simulateReadings();
  updateBalance();
  console.log("Meter Readings (Itteration:"+itteration+")");
  console.table(virtualMeters);
}

const runBalanceStep = function() {
  const lastInsert = ebg.close();
  const balances = ebg.getBalances();
  if(balances.length>0) {
    // transponate table
    let rows =0;
    if(balances[balances.length-1].table.upstream.length > rows) rows=balances[balances.length-1].table.upstream.length;
    if(balances[balances.length-1].table.downstream.length > rows) rows=balances[balances.length-1].table.downstream.length;
    let table = [];
    console.log('Balance from ',new Date(balances[balances.length-1].time.start).toLocaleTimeString(),' until ',new Date(balances[balances.length-1].time.end).toLocaleTimeString());
    for(let i=0;i<rows;i++) {
      let row = {}
      if(i<balances[balances.length-1].table.upstream.length) {
        row.upstream = balances[balances.length-1].table.upstream[i];
      }
      if(i<balances[balances.length-1].table.downstream.length) {
        row.downstream = balances[balances.length-1].table.downstream[i];
      }
      table.push(row);
    }
    console.table(table);
  } else {
    console.log("No Balance");
  }
}

setInterval(runReadingStep,2000);
setInterval(runBalanceStep,4000);
