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

var helpers = require('./helpers'),
    RObject = require('./robject'),
    async = require('async');

var Bucket = function Bucket(name, client) {
    this.name = name;
    this.props = {};
    this.resolver = Bucket.siblingLastWriteWins;
    this.client = client;

    this.search  = Object.create(Bucket.prototype.search); // Establish namespace 'object(s)'
    this.search.this = this; // used as a placeholder for namespaced functions, referenced using this.this in those functions.

    this.objects = this.object = Object.create(Bucket.prototype.objects); // Establish namespace 'object(s)'
    this.objects.this = this.object.this = this; // used as a placeholder for namespaced functions, referenced using this.this in those functions.
};

Bucket.prototype.getProps = function(_return) {
    _return = _return !== undefined ? _return : function(){};
    var _this = this;

    _this.client._bucket.props(_this.name, function(err, props) {
        if(err) _return(err, props);
        else {
            _this.props = props;
            _return(err, _this.props);
        }
    });

    return this;
};

Bucket.prototype.saveProps = function(/* [merge], [_return] */) {
    var merge = typeof(arguments[0]) == 'boolean' ? arguments[0] : true;
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var _this = this;

    if(merge === true) {
        _this.client._bucket.props(_this.name, function(err, props) {
            if(err) _return(err, props);
            else {
                _this.props = helpers.merge(props, _this.props);
                _this.client._bucket.save(_this.name, _this.props, function(err, response) {
                    if(err) _return(err, response);
                    else {
                        _return(err, _this);
                    }
                });
            }
        });
    }
    else {
        _this.client._bucket.save(_this.name, _this.props, function(err, response) {
            if(err) _return(err, response);
            else {
                _return(err, _this);
            }
        });
    }

    return this;
};

Bucket.prototype.search = {};
Bucket.prototype.search.solr = function(/* solr_query, [results_as_robjs], _return */) {
    var solr_query = arguments[0];
    var results_as_robjs = arguments[1] === true ? true : false;
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var _this = this.this;

    _this.client._bucket.solr(_this.name, solr_query, function(err, results) {
        if(err) _return(err, results);
        else {
            if(results_as_robjs) {
                if(results.data.response && results.data.response.docs) { // if Riak Search result
                    results.data.keys = [];
                    for(var i = 0, length = results.data.response.docs.length; i < length; i++) {
                        results.data.keys.push(results.data.response.docs[i].id);
                    }
                }
                _this.objects.get(results.data.keys || [], function(err, r_objs) {
                    results.data.response.docs = r_objs;
                    _return(err, results.data.response);
                });
            }
            else {
                _return(err, results.data.response);
            }
        }
    });

    return _this;
};

Bucket.prototype.search.twoi = function(/* twoi_query, index, [results_as_robjs], _return */) {
    var twoi_query = arguments[0] instanceof Array ? arguments[0] : [arguments[0]];
    var index = arguments[1];
    var results_as_robjs = arguments[2] === true ? true : false;
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var _this = this.this;

    index = typeof(twoi_query[0]) === 'string' ? index+'_bin' : index+'_int';

    _this.client._bucket.twoi(_this.name, twoi_query, index, function(err, results) {
        if(err) _return(err, results);
        else {
            results = helpers.removeDuplicates(results);

            if(results_as_robjs) {
                _this.objects.get(results || [], function(in_err, r_objs) {
                    if(in_err) _return(in_err, r_objs);
                    else {
                        results = { numFound: r_objs.length, results: r_objs };
                        _return(err, results);
                    }
                });
            }
            else {
                results = { numFound: results.length, results: results };
                _return(err, results);
            }
        }
    });

    return _this;
};

Bucket.prototype.objects = {};
Bucket.prototype.objects.new = function(key, data, metadata) {
    var _this = this.this;

    return new RObject(_this, key, data, metadata);
};

Bucket.prototype.objects.all = function(_return) {
    var _this = this.this;

    var compiled_keys = [];
    _this.client._bucket.keys(_this.name, function(err, keys) {
        keys.on('data', function(data) {
            compiled_keys = compiled_keys.concat(data);
        });

        keys.on('end', function(metadata) {
            _this.objects.get(compiled_keys, function(err, r_objs) {
                _return(err, r_objs);
            });
        });

        keys.on('error', function(err) {
            _return(err, undefined);
        });
    });

    return _this;
};

Bucket.prototype.objects.get = function(/* keys, [options], [resolver_fn], _return */) {
    var keys = arguments[0];
    var options = typeof(arguments[1]) == 'object' ? arguments[1] : {};
    var resolver_fn = typeof(arguments[arguments.length - 1]) == 'function' && typeof(arguments[arguments.length - 2]) == 'function' ? arguments[arguments.length - 2] : this.this.resolver;
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var _this = this.this;

    keys = keys.constructor.name == 'Array' ? keys : [keys];

    var compiled_results = [];
    async.forEach(keys,
        function(key, _intermediate) {
            _this.client._object.get(_this.name, key, null, options, function(err, obj) {                    
                if(err && err.status_code == 404) {
                    _intermediate(null);
                }
                else if(err && err.status_code != 404) {
                    _intermediate(err);
                }
                else if(obj.siblings && obj.siblings.length > 0 ) {
                    _this.object.getSiblings(obj.key, obj.siblings, function(err, siblings) {
                        var resolved = resolver_fn(siblings);
                        resolved.siblings = siblings;
                        //resolved.save(); // no callback because we don't care about the result of this save.  The read-resolved object should be returned in any case.
                        compiled_results.push(resolved);
                        _intermediate(err);
                    });
                }
                else {
                    compiled_results.push(new RObject(_this, key, obj.data, obj.metadata));
                    _intermediate(err);
                }
            });
        },
        function(err) {
            _return((err === undefined ? null : err), (compiled_results.length == 1 ? compiled_results[0] : compiled_results));
        }
    );

    return _this;
};

Bucket.prototype.objects.save = function(r_objects, _return) {
    _return = _return !== undefined ? _return : function(){};

    var _this = this.this;

    r_objects = r_objects.constructor.name == 'Array' ? r_objects : [r_objects];

    async.map(r_objects,
        function(r_object, _intermediate) {
            _this.client._object.save(_this.name, r_object.key, r_object.data, r_object.metadata, r_object.options, function(err, obj) {
                if(err) _intermediate(err, r_object);
                else {
                    if(obj.metadata.status_code != 204) {
                        r_object.data = obj.data;
                        r_object.metadata = obj.metadata;
                        r_object.key = obj.key;
                    }
                    _intermediate(err, r_object);
                }
            });
        },
        function(err, results) {
            _return(err, results.length == 1 ? results[0] : results);
        }
    );

    return _this;
};

Bucket.prototype.objects.exists = function(/* key, [options], _return */) {
    var key = arguments[0] || "";
    var options = typeof(arguments[1]) == 'object' ? arguments[1] : {};
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var _this = this.this;

    _this.client._object.exists(_this.name, key, _return);

    return _this;
};

Bucket.prototype.objects.delete = function(r_objects, _return) {
    _return = _return !== undefined ? _return : function(){};

    var _this = this.this;

    r_objects = r_objects instanceof Array ? r_objects : [r_objects];

    async.map(r_objects,
        function(r_object, _intermediate) {
            r_object.delete(function(err, obj) {
                _intermediate(err, r_object);
            });
        },
        function(err, results) {
            _return(err, results.length == 1 ? results[0] : results);
        }
    );

    return _this;
};

Bucket.prototype.objects.getSiblings = function(key, vtags, _return) {
    var _this = this.this;

    async.map(vtags,
        function(vtag, _intermediate) {
            _this.objects.get(key, { vtag: vtag }, function(err, obj) {
                _intermediate(err, obj);
            });
        },
        function(err, siblings) {
            _return(err, siblings);
        }
    );

    return _this;
};

Bucket.siblingLastWriteWins = function(siblings) {
    function siblingLastModifiedSort(a, b) {
        if(!a.metadata.last_modified || new Date(a.metadata.last_modified) < new Date(b.metadata.last_modified)) {
            return 1;
        }
        else {
            return -1;
        }
    }
    siblings.sort(siblingLastModifiedSort);

    return siblings[0];
};

module.exports = Bucket;