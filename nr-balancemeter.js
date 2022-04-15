module.exports = function(RED) {
    function EBNode(config) {

        RED.nodes.createNode(this,config);
        const node = this;
        const storage = node.context();
        const balance = RED.nodes.getNode(config.balance);

        node.on('input', async function(msg) {
          if(config.btype == 'cleared') {
            msg.payload = balance.readingCleared();
            node.send(msg);
          } else {
            msg.payload = balance.readingSettled();
            node.send(msg);
          }
        });

    }
    RED.nodes.registerType("Meter",EBNode);
}
