var helpers = require('./helpers'),
    RObject = require('./robject'),
    async = require('async');

var Bucket = function(name, props, client) {
    this.name = name;
    this.props = props || {};

    this.client = client;

    this.objects = Object.create(Bucket.prototype.objects); // Establish namespace 'objects'
    this.objects.this = this; // used as a placeholder for namespaced functions, referenced using this.this in those functions.
};

Bucket.prototype.fetchProps = function(_return) {
    this.client.buckets.props(this.name, function(err, data, meta) {
        if(err) _return(err, data, meta);
        else {
            _return(err, data.props || {}, meta);
        }
    });
};

Bucket.prototype.save = function(/* [merge], _return */) {
    var _this = this;

    var merge = typeof(arguments[0]) == 'boolean' ? arguments[0] : true;
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    this.getProps(function(err, props, meta) {
        if(err) _return(err, props, meta);
        else {
            if(merge) {
                _this.props = helpers.merge(props, _this.props);
            }
            _this.client.buckets.save(_this.name, _this.props, _return);
        }
    });
};

Bucket.prototype.keys = function(_return) {
    this.client.buckets.keys(this.name, _return);
};

Bucket.prototype.objects = {};
Bucket.prototype.objects.new = function(key, data, metadata) {
    var _this = this.this;

    return new RObject(_this.name, key, data, metadata, _this.client);
};

Bucket.prototype.objects.get = function(/* keys, [options], _return */) {
    var keys = arguments[0];
    var options = typeof(arguments[1]) == 'object' ? arguments[1] : {};
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};


    var _this = this.this;

    keys = keys.constructor.name == 'Array' ? keys : [keys];

    async.map(keys,
        function(key, _intermediate) {
            _this.client.objects.get(_this.name, key, options, function(err, data, meta) {
                _intermediate(err, new RObject(_this.name, key, data, meta, _this.client));
            });
        },
        function(err, results) {
            _return(err, results.length == 1 ? results[0] : results);
        }
    );
};

Bucket.prototype.objects.exists = function(key, _return) {
    var _this = this.this;

    _this.client.objects.exists(_this.name, key, _return);
};

Bucket.prototype.objects.search = function(criteria, _return) {
    var _this = this.this;
};


module.exports = Bucket;