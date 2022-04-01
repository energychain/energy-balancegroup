const EventEmitter = require('events');

const BalanceGroup = class extends EventEmitter {
    constructor(id) {
      super();
      if((typeof id == 'undefined') || (id == null)) { throw new Error("id expected"); }
      this._id = id;
      this._feeds = {};
      this._feedMeta = {};
      this._positions = {};
      this._opened = new Date().getTime()
      this._closed = false;
      this._closing = false;
      this._balanceId = 'balance_'+id+'_'+this._opened;
      this._ledger = [];
      this._successor = "";
      this._maxConsensus = 0;
      this.autoReOpen = true;
      this.autoInterpolateOnClose = true;
    }

    setFeedMeta = function(feedId,meta) {
      this._feedMeta[feedId] = meta;
    }

    addReading = function(feedId,meterReading) {
        if(isNaN(meterReading)) throw new Error("measurement must be number");
        if((typeof feedId == 'undefined')||(feedId == null)) throw new Error("feedId must be valid identifier");
        if((this._closed)||(this._closing)) throw new Error("balance in closed state");
        if(typeof this._feedMeta[feedId] !== 'undefined') {
          if(typeof this._feedMeta[feedId].scaleFactor !== 'undefined') {
            meterReading = meterReading * this._feedMeta[feedId].scaleFactor;
          }
        }
        if(typeof this._feeds[feedId] !== 'undefined') {
          if(typeof this._positions[feedId] == 'undefined') {
            this._positions[feedId] = meterReading - this._feeds[feedId].reading;
          } else {
            this._positions[feedId] += meterReading - this._feeds[feedId].reading;
          }
        }
        this._feeds[feedId] = {
          balanceId:this._balanceId,
          reading:meterReading,
          estimation:false,
          meta:this._feedMeta[feedId]
        }
    }

    reStart = function() {
        let max_consensus = this.getLastConsensusIndex();
        const consensús_ledger = this._ledger[max_consensus];
        this._ledger = [];
        this._maxConsensus=0;
        return consensús_ledger;
    }

    getBalances = function(_upField,_downField,_metaField) {
      if((typeof _upField == 'undefined') || (_upField == null)) _upField = 'upstream';
      if((typeof _downField == 'undefined') || (_downField == null)) _downField = 'downstream';
      if((typeof _metaField == 'undefined') || (_metaField == null)) _metaField = 'type';

      let max_consensus = this.getLastConsensusIndex();
      let _balances = [];
      if(max_consensus >0) {
        this.interpolateMissing();
      }
      let _carryOverUp = null;
      let _carryOverDown = null;

      for(let i=0;i<max_consensus;i++) {
        let _balance = {
          time: {
            start:this._ledger[i].opened,
            end:this._ledger[i].closed
          },
          balanceId:this._ledger[i].balanceId
        };
        let _ignored = [];
        let _upStream = [];
        let _downStream = [];
        let _upSum = 0;
        let _downSum = 0;
        let _balanceSum = 0;
        if(_carryOverUp !== null) {
          _upStream.push({
            feed:'carryover',
            value:_carryOverUp
          });
        }
        if(_carryOverDown !== null) {
          _downStream.push({
            feed:'carryover',
            value:_carryOverDown
          });
        }
        for (const [key, value] of Object.entries(this._ledger[i].positions)) {
          if(typeof this._feedMeta[key] == 'undefined')  {
            _ignored.push({
              feed:key,
              value:value
            });
          } else
          if(this._feedMeta[key][_metaField] == _upField) {
            _upStream.push({
              feed:key,
              value:value
            });
            _upSum += 1 * value;
          } else
          if(this._feedMeta[key][_metaField] == _downField) {
            _downStream.push({
              feed:key,
              value:value
            });
            _downSum += 1 * value;
          } else {
            _ignored.push({
              feed:key,
              value:value
            });
          }
        }
        _balance.table = {}
        if(_upSum > _downSum) {
          _downStream.push(
            {
              feed:'balance',
              value:_upSum - _downSum
            }
          )
          _balanceSum = _upSum;
          _carryOverUp = null;
          _carryOverDown = _upSum - _downSum;
        }
        if(_upSum < _downSum) {
          _upStream.push(
            {
              feed:'balance',
              value:_downSum - _upSum
            }
          )
          _balanceSum = _downSum;
          _carryOverDown = null;
          _carryOverUp = _downSum - _upSum;
        }
        _balance.table[_upField] = _upStream;
        _balance.table[_downField] = _downStream;
        _balance.sum = _balanceSum;
        _balance.ignored = _ignored;
        _balance.carryover = {}
        _balance.carryover[_upField] = _carryOverUp;
        _balance.carryover[_downField] = _carryOverDown;
        _balances.push(_balance);
      }
      return _balances;
    }

    sum = function() {
      let _sum = 0;
      let _sums = {};

      for (const [key, value] of Object.entries(this._positions)) {
        _sum += value;
      }
      return _sum;
    }

    sums = function() {
      let _sum = 0;
      let _sums = {};

      for (const [key, value] of Object.entries(this._positions)) {
        if(typeof this._feedMeta[key] !== 'undefined') {
          if(typeof this._feedMeta[key].type !== 'undefined') {
            if(typeof _sums[this._feedMeta[key].type] == 'undefined') {
              _sums[this._feedMeta[key].type] = 0;
            }
            _sums[this._feedMeta[key].type] += value;
          }
        }
      }
      return _sums;
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
      if((typeof this._ledger == 'undefined')||(typeof this._ledger[0] == 'undefined')) {
        return min_consensus;
      } else {
        for (const [key, value] of Object.entries(this._ledger[0].positions)) {
            let last_position = 0;
            for(let i=this._ledger.length-1;((i >= 0)&&(last_position == 0));i--) {
                if(typeof this._ledger[i].positions[key] !== 'undefined') {
                  last_position = i;
                }
            }
            if(last_position < min_consensus) min_consensus = last_position
        }
        if(this._maxConsensus !== min_consensus) {
          this._maxConsensus = min_consensus;
          this.emit("Consensus",min_consensus);
        }

        return min_consensus;
      }
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
                      if((typeof parent._ledger[i-1].positions[key] !== 'undefined')&&(typeof parent._ledger[i+span] !=='undefined')) {
                        let start_reading = parent._ledger[i-1].positions[key];
                        let end_reading = parent._ledger[i+span].positions[key];
                        let delta = (end_reading - start_reading)/(span+1);

                        for(let j=0;j<=span;j++) {
                          if(typeof parent._ledger[i+j].positions[key] == 'undefined') {
                            parent._ledger[i+j].positions[key] = Math.round(start_reading + ((j+1)*delta));
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
          ledgerItem.positions[key] = this._positions[key];
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


module.exports = BalanceGroup;
