var Bucket = require('./bucket');

var RObject = function(bucket, key, data, metadata) {
    this.bucket = bucket;
    this.key = key || null;
    this.data = data || {};
    this.metadata = metadata || {};
    this.options = {};
};


RObject.prototype.save = function(_return) {
    var _this = this;
    
    _return = _return ? _return : function(){};

    _this.bucket.client.objects.save(_this.bucket.name, _this.key, _this.data, _this.metadata, _this.options, function(err, obj) {
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
    this.bucket.client.objects.delete(this.bucket.name, this.key, this.options, _return);
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
