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
    this.client.buckets.props(this.name, function(err, obj) {
        if(err) _return(err, obj);
        else {
            _return(err, obj.data.props || {});
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
            _this.client.objects.get(_this.name, key, options, function(err, obj) {
                if(obj.metadata.status_code == 300) {
                    //_this.objects.resolve(key, );
                }
                else {
                    _intermediate(err, new RObject(_this.name, key, obj.data, obj.metadata, _this.client));
                }
            });
        },
        function(err, results) {
            _return(err, results.length == 1 ? results[0] : results);
        }
    );
};

Bucket.prototype.objects.save = function(/* r_objects, _return */) {
    var r_objects = arguments[0];
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var _this = this.this;

    r_objects = r_objects.constructor.name == 'Array' ? r_objects : [r_objects];

    async.map(r_objects,
        function(r_object, _intermediate) {
            r_object.save(function(err, obj) {
                _intermediate(err, new RObject(_this.name, key, obj.data, obj.metadata, _this.client));
            });
        },
        function(err, results) {
            _return(err, results.length == 1 ? results[0] : results);
        }
    );
};

Bucket.prototype.objects.resolve = function(key, vtags, resolver_fn, _return) {
    var _this = this.this;

    
};

Bucket.prototype.objects.exists = function(key, _return) {
    var _this = this.this;

    _this.client.objects.exists(_this.name, key, _return);
};

Bucket.prototype.objects.search = function(/* range_or_solr, [index], _return */) {
    var _this = this.this;

    var range_or_solr = arguments[0];
    var index = typeof(arguments[1]) === 'string' ? index : null;
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    if(index && range_or_solr[0]) {
        index = typeof(range_or_solr[0]) === 'string' ? index+'_bin' : index+'_int';
    }

    _this.client.objects.search(_this.name, index, range_or_solr, function(err, obj) {
        if(err) _return(err, obj);
        else {
            if(data.response && data.response.docs) { // if Riak Search result
                data.keys = [];
                for(var i = 0, length = data.response.docs.length; i < length; i++) {
                    keys.push(data.response.docs[i]);
                }
            }
            _this.objects.get(data.keys || [], _return);
        }
    });
};


module.exports = Bucket;