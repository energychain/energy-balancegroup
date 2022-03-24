const BalanceGroup = class {
    constructor(id) {
      if((typeof id == 'undefined') || (id == null)) { throw new Error("id expected"); }
      this._id = id;
      this._feeds = {};
      this._positions = {};
      this._opened = new Date().getTime()
      this._closed = false;
      this._closing = false;
      this._balanceId = 'balance_'+id+'_'+this._opened;
      this._ledger = [];
      this._successor = "";
      this.autoReOpen = true;
      this.autoInterpolateOnClose = true;
    }

    addReading = function(feedId,meterReading) {
        if(isNaN(meterReading)) throw new Error("measurement must be number");
        if((typeof feedId == 'undefined')||(feedId == null)) throw new Error("feedId must be valid identifier");
        if((this._closed)||(this._closing)) throw new Error("balance in closed state");

        if(typeof this._feeds[feedId] !== 'undefined') {
          this._positions[feedId] = meterReading - this._feeds[feedId].reading;
        }
        this._feeds[feedId] = {
          balanceId:this._balanceId,
          reading:meterReading,
          estimation:false
        }

        //console.log(feedId,meterReading);
    }

    sum = function() {
      let _sum = 0;
      for (const [key, value] of Object.entries(this._positions)) {
        _sum += value;
      }
      return _sum;
    }

    missingPositions = function() {
      let _missing = [];
      for (const [key, value] of Object.entries(this._feeds)) {
        if(typeof this._positions[key] == 'undefined') _missing.push(key);
      }
      return _missing;
    }

    positions = function() {
      let _p = [];
      for (const [key, value] of Object.entries(this._positions)) {
        _p.push({feeder:key,value:value});
      }
      return _p;
    }

    reOpen = function() {
      if(!this._closed) throw new Error("BalanceGroup not in closed state.");

      this._successor = this._balanceId;
      this._positions = {}
      this._positions[this._balanceId] = this.sum();
      this._balanceId = 'balance_'+this._id+'_'+this._opened;
      this._positions = {};
      this._opened = new Date().getTime();
      this._closed = false;
    }

    getLastConsensusIndex = function() {
      let min_consensus = this._ledger.length;

      for (const [key, value] of Object.entries(this._ledger[0].positions)) {
          let last_position = 0;
          for(let i=this._ledger.length-1;((i >= 0)&&(last_position == 0));i--) {
              if(typeof this._ledger[i].positions[key] !== 'undefined') {
                last_position = i;
              }
          }
          if(last_position < min_consensus) min_consensus = last_position
      }
      return min_consensus;
    }

    interpolateMissing = function() {
      let max_consensus = this.getLastConsensusIndex();
      const parent = this;

      function _interpolateLinear() {
          let interpolated = false;
          for (const [key, value] of Object.entries(parent._ledger[0].positions)) {
            for(let i=0 ;i <= max_consensus;i++) {
                if(typeof parent._ledger[i].positions[key] == 'undefined') {
                    let span = max_consensus;
                    for(let j=0;((j <= max_consensus-i) && (span == max_consensus));j++) {
                        if(typeof parent._ledger[i+j].positions[key] !== 'undefined') {
                          span = j;
                        }
                    }
                    if(span > 0) {
                      if(typeof parent._ledger[i-1].positions[key] !== 'undefined') {
                        let start_reading = parent._ledger[i-1].positions[key].reading;
                        let end_reading = parent._ledger[i+span].positions[key].reading;
                        let delta = (end_reading - start_reading)/(span+1);

                        for(let j=0;j<=span;j++) {
                          if(typeof parent._ledger[i+j].positions[key] == 'undefined') {
                            parent._ledger[i+j].positions[key] = {
                              balanceId:parent._balanceId,
                              reading:Math.round(start_reading + ((j+1)*delta)),
                              estimation:true
                            }
                          }
                          interpolated=true;
                        }
                      } else {
                        console.log("Missing in",key,i);
                      }
                    }
                }
            }
          }
          return interpolated;
      }
      _interpolateLinear()
      // while(_interpolateLinear()) {};

    }
    close = function() {
      this._closing = true;
      let ledgerItem = {
        balanceId:this._balanceId,
        positions:{},
        missing:this.missingPositions(),
        opened:this._opened,
        closed:new Date().getTime(),
        sum:this.sum(),
        consensus:{},
        ancestorId:"",
        cleared:false,
        settled:true,
        succesorId:this._successor
      }

      for (const [key, value] of Object.entries(this._feeds)) {
        if(typeof this._positions[key] == 'undefined') {
          ledgerItem.missing.push(key);
        } else {
          ledgerItem.positions[key] = value;
        }
        ledgerItem.consensus[key] = {
            balanceId:value.balanceId,
            reading:value.reading
        }
      }

      this._ledger.push(ledgerItem);
      this._closing = false;
      this._closed = new Date().getTime();
      if(this.autoInterpolateOnClose) {
        this.interpolateMissing();
      }
      if(this.autoReOpen) {
        this.reOpen()
      }
      return ledgerItem;
    }

}


module.exports = BalanceGroup;
