module.exports = function(RED) {
    function EBNode(config) {
        RED.nodes.createNode(this,config);
        const node = this;
        const storage = node.context();
        const balance = RED.nodes.getNode(config.balance);

        node.on('input', async function(msg) {
            if((typeof msg.topic !== 'undefined') && (msg.topic.length > 0)) {
                balance.addMeta(msg.topic,msg.payload);
            } else
            if(typeof msg.payload == 'object') {
                for (const [key, value] of Object.entries(msg.payload)) {
                  balance.addMeta(key,value);
                }
            }
        });
    }
    RED.nodes.registerType("MetaData",EBNode);
}
