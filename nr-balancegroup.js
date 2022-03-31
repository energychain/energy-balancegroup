module.exports = function(RED) {
    function BGNode(config) {
       const BG = require("./BalanceGroup.class.js");

        RED.nodes.createNode(this,config);
        const node = this;
        const storage = node.context();
        let bg = new BG(config.name);
        let data = storage.get("json");

        if((typeof data !== 'undefined') && (data !== null)) {
          bg.fromString(data);
        }
        bg.on('Consensus',function(idx) {
          if(idx>0) {
            const balances = bg.getBalances();
            const balance = balances[balances.length-1];
            let ctrlMsg = {
              topic:"consensus",
              payload:balance
            };
            node.send(["consensus",ctrlMsg]);
          }
        });
        node.on('input', async function(msg) {
            node.status({fill:'yellow',shape:"dot",text:'processing'});
            if((msg.topic == '_meta')&&(typeof msg.payload == 'object')&&(typeof msg.payload.feedId !== 'undefined')) {
                bg.setFeedMeta(msg.payload.feedId,msg.payload.meta);
            } else
            if((msg.topic == '_meta')&&(Array.isArray(msg.payload))) {
                for(let i=0;i<msg.payload.length;i++) {
                  bg.setFeedMeta(msg.payload[i].feedId,msg.payload[i].meta);
                }
            } else
            if((msg.topic == '_ctrl')&&(msg.payload == 'missing')) {
                node.send(["missing",{topic:"missing",payload:bg.missingPositions()}]);
                ;
            } else
            if((msg.topic == '_ctrl')&&(msg.payload == 'close')) {
                bg.close();
                let balances = bg.getBalances();
                let ctrlMsg = {
                  topic:"close",
                  payload:balances.pop()
                };
                node.send(["close",ctrlMsg]);
            } else
            if((msg.topic == '_ctrl')&&(msg.payload == 'balances')) {
                console.log(bg);
                let ctrlMsg = {
                  topic:"balances",
                  payload:bg.getBalances()
                };
                node.send(["balances",ctrlMsg]);
            } else
            if((typeof msg.payload == 'object')&&(msg.payload !== null)) {
                let topic_ext = '';
                if((typeof msg.topic !== 'undefined') && (msg.topic !== null) && (msg.topic.length > 0)) {
                  topic_ext = msg.topic + "_";
                }
                for (const [key, value] of Object.entries(msg.payload)) {
                  if(!isNaN(value)) {
                    bg.addReading(topic_ext+key,value);
                  }
                }
            } else
            if((!isNaN(msg.payload)) && (typeof msg.topic !== 'undefined')) {
                bg.addReading(msg.topic,msg.payload);
            }
            await storage.set("json",bg.toString());
            await storage.set("data",JSON.parse(bg.toString()));
            let txt = "";
            let sums = bg.sums();
            for (const [key, value] of Object.entries(sums)) {
              txt += key+":"+ Math.round(value) + " ";
            }
            node.status({fill:'white',shape:"dot",text:txt});
        });

    }
    RED.nodes.registerType("BalanceGroup",BGNode);
}
