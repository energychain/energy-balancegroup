var assert = require('assert');
const BalanceGroup = require("../BalanceGroup.class.js");
const sleep = ms => new Promise(r => setTimeout(r, ms));


describe('Core', function () {
  let idA = Math.random(); // Will become Balance Group ID
  let instanceA = null;  // Will become tesing BalanceGroup
  let feeds = []; // Will hold Test Feeders

  describe('#Instance', async function () {
    it('Create Balance Group', async function () {
        assert.throws(() => { new BalanceGroup() },Error,"id expected");
        instanceA = new BalanceGroup(idA);
        assert.equal(instanceA._id,idA);
    });
    it('Add some random Readings', async function () {
        assert.throws(() => { instanceA.addReading() },Error,"measurement must be number");
        assert.throws(() => { instanceA.addReading(null,5) },Error,"feedId must be valid identifier");

        let sum = 0;

        for(let i=0;i<10;i++) {
          let feedId = "feed_"+Math.random();
          feeds.push(feedId);
          let measurement = (200 * Math.random()) - 100;
          instanceA.addReading(feedId,measurement);
        }
        assert.equal(instanceA.sum(),0); // No Positions
        assert.equal(instanceA.missingPositions().length,10); // All feeders send one reading
        for(let i=0;i<feeds.length;i++) {
          let measurement = (200 * Math.random()) - 100;
          instanceA.addReading(feeds[i],measurement);
        }
        assert.notEqual(instanceA.sum(),0);
        assert.equal(instanceA.missingPositions().length,0);
        assert.equal(instanceA.positions().length,10);
        instanceA.autoReOpen=false;
        let ledgerItem = instanceA.close();
        assert.throws(() => { instanceA.addReading("fail_"+Math.random(),5) },Error,"balance in closed state");
        assert.equal((ledgerItem.opened - ledgerItem.closed) < 0, true);
    });
    it('Test missing Feeds', async function () {
        instanceA.reOpen();
        for(let i=0;i<Math.floor(feeds.length/2);i++) {
          let measurement = (200 * Math.random()) - 100;
          instanceA.addReading(feeds[i],measurement);
        }
        assert.equal(instanceA.getLastConsensusIndex(),0);

        let ledgerItem = instanceA.close();
        assert.equal(instanceA.missingPositions().length == feeds.length - Math.floor(feeds.length/2), true);

        instanceA.reOpen();
        for(let i=0;i<Math.floor(feeds.length/3);i++) {
          let measurement = (200 * Math.random()) - 100;
          instanceA.addReading(feeds[i],measurement);
        }
        assert.equal(instanceA.getLastConsensusIndex(),0);
        ledgerItem = instanceA.close();
        assert.equal(instanceA.missingPositions().length == feeds.length - Math.floor(feeds.length/3), true);

        instanceA.reOpen();
        for(let i=0;i<feeds.length;i++) {
          let measurement = (200 * Math.random()) - 100;
          instanceA.addReading(feeds[i],measurement);
        }
        instanceA.autoReOpen=true;
        ledgerItem = instanceA.close();
        assert.equal(instanceA.getLastConsensusIndex(),3);
        assert.equal(instanceA._ledger.length,4);
        for(let i=0;i<instanceA._ledger.length;i++) {
          assert.equal(instanceA._ledger[i].cleared,false);
          assert.equal(instanceA._ledger[i].settled,true);
        }

        // Test if without any Feed works
        ledgerItem = instanceA.close();
        assert.equal(instanceA._ledger.length,5);
        assert.equal(instanceA.getLastConsensusIndex(),3);
        // Test if autoReOpen works -> No Exception
        for(let i=0;i<feeds.length;i++) {
          let measurement = (200 * Math.random()) - 100;
          instanceA.addReading(feeds[i],measurement);
        }
        ledgerItem = instanceA.close();
        assert.equal(instanceA._ledger.length,6);
        assert.equal(instanceA.getLastConsensusIndex(),5);
        for(let i=0;i<Math.floor(feeds.length/2);i++) {
          let measurement = (200 * Math.random()) - 100;
          instanceA.addReading(feeds[i],measurement);
        }
        ledgerItem = instanceA.close();
        assert.equal(instanceA.getLastConsensusIndex(),5); // Unchanged as we have just partials
        instanceA.interpolateMissing();
    });
  });
  //
  //

});
