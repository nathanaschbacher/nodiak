// (The MIT License)

// Copyright (c) 2012 Coradine Aviation Systems
// Copyright (c) 2012 Nathan Aschbacher

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// 'Software'), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var RObject = function RObject(bucket, key, data, metadata) {
    this.bucket = bucket;
    this.key = key || null;
    this.data = data || {};
    this.metadata = metadata || {};
    this.options = {};
    this.siblings = undefined;
};

RObject.prototype.save = function(_return) {
    _return = _return !== undefined ? _return : function(){};
    var _this = this;
    
    _this.bucket.client._object.save(_this.bucket.name, _this.key, _this.data, _this.metadata, _this.options, function(err, obj) {
        if(!err && obj.metadata.status_code != 204) {
            _this.data = obj.data;
            _this.metadata = obj.metadata;
            _this.key = obj.key;
        }
        _return(err, _this);
    });
    return _this;
};

RObject.prototype.delete = function(_return) {
    _return = _return !== undefined ? _return : function(){};
    var _this = this;

    _this.bucket.client._object.delete(_this.bucket.name, _this.key, _this.options, _return);
    return _this;
};

RObject.prototype.fetch = function(/* [resolver_fn], _return */) {
    var resolver_fn = typeof(arguments[0]) == 'function' && typeof(arguments[1]) == 'function' ? arguments[0] : this.bucket.resolver;
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var _this = this;

    _this.bucket.object.get(_this.key, _this.options, resolver_fn, function(err, obj) {
        if(err) { _return(err, _this); }
        else {
            _this.key = obj.key;
            _this.data = obj.data;
            _this.metadata = obj.metadata;
            _this.siblings = obj.siblings;

            _return(err, _this);
        }
    });
    return this;
};

RObject.prototype.setMeta = function(name, value) {
    if(!this.metadata.meta) {
        this.metadata.meta = {};
    }
    this.metadata.meta[name] = value;
    return this;
};

RObject.prototype.getMeta = function(name) {
    if(this.metadata.meta && this.metadata.meta[name] !== undefined) {
        return this.metadata.meta[name];
    }
    else {
        return null;
    }
};

RObject.prototype.removeMeta = function(name) {
    if(this.metadata.meta) {
        delete this.metadata.meta[name];
    }
    return this;
};

RObject.prototype.addToIndex = function(name, value) {
    var type = null;

    if(value instanceof Array && value.length > 0) {
        type = typeof(value[0]) == 'number' && value[0].toString().search(/[^0-9]/) === -1 ? 'int' : 'bin';
    }
    else {
        type = typeof(value) == 'number' && value.toString().search(/[^0-9]/) === -1 ? 'int' : 'bin';
    }

    if(type !== null) {
        if(!this.metadata.index) {
            this.metadata.index = {};
        }

        if(!this.metadata.index[name]) {
            this.metadata.index[name] = {};
        }

        if(!this.metadata.index[name][type] || !(this.metadata.index[name][type] instanceof Array)) {
            this.metadata.index[name][type] = [];
        }

        this.metadata.index[name][type] = this.metadata.index[name][type].concat(value);
    }
    return this;
};

RObject.prototype.removeFromIndex = function(name, value) {
    if(this.metadata.index && this.metadata.index[name]) {
        if(typeof(value) == 'number' && value.toString().search(/[^0-9]/) === -1) {
            this.metadata.index[name].int.splice(this.metadata.index[name].int.indexOf(value),1);
        }
        else {
            this.metadata.index[name].bin.splice(this.metadata.index[name].bin.indexOf(value),1);
        }
    }
    return this;
};

RObject.prototype.getIndex = function(name) {
    if(this.metadata.index[name] && this.metadata.index[name].bin !== undefined) {
        return this.metadata.index[name].bin;
    }
    else if(this.metadata.index[name] && this.metadata.index[name].int !== undefined) {
        return this.metadata.index[name].int;
    }
    else {
        return null;
    }
};

RObject.prototype.clearIndex = function(name) {
    if(this.metadata.index) {
        delete this.metadata.index[name];
    }
    return this;
};


module.exports = RObject;
