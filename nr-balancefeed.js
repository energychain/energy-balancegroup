module.exports = function(RED) {
    function EBNode(config) {
        RED.nodes.createNode(this,config);
        const node = this;
        const storage = node.context();
        const balance = RED.nodes.getNode(config.balance);

        node.on('input', async function(msg) {
            if(!isNaN(msg.payload)) {
              try {
              const consensus = balance.addReading(this.id,config.direction,msg.payload);
              node.status({fill:'green',shape:"dot",text:'Power:'+consensus.power+" Energy:"+consensus.value});
              } catch(e) {
                  node.status({fill:'red',shape:"dot",text:'Error:'+msg.payload});
              }
            } else {
              if(typeof msg.payload.reading !== 'undefined') {
                msg.payload = msg.payload.reading;
              }
              if((typeof msg.payload.upstream !== 'undefined') && (typeof msg.payload.downstream !== 'undefined')) {
                try {
                  const consensusUp = balance.addReading(this.id+'_upstream','upstream',msg.payload.upstream);
                  const consensusDown = balance.addReading(this.id+'_downstream','downstream',msg.payload.downstream);
                  node.status({fill:'green',shape:"dot",text:'Power:'+consensusUp.power+"/"+consensusDown.value});
                } catch(e) {
                    node.status({fill:'red',shape:"dot",text:'Error:'+msg.payload});
                }
              }
            }
        });

        this.cleared = function() {
            node.status({fill:'white',shape:"dot",text:''});
        }
    }
    RED.nodes.registerType("Feed",EBNode);
}
