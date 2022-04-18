module.exports = function(RED) {
    function EBNode(config) {

        RED.nodes.createNode(this,config);
        const node = this;
        const storage = node.context();
        const balance = RED.nodes.getNode(config.balance);

        node.on('input', async function(msg) {

            let clearing = balance.lastBalance();
            let payload = {
              upstream:{},
              downstream:{},
              consensus:{
                downstream:{},
                upstream:{}
              },
              disaggregation:{
                downstream:{},
                upstream:{}
              },
              meta:{}
            }
            const getLabelNode = function(id) {
              const _labelNode = RED.nodes.getNode(id);
               if((typeof _labelNode !== 'undefined')&&(_labelNode !== null)) {
                  if(typeof _labelNode.name == 'undefined') { _labelNode.name = key; }
                  return _labelNode.name
               } else {
                 return id;
               }
            }
            const labelDirection = function(dir) {
                for (let [key, value] of Object.entries(clearing[dir])) {
                    let org_key = key;

                     if(key.indexOf('_') > 0 ){
                       key = key.substr(0,key.indexOf('_'));
                     }
                     const _labelNode = RED.nodes.getNode(key);
                     let name = getLabelNode(key);

                     if((typeof _labelNode !== 'undefined')&&(_labelNode !== null)) {
                         _labelNode.cleared();
                         payload[dir][name] = value;
                     }
                     payload.consensus[dir][name] = clearing.consensus[dir][org_key];
                     if(typeof clearing.disaggregation[dir][org_key] !== 'undefined') {
                       payload.disaggregation[dir][name] = {};
                        for (let [key2, value2] of Object.entries(clearing.disaggregation[dir][org_key])) {
                          let name2 = getLabelNode(key2);
                          payload.disaggregation[dir][name][name2] = clearing.disaggregation[dir][org_key][key2];
                       }
                     }
                }
            }
            labelDirection('upstream');
            labelDirection('downstream');
            payload.timeframe = clearing.timeframe;
            payload.reading = clearing.reading;
            payload.meta = clearing.meta;
            node.send([{payload:payload},{payload:payload.upstream},{payload:payload.downstream},{payload:clearing.meta}]);
        });

    }
    RED.nodes.registerType("BalanceView",EBNode);
}
