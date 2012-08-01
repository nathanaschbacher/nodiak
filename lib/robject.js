var Bucket = require('./bucket');

var RObject = function(bucket, key, data, metadata, client) {
    this.bucket = bucket;
    this.key = key || null;
    this.data = data || {};
    this.metadata = metadata || {};
    this.options = {};

    this.client = client;
};


RObject.prototype.save = function(/* return_body, _return */) {
    this.options.returnbody = typeof(arguments[0]) == 'boolean' ? arguments[0] : false;
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};
    
    var _this = this;

    this.client.objects.save(this.bucket, this.key, JSON.stringify(this.data), this.metadata, this.options, function(err, data, meta) {
        if(err) _return(err, data, meta);
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

    type = typeof(value) == 'string' ? bin : int;

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
