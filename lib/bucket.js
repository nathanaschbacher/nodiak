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
            _return(err, JSON.parse(data).props || {}, meta);
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

Bucket.prototype.keys = function(/* [as_objects], _return */) {
    var as_objects = typeof(arguments[0]) == 'boolean' ? arguments[0] : true;
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    this.client.buckets.keys(this.name, as_objects, _return);
};

Bucket.prototype.objects = {};
Bucket.prototype.objects.get = function(keys, _return) {
    var _this = this.this;

    keys = typeof(keys) == 'array' ? keys : [keys];

    _this.client.get(query, _return);
};

Bucket.prototype.objects.search = function(criteria, _return) {
    var _this = this.this;
};


module.exports = Bucket;