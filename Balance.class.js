const EventEmitter = require('events');

const Balance = class extends EventEmitter {
    constructor(id) {
      super();
      if((typeof id == 'undefined') || (id == null)) { throw new Error("id mandatory"); }
      this._id = id;
      this._feeds = {
        upstream:{},
        downstream:{},
        meta:{}
      };
      this._cleared = {
        upstream: 0,
        downstream: 0
      }
      this._lastBalancing = {};
      this._lastClearing = new Date().getTime();
    }

    addMeta = function(key,value) {
        this._feeds.meta[key] = {
          value:value,
          timems:new Date().getTime()
        };
    }

    lastBalance = function() {
      return this._lastBalancing;
    }

    addReading = function(feedId,upstream_or_downstream,reading,timems) {
      if((typeof upstream_or_downstream == 'undefined') || (upstream_or_downstream == null)) upstream_or_downstream = 'meta';

      if((typeof timems == 'undefined') || (timems == null)) timems = new Date().getTime();

      if(typeof this._feeds[upstream_or_downstream][feedId] == 'undefined') {
        this._feeds[upstream_or_downstream][feedId] = {
          reading: {
            value:reading,
            timems:timems
          },
          settlement: {
            value:0,
            timems:timems
          },
          clearing: {
            value:0,
            timems:timems
          }
        }
      }
      if(reading < this._feeds[upstream_or_downstream][feedId].reading.value) {
        this._feeds[upstream_or_downstream][feedId].reading.value = reading;
        this._feeds[upstream_or_downstream][feedId].reading.timems = timems;
        throw new Error("unexpected reading value");
      }
      if(timems < this._feeds[upstream_or_downstream][feedId].reading.time) {
        throw new Error("unexpected timems value");
      }

      // Since last Reading
      const deltaReadingLast = {
        value:reading - this._feeds[upstream_or_downstream][feedId].reading.value,
        timems:timems - this._feeds[upstream_or_downstream][feedId].reading.timems
      }
      if(deltaReadingLast.timems !== 0) {
        deltaReadingLast.power = Math.round(deltaReadingLast.value / (deltaReadingLast.timems/3600000));
      }
      // Do settlement
      this._feeds[upstream_or_downstream][feedId].settlement.value = deltaReadingLast.value;
    //  this._feeds[upstream_or_downstream][feedId].reading.value = reading;
    //  this._feeds[upstream_or_downstream][feedId].reading.timems = timems;

      return deltaReadingLast
    }

    clearing = function() {
      const parent = this;
      const _newConsensus = {
        upstream:{},
        downstream:{}
      }
      const _timems = new Date().getTime();
      const _balancing = {
        upstream:{},
        downstream:{},
        timeframe:{
          from:parent._lastClearing,
          to:_timems
        }
      };

      const _settlement = {upstream:0,downstream:0};

      const clearDirection = function(dir) {
          for (const [key, value] of Object.entries(parent._feeds[dir])) {
              const settlement = {
                value:value.settlement.value,
                timems:_timems
              };
              _balancing[dir][key] = settlement;
              _settlement[dir] += settlement.value;
              _newConsensus[dir][key] = {
                reading: {
                  value:value.reading.value + value.settlement.value,
                  timems:_timems
                },
                settlement: {
                  value:0,
                  timems:_timems
                },
                clearing: {
                  value:value.clearing.value + value.settlement.value,
                  timems:_timems
                },
                balancing: settlement
              }
          }
      }
      clearDirection('upstream');
      this._feeds.upstream = _newConsensus.upstream;
      this._cleared["upstream"] += _settlement["upstream"];

      clearDirection('downstream');
      this._feeds.downstream = _newConsensus.downstream;
      this._cleared["downstream"] += _settlement["downstream"];

      _balancing.meta = {};
      for (const [key, value] of Object.entries(parent._feeds.meta)) {
          _balancing.meta[key] = value;
      }
      this._previsousClearing = this._lastClearing;
      this._lastClearing = _timems;

      _balancing.reading = this.readingCleared();
      parent._lastBalancing = _balancing;
      return _balancing;
    }

    readingCleared = function() {
        return {
          upstream:this._cleared.upstream,
          downstream:this._cleared.downstream,
          timems:this._lastClearing
        }
    }
    carryOver = function() {
      let reading = this.readingCleared();
      try {
      let upstream = 0;
      let downstream = 0;
      if(typeof this._feeds.upstream.carryover !== 'undefined') {
        upstream = this._feeds.upstream.carryover.value;
      }
      if(typeof this._feeds.downstream.carryover !== 'undefined') {
        downstream = this._feeds.downstream.carryover.value;
      }
      if(reading.upstream > reading.downstream) {
        this.addReading("carryover","upstream",(reading.upstream-reading.downstream)+upstream);
      } else {
        this.addReading("carryover","downstream",(reading.downstream-reading.upstream)+downstream);
      }
    } catch(e) {}
    }
    readingSettled = function() {
        const parent = this;
        const _cleared = this.readingCleared();
        const settleDirection = function(dir) {
            for (const [key, value] of Object.entries(parent._feeds[dir])) {
                _cleared[dir] += value.settlement.value
            }
        }
        settleDirection('upstream');
        settleDirection('downstream');
        _cleared.timems = new Date().getTime();

        return _cleared;
    }
    fromString = function(string) {
        let obj = JSON.parse(string);
        for (const [key, value] of Object.entries(obj)) {
          this[key] = value;
        }
    }
    toJSON = function() {
      let obj = {}
      for (const [key, value] of Object.entries(this)) {
        if(typeof value !== 'function') {
          obj[key] = value;
        }
      }
      return obj;
    }
    toString = function() {
      return JSON.stringify(this.toJSON());
    }

}


module.exports = Balance;
