module.exports = function(RED) {
    function EBNode(config) {
        RED.nodes.createNode(this,config);
        const node = this;
        const storage = node.context();
        const balance = RED.nodes.getNode(config.balance);

        node.on('input', async function(msg) {
          const co  = balance.carryOver();
          node.send({payload:co});
        });

    }
    RED.nodes.registerType("CarryOver",EBNode);
}
