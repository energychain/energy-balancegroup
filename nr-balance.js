module.exports = function(RED) {
    function EBNode(config) {
        const Balance = require("./Balance.class.js");

        RED.nodes.createNode(this,config);
        const node = this;
        const storage = node.context();
        node.balance = new Balance(config.id);
        const storedBalance = storage.get(config.id);
        if((typeof storedBalance !== 'undefined') && (storedBalance !== null)) {
          node.balance.fromString(storedBalance);
        }
        let dirtyCount = 0;
        let lastPersisted = new Date().getTime();

        this.addReading = function(feedId,upstream_or_downstream,reading,timems) {
            dirtyCount++;
            return node.balance.addReading(feedId,upstream_or_downstream,reading,timems);
        }
        this.addMeta = function(key,value) {
            return node.balance.addMeta(key,value);
        }
        this.clearing = function() {
          dirtyCount++;
          return node.balance.clearing();
        }
        this.readingCleared = function() {
          return node.balance.readingCleared();
        }
        this.carryOver = function() {
          return node.balance.carryOver();
        }
        this.readingSettled = function() {
          return node.balance.readingSettled();
        }

        this.lastBalance = function() {
          return node.balance.lastBalance();
        }

        const persist = function() {
          if((dirtyCount > 5) || ((new Date().getTime() - lastPersisted) > 60000)) {
            storage.set(config.id,node.balance.toString());
            lastPersisted = new Date().getTime();
            dirtyCount = 0;
          }
        }
        setInterval(persist,5000);

    }
    RED.nodes.registerType("Balance",EBNode);
}
