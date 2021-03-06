const EventEmitter = require('events');

const BalanceGroup = class extends EventEmitter {
    constructor(id) {
      super();
      if((typeof id == 'undefined') || (id == null)) { throw new Error("id expected"); }
      this._id = id;
      this._feeds = {};
      this._feedMeta = {};
      this._labels = {};
      this._positions = {};
      this._opened = new Date().getTime()
      this._closed = false;
      this._closing = false;
      this._balanceId = 'eb://'+id+'@'+this._opened;
      this._ledger = [];
      this._successor = "";
      this._maxConsensus = 0;
      this._lastBalance = 0;
      this.autoReOpen = true;
      this.autoInterpolateOnClose = true;
    }

    setFeedMeta = function(feedId,meta) {
      this._feedMeta[feedId] = meta;
      if(typeof meta.label !== 'undefined') {
        this._labels[feedId] = meta.label;
      }
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
      let _recalc = false;
      if((typeof _upField == 'undefined') || (_upField == null)) { _upField = 'upstream'; } else { _recalc = true;}
      if((typeof _downField == 'undefined') || (_downField == null)) { _downField = 'downstream'; } else { _recalc = true; }
      if((typeof _metaField == 'undefined') || (_metaField == null)) { _metaField = 'type'; } else { _recalc = true; }
      let _startIndex = this._lastBalance
      if(_recalc) {
        _startIndex = 0;
      }

      let max_consensus = this.getLastConsensusIndex();
      let _balances = [];
      if(max_consensus >0) {
        this.interpolateMissing();
      }
      let _carryOverUp = null;
      let _carryOverDown = null;
      let _readingUp = 0;
      let _readingDown = 0;
      let _readingSum = 0;
      for(let i=_startIndex;i<max_consensus;i++) {
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
        _balance.consensus = {};
        for (const [key, value] of Object.entries(this._ledger[i].consensus)) {
          _balance.consensus[key] = value.reading;
        }
        if(_carryOverUp !== null) {
          _upSum += _carryOverUp;
          _upStream.push({
            feed:this._ledger[i].succesorId,
            value:_carryOverUp
          });
        }
        if(_carryOverDown !== null) {
          _downSum += _carryOverDown;
          _downStream.push({
            feed:this._ledger[i].succesorId,
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

        _balance.table = {};
        if(_upSum > _downSum) {
          let _balanceSaldo = _upSum - _downSum;
          _downStream.push(
            {
              feed:_balance.balanceId,
              value:_balanceSaldo
            }
          )
          _balanceSum = _upSum;
          _carryOverUp = null;
          _carryOverDown = _upSum - _downSum;
          _readingUp += _balanceSaldo;
        } else {
            let _balanceSaldo = _downSum - _upSum;
          _upStream.push(
            {
              feed:_balance.balanceId,
              value:_balanceSaldo
            }
          )
          _balanceSum = _downSum;
          _carryOverDown = null;
          _carryOverUp = _downSum - _upSum;
          _readingDown += _balanceSaldo;
        }
        _balance.table[_upField] = _upStream;
        _balance.table[_downField] = _downStream;
        _balance.list = {};
        _balance.relatives = {};

        for(let i=0;i<_balance.table[_upField].length;i++) {
          _balance.list[_balance.table[_upField][i].feed] = _balance.table[_upField][i].value;
          _balance.relatives[_balance.table[_upField][i].feed] = {};
          // Build relative 1:n TODO:BUGGY!
          for(let j=0;j<_balance.table[_downField].length;j++) {
            if(_balance.table[_downField][j].feed !== _balance.balanceId) {
              _balance.relatives[_balance.table[_upField][i].feed][_balance.table[_downField][j].feed] = Math.round( (_balance.table[_downField][j].value/_downSum) * _balance.table[_upField][i].value );
            }
          }
        }
        for(let i=0;i<_balance.table[_downField].length;i++) {
          _balance.list[_balance.table[_downField][i].feed] = _balance.table[_downField][i].value;
          _balance.relatives[_balance.table[_downField][i].feed] = {};
          // Build relative 1:n
          for(let j=0;j<_balance.table[_upField].length;j++) {
            if(_balance.table[_upField][j].feed !== _balance.balanceId) {
              _balance.relatives[_balance.table[_downField][i].feed][_balance.table[_upField][j].feed] = Math.round( (_balance.table[_upField][j].value/_upSum) * _balance.table[_downField][i].value );
            }
          }
        }
        _balance.sum = _balanceSum;
        _balance.ignored = _ignored;
        _balance.carryover = {}
        _balance.carryover[_upField] = _carryOverUp;
        _balance.carryover[_downField] = _carryOverDown;
        _balance.reading = {};
        _readingSum += _balanceSum;
        _balance.reading.balance = _readingSum;
        _balance.reading[_upField] = _readingUp;
        _balance.reading[_downField] = _readingDown;
        _balance.feedClearing = function(_feed,_clearValue) {
            let _res = {}
            for (const [key, value] of Object.entries(this.relatives)) {
              if(key == _feed) {
                if(this.list[_feed] !== 0) {
                  for (const [spareKey, spareValue] of Object.entries(value)) {
                    _res[spareKey] = (spareValue / this.list[_feed]) * _clearValue;
                  }
                }
              }
            }
            return _res;
        }
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

    getLabel = function(_feedId) {
      if(typeof this._labels[_feedId] !== 'undefined') {
        return this._labels[_feedId];
      } else {
        return _feedId;
      }
    }
    reOpen = function() {
      if(!this._closed) throw new Error("BalanceGroup not in closed state.");

      this._successor = this._balanceId;
      this._positions = {}
      this._positions[this._balanceId] = this.sum();
      this._balanceId = 'eb://'+this._id+'/'+this._opened;
      this._positions = {};
      this._opened = new Date().getTime();
      this._closed = false;
      this._labels['eb://'+this._id+'/'+this._opened] = this.getLabel(this._id);
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
