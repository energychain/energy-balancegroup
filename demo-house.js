#!/usr/bin/env node

/**
 This is a balancing demo for a house.
 There are three sub-balances: Kitchen, LivingRoom, Generator
 The house itself has a bi-directional grid connection.
 The metering itself is - as in real life - not perfect => see metering variation in the simulator
 Meters are captured every two seconds and a balance is generated every 4 seconds => see Intervals at the End
*/

const EBG = require("./BalanceGroup.class.js");

const virtualMetersKitchen = {
 'oven': { type: 'downstream', reading:0},
 'microwave': { type: 'downstream', reading:0},
 'dishwasher': { type: 'downstream', reading:0},
 'coffee': { type: 'downstream', reading:0},
 'kitchen': { type: 'upstream', reading:0}
}

const virtualMetersLivingRoom = {
 'tv': { type: 'downstream', reading:0},
 'light': { type: 'downstream', reading:0},
 'computer': { type: 'downstream', reading:0},
 'livingroom': { type: 'upstream', reading:0}
}

const virtualMetersGenerators = {
 'solar': { type: 'upstream', reading:0}
}

const simulateReadingsKitchen = function() {
  let totalConsumption = 0;
  for (const [key, value] of Object.entries(virtualMetersKitchen)) {
    let deviceConsumption = Math.round(Math.random() * 10);
    if(value.type == 'downstream') {
        value.reading += deviceConsumption;
        totalConsumption += deviceConsumption;
    }
  }
  virtualMetersKitchen.kitchen.reading += totalConsumption;
  // add some metering variation
  virtualMetersKitchen.kitchen.reading += Math.round( (Math.random() * 2) - 1 );
}

const simulateReadingsLiving = function() {
  let totalConsumption = 0;
  for (const [key, value] of Object.entries(virtualMetersLivingRoom)) {
    let deviceConsumption = Math.round(Math.random() * 10);
    if(value.type == 'downstream') {
        value.reading += deviceConsumption;
        totalConsumption += deviceConsumption;
    }
  }
  virtualMetersLivingRoom.livingroom.reading += totalConsumption;
  // add some metering variation
  virtualMetersLivingRoom.livingroom.reading += Math.round( (Math.random() * 2) - 1 );
}

const simulateReadingsGenerator = function() {
  virtualMetersGenerators.solar.reading += Math.round(Math.random() * 10);
}

/*
  Added Consumption/Generation per Balance
*/
const updateBalance = function() {
  for (const [key, value] of Object.entries(virtualMetersKitchen)) {
      ebgKitchen.addReading(key,value.reading);
  }
  for (const [key, value] of Object.entries(virtualMetersLivingRoom)) {
      ebgLiving.addReading(key,value.reading);
  }
  for (const [key, value] of Object.entries(virtualMetersGenerators)) {
      ebgGenerator.addReading(key,value.reading);
  }
}

let demo_name = "House Demo";
console.log(demo_name);

// Initialize Balance
const ebgKitchen = new EBG('Kitchen');
const ebgLiving = new EBG('Living');
const ebgGenerator = new EBG('Generator');
const ebgHouse = new EBG('House');

for (const [key, value] of Object.entries(virtualMetersKitchen)) {
    ebgKitchen.setFeedMeta(key,{type:value.type});
}
for (const [key, value] of Object.entries(virtualMetersLivingRoom)) {
    ebgLiving.setFeedMeta(key,{type:value.type});
}
for (const [key, value] of Object.entries(virtualMetersGenerators)) {
    ebgGenerator.setFeedMeta(key,{type:value.type});
}

// House has Sub-Balances as "Devices"
ebgHouse.setFeedMeta("Kitchen",{type:"downstream"});
ebgHouse.setFeedMeta("Living",{type:"downstream",label:"Living Room"});
ebgHouse.setFeedMeta("Generator",{type:"upstream"});

let itteration = 0;
const runReadingStep = function() {
  itteration++;
  simulateReadingsKitchen();
  simulateReadingsLiving();
  simulateReadingsGenerator();
  updateBalance();
}

const runBalanceStep = function() {
  ebgKitchen.close();
  ebgLiving.close();
  ebgGenerator.close();

  /*
  After Closing the balances for timeframe of child balances
  we use those sums as readings for the house.
  */
  const balancesKitchen = ebgKitchen.getBalances();
  if(balancesKitchen.length>0) {
    ebgHouse.addReading('Kitchen',balancesKitchen[balancesKitchen.length-1].reading.balance)
  };

  const balancesLiving = ebgLiving.getBalances();
  if(balancesLiving.length>0) {
    ebgHouse.addReading('Living',balancesLiving[balancesLiving.length-1].reading.balance)
  };

  const balancesGenerator = ebgGenerator.getBalances();
  if(balancesGenerator.length>0) {
    ebgHouse.addReading('Generator',balancesGenerator[balancesGenerator.length-1].reading.balance)
  };
  //console.dir(ebgHouse);
  ebgHouse.close();

  const balances = ebgHouse.getBalances();

  if(balances.length>0) {

    // transponate table
    let rows =0;
    if(balances[balances.length-1].table.upstream.length > rows) rows=balances[balances.length-1].table.upstream.length;
    if(balances[balances.length-1].table.downstream.length > rows) rows=balances[balances.length-1].table.downstream.length;
    let table = [];
    console.log('\n\r\n\r');
    console.log('Balance from ',new Date(balances[balances.length-1].time.start).toLocaleTimeString(),' until ',new Date(balances[balances.length-1].time.end).toLocaleTimeString());
    console.log('ID:',balances[balances.length-1].balanceId);
    console.log('Reading:',balances[balances.length-1].reading);
    for(let i=0;i<rows;i++) {
      let row = {}
      if(i<balances[balances.length-1].table.upstream.length) {
        row.upstream = {};
        row.upstream[ebgHouse.getLabel(balances[balances.length-1].table.upstream[i].feed)]=balances[balances.length-1].table.upstream[i].value;
      }
      if(i<balances[balances.length-1].table.downstream.length) {
        row.downstream = {};
        row.downstream[ebgHouse.getLabel(balances[balances.length-1].table.downstream[i].feed)]=balances[balances.length-1].table.downstream[i].value;
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
