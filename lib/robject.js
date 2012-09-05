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

var Bucket = require('./bucket');

var RObject = function RObject(bucket, key, data, metadata) {
    this.bucket = bucket;
    this.key = key || null;
    this.data = data || {};
    this.metadata = metadata || {};
    this.options = {};
};


RObject.prototype.save = function(_return) {
    var _this = this;
    
    _return = _return !== undefined ? _return : function(){};

    _this.bucket.client._object.save(_this.bucket.name, _this.key, _this.data, _this.metadata, _this.options, function(err, obj) {
        if(err) _return(err, new RObject(_this.bucket, obj.key, obj.data, obj.metadata));
        else {
            if(obj.metadata.status_code != 204) {
                _this.data = obj.data;
                _this.metadata = obj.metadata;
                _this.key = obj.key;
            }
            _return(err, _this);
        }
    });
};

RObject.prototype.delete = function(_return) {
    this.bucket.client._object.delete(this.bucket.name, this.key, this.options, _return);
};

RObject.prototype.addMeta = function(name, value) {
    if(!this.metadata.meta) {
        this.metadata.meta = {};
    }
    this.metadata.meta[name] = value;
};

RObject.prototype.removeMeta = function(name) {
    if(this.metadata.meta) {
        delete this.metadata.meta[name];
    }
};

RObject.prototype.addToIndex = function(name, value) {
    if(!this.metadata.index) {
        this.metadata.index = {};
    }

    if(!this.metadata.index[name]) {
        this.metadata.index[name] = {};
    }

    type = typeof(value) == 'string' ? 'bin' : 'int';

    if(!this.metadata.index[name][type] || this.metadata.index[name][type].constructor.name != 'Array') {
        this.metadata.index[name][type] = [];
    }
    this.metadata.index[name][type].push(value);
};

RObject.prototype.removeFromIndex = function(name, value) {
    if(this.metadata.index[name]) {
        if(typeof(value) == 'string') {
            this.metadata.index[name].bin.splice(this.metadata.index[name].bin.indexOf(value),1);
        }
        else {
            this.metadata.index[name].int.splice(this.metadata.index[name].int.indexOf(value),1);
        }
    }
};

RObject.prototype.clearIndex = function(name) {
    if(this.metadata.index) {
        delete this.metadata.index[name];
    }
};


module.exports = RObject;
