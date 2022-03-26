var assert = require('assert');
const BalanceGroup = require("../BalanceGroup.class.js");
const sleep = ms => new Promise(r => setTimeout(r, ms));

describe('Interpolation', function () {
  let idA = Math.random(); // Will become Balance Group ID
  let instanceA = null;  // Will become tesing BalanceGroup
  let feeds = []; // Will hold Test Feeders


  describe('#Instance', async function () {
    it('Create Balance Group', async function () {
        assert.throws(() => { new BalanceGroup() },Error,"id expected");
        instanceA = new BalanceGroup(idA);
        assert.equal(instanceA._id,idA);
    });
    it('Add virtual Meters', async function () {
        for(let i=0;i<5;i++) {
          let feed = {
            feedId:"feed_"+i,
            reading:Math.round(Math.random()*1000)
          };
          feeds.push(feed);
          if(i<3) {
            instanceA.setFeedMeta(feed.feedId,{type:'upstream'});
          } else {
            instanceA.setFeedMeta(feed.feedId,{type:'downstream'});
          }
          instanceA.addReading(feed.feedId,feed.reading);
        }
    });
    it('Add more Readings', async function () {
        for(let i=0;i<feeds.length;i++) {
          let consumption = Math.round(Math.random()*100);
          feeds[i].reading += consumption;
          instanceA.addReading(feeds[i].feedId,feeds[i].reading);
        }
        instanceA.close();
        for(let i=0;i<feeds.length;i++) {
          let consumption = Math.round(Math.random()*100);
          feeds[i].reading += consumption;
          instanceA.addReading(feeds[i].feedId,feeds[i].reading);
        }
        instanceA.close();
        for(let i=0;i<(feeds.length/2);i++) {
          let consumption = Math.round(Math.random()*100);
          feeds[i].reading += consumption;
          instanceA.addReading(feeds[i].feedId,feeds[i].reading);
        }
        instanceA.close();
        for(let i=0;i<(feeds.length/2);i++) {
          let consumption = Math.round(Math.random()*100);
          feeds[i].reading += consumption;
          instanceA.addReading(feeds[i].feedId,feeds[i].reading);
        }
        instanceA.close();
        instanceA.interpolateMissing();
        for(let i=0;i<feeds.length;i++) {
            assert.notEqual(instanceA.positions[feeds[i].feedId],feeds[i].reading);
        }
        assert.equal(instanceA.getLastConsensusIndex(),1);
        for(let i=0;i<feeds.length;i++) {
          let consumption = Math.round(Math.random()*100);
          feeds[i].reading += consumption;
          instanceA.addReading(feeds[i].feedId,feeds[i].reading);
        }
        instanceA.close();
        instanceA.interpolateMissing();
        for(let i=0;i<feeds.length;i++) {
            assert.equal(instanceA._feeds[feeds[i].feedId].reading,feeds[i].reading);
        }
    });
  });
  //
  //

});
