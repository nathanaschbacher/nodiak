var Bucket = require('./bucket');

var RObject = function(bucket_name, key, data, metadata, client) {
    this.bucket = bucket_name;
    this.key = key || null;
    this.data = data || {};
    this.metadata = metadata || {};
    this.options = {};

    this.client = client;
};


RObject.prototype.save = function(_return) {
    var _this = this;

    _this.client.objects.save(_this.bucket, _this.key, _this.data, _this.metadata, _this.options, function(err, obj) {
        if(err) _return(err, new RObject(_this.bucket, _this.key, obj.data, obj.metadata, _this.client));
        else {
            if(meta.status_code != 204) {
                _this.data = data;
                _this.metadata = meta;
            }
            if(_this.metadata.location) {
                _this.key = _this.metadata.location.slice(_this.metadata.location.lastIndexOf("/")+1);
            }
            _return(err, _this);
        }
    });
};

RObject.prototype.delete = function(_return) {
    this.client.objects.delete(this.bucket, this.key, this.props, _return);
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
