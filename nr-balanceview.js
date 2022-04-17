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
              meta:{}
            }

            const labelDirection = function(dir) {
                for (let [key, value] of Object.entries(clearing[dir])) {
                     if(key.indexOf('_') > 0 ){
                       key = key.substr(0,key.indexOf('_'));
                     }
                     const _labelNode = RED.nodes.getNode(key);
                     if((typeof _labelNode !== 'undefined')&&(_labelNode !== null)) {
                         _labelNode.cleared();
                         if(typeof _labelNode.name == 'undefined') { _labelNode.name = key; }
                         payload[dir][_labelNode.name] = value;
                     }
                }
            }
            labelDirection('upstream');
            labelDirection('downstream');
            payload.timeframe = clearing.timeframe;
            payload.reading = clearing.reading;
            payload.meta = clearing.meta;
            payload.consensus = clearing.consensus;
            node.send([{payload:payload},{payload:payload.upstream},{payload:payload.downstream},{payload:clearing.meta}]);
        });

    }
    RED.nodes.registerType("BalanceView",EBNode);
}
