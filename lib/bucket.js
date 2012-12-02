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

var events = require('events'),
    helpers = require('./helpers'),
    RObject = require('./robject'),
    async = require('async');

var Bucket = function Bucket(name, client) {
    this.name = name;
    this.props = {};
    this.resolver = Bucket.siblingLastWriteWins;
    this.getSiblingsSync = false;
    this.client = client;

    this.search = Object.create(Bucket.prototype.search, { // Establish namespace 'search'
        _this: { // used as a placeholder for namespaced functions, referenced using this._this in those functions.
            enumerable: false,
            configurable: true,
            writable: true,
            value: this
        }
    });

    this.objects = this.object = Object.create(Bucket.prototype.objects, { // Establish namespace 'objects' and 'object'
        _this: { // used as a placeholder for namespaced functions, referenced using this._this in those functions.
            enumerable: false,
            configurable: true,
            writable: true,
            value: this
        }
    });
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
Bucket.prototype.search.solr = function(solr_query, _return) {
    var _this = this._this;

    if(_return) {
        _this.client._bucket.solr(_this.name, solr_query, function(err, results) {
            if(err) _return(err, results);
            else _return(err, results.data);
        });
    }
    else {
        return {
            stream: function(_return) {
                _this.client._bucket.solr(_this.name, solr_query, function(err, results) {
                    if(err) {
                        var emitter = new events.EventEmitter();
                        _return(emitter);
                        err.data = results;
                        emitter.emit('error', err);
                        emitter.removeAllListeners();
                    }
                    else {
                        var compiled_keys = [];
                        for(var i = 0, length = results.data.response.docs.length; i < length; i++) {
                            compiled_keys.push(results.data.response.docs[i].id);
                        }
                        _this.objects.get(compiled_keys).stream(_return);
                    }
                });
            }
        };
    }
    return _this;
};

Bucket.prototype.search.twoi = function(twoi_query, index, _return) {
    twoi_query = twoi_query instanceof Array ? twoi_query : [twoi_query];
    
    var _this = this._this;

    index = typeof(twoi_query[0]) === 'number' && twoi_query[0].toString().search(/[^0-9]/) === -1 ? index+'_int' : index+'_bin';

    if(_return) {  // don't return stream
        _this.client._bucket.twoi(_this.name, twoi_query, index, function(err, results) {
            if(err) _return(err, results);
            else {
                _return(err, helpers.removeDuplicates(results));
            }
        });
    }
    else { // return stream
        return {
            stream: function(_return) {
                _this.client._bucket.twoi(_this.name, twoi_query, index, function(err, results) {
                    if(err) {
                        var emitter = new events.EventEmitter();
                        _return(emitter);
                        err.data = results;
                        emitter.emit('error', err);
                        emitter.removeAllListeners();
                    }
                    else {
                        results = helpers.removeDuplicates(results);
                        _this.objects.get(results).stream(_return);
                    }
                });
            }
        };
    }
    return _this;
};

Bucket.prototype.objects = {};
Bucket.prototype.objects.new = function(key, data, metadata) {
    var _this = this._this;
    return new RObject(_this, key, data, metadata);
};

Bucket.prototype.objects.all = function(_return) {
    var _this = this._this;

    var compiled_keys = [];
    _this.client._bucket.keys(_this.name).stream(function(keys) {
        keys.on('data', function(data) {
            compiled_keys = compiled_keys.concat(data);
        });

        keys.on('end', function() {
            var compiled_robjs = [];
            _this.objects.get(compiled_keys).stream(function(response) {
                response.on('data', function(r_obj) {
                    compiled_robjs.push(r_obj);
                });

                response.on('error', function(error) {
                    //_return(error, compiled_robjs);
                });

                response.on('end', function() {
                    _return(null, compiled_robjs);
                });
            });
        });

        keys.on('error', function(err) {
            _return(err, undefined);
        });
    });
    return _this;
};

Bucket.prototype.objects.exists = function(/* key, [options], _return */) {
    var key = arguments[0] || "";
    var options = typeof(arguments[1]) == 'object' ? arguments[1] : {};
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var _this = this._this;

    _this.client._object.exists(_this.name, key, options, _return);
    return _this;
};

Bucket.prototype.objects.get = function(/* keys, [options], [resolver_fn], [_return] */) {
    var keys = arguments[0];
    var options = typeof(arguments[1]) == 'object' ? arguments[1] : {};
    var resolver_fn;
    var _return;
    if(typeof(arguments[arguments.length - 1]) == 'function' || typeof(arguments[arguments.length - 2]) == 'function') {
        resolver_fn = typeof(arguments[arguments.length - 2]) == 'function' ? arguments[arguments.length - 2] : this._this.resolver;
        _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};
    }
    
    var _this = this._this;

    if(_return === undefined) { // return object with stream function.
        return {
            stream: function(/* resolver_fn, _return */) {
                resolver_fn = arguments.length == 1 ? _this.resolver : arguments[0];
                _return = arguments[arguments.length - 1];
                return _this.objects._getStreaming(keys, options, resolver_fn, _return);
            }
        };
    }
    else { // non-streamed response.
        var compiled_results = [];
        var compiled_errors = [];
        
        if(keys) {
            keys = (keys).constructor && (keys).constructor.name == 'Array' ? keys : [keys];
            async.forEach(keys,
                function(key, _intermediate) {
                    _this.client._object.get(_this.name, key, null, options, function(err, obj) {
                        if(err) {
                            err.data = key;
                            compiled_errors.push(err);
                            _intermediate(null);
                        }
                        else if(obj.siblings && obj.siblings.length > 0 ) {
                            _this.object.getSiblings(obj.key, obj.siblings, function(err, siblings) {
                                if(err) {
                                    err.data = key;
                                    compiled_errors.push(err);
                                }
                                else {
                                    var resolved = resolver_fn(siblings);
                                    resolved.siblings = siblings;
                                    compiled_results.push(resolved);
                                }
                                _intermediate(null);
                            });
                        }
                        else {
                            compiled_results.push(new RObject(_this, key, obj.data, obj.metadata));
                            _intermediate(null);
                        }
                    });
                },
                function(err) {
                    compiled_results = compiled_results.length === 1 ? compiled_results[0] : compiled_results;

                    if(compiled_errors.length === 0) {
                        compiled_errors = null;
                    }
                    else if(compiled_errors.length === 1) {
                        compiled_errors = compiled_errors[0];
                    }
                    _return(compiled_errors, compiled_results);
                }
            );
        }
        else {
            _return(new TypeError("At least one key required."), null);
        }
    }
    return _this;
};

Bucket.prototype.objects._getStreaming = function(keys, options, resolver_fn, _return) {
    var _this = this._this;

    var emitter = new events.EventEmitter();
    _return(emitter);
    if(keys) {
        keys = (keys).constructor && (keys).constructor.name == 'Array' ? keys : [keys];
        async.forEach(keys,
            function(key, _intermediate) {
                _this.client._object.get(_this.name, key, null, options, function(err, obj) {
                    if(err) {
                        err.data = key;
                        emitter.emit('error', err);
                        _intermediate(null);
                    }
                    else if(obj.siblings && obj.siblings.length > 0 ) {
                        _this.object.getSiblings(obj.key, obj.siblings, function(err, siblings) {
                            if(err) {
                                err.data = key;
                                emitter.emit('error', err);
                            }
                            else {
                                var resolved = resolver_fn(siblings);
                                resolved.siblings = siblings;
                                emitter.emit('data', resolved);
                            }
                            _intermediate(null);
                        });
                    }
                    else {
                        emitter.emit('data', new RObject(_this, key, obj.data, obj.metadata));
                        _intermediate(null);
                    }
                });
            },
            function(err) {
                emitter.emit('end');
                emitter.removeAllListeners();
            }
        );
    }
    else {
        emitter.emit('error', new TypeError("At least one key required."));
    }

    return _this;
};

Bucket.prototype.objects.save = function(/* r_objects, _return */) {
    var r_objects = arguments[0];
    var options = typeof(arguments[1]) == 'object' ? arguments[1] : {};
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : undefined;

    var _this = this._this;

    if(_return === undefined) { // return object with stream function.
        return {
            stream: function(_return) {
                return _this.objects._saveStreaming(r_objects, _return);
            }
        };
    }
    else { // non-streamed response.
        var compiled_results = [];
        var compiled_errors = [];
        if(r_objects) {
            r_objects = (r_objects).constructor && (r_objects).constructor.name == 'Array' ? r_objects : [r_objects];
            async.forEach(r_objects,
                function(r_object, _intermediate) {
                    _this.client._object.save(_this.name, r_object.key, r_object.data, r_object.metadata, r_object.options, function(err, obj) {
                        if(err) {
                            err.data = r_object;
                            compiled_errors.push(err);
                        }
                        else {
                            if(!err && obj.metadata.status_code != 204) {
                                r_object.data = obj.data;
                                r_object.metadata = obj.metadata;
                                r_object.key = obj.key;
                            }
                            compiled_results.push(r_object);
                        }
                        _intermediate(null);
                    });
                },
                function(err) {
                    compiled_results = compiled_results.length === 1 ? compiled_results[0] : compiled_results;
                    
                    if(compiled_errors.length === 0) {
                        compiled_errors = null;
                    }
                    else if(compiled_errors.length === 1) {
                        compiled_errors = compiled_errors[0];
                    }
                    _return(compiled_errors, compiled_results);
                }
            );
        }
        else {
            _return(new TypeError("At least one RObject required."), null);
        }
    }
    return _this;
};

Bucket.prototype.objects._saveStreaming = function(r_objects, _return) {
    var _this = this._this;

    var emitter = new events.EventEmitter();
    _return(emitter);
    if(r_objects) {
        async.forEach(r_objects,
            function(r_object, _intermediate) {
                r_object.save(function(err, obj) {
                    if(err) {
                        err.data = obj;
                        emitter.emit('error', err);
                    }
                    else {
                        emitter.emit('data', obj);
                    }
                    _intermediate(null);
                });
            },
            function(err) {
                emitter.emit('end');
                emitter.removeAllListeners();
            }
        );
    }
    else {
        emitter.emit('error', new TypeError("At least one RObject required."), null);
    }
    return _this;
};

Bucket.prototype.objects.delete = function(/* r_objects, _return */) {
    var r_objects = arguments[0];
    var options = typeof(arguments[1]) == 'object' ? arguments[1] : {};
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var _this = this._this;

    if(_return === undefined) { // return object with stream function.
        return {
            stream: function(_return) {
                return _this.objects._saveStreaming(r_objects, _return);
            }
        };
    }
    else { // non-streamed response.
        var compiled_results = [];
        var compiled_errors = [];

        if(r_objects) {
            r_objects = r_objects instanceof Array ? r_objects : [r_objects];
            async.forEach(r_objects,
                function(r_object, _intermediate) {
                    r_object.delete(function(err, obj) {
                        if(err) {
                            err.data = obj;
                            compiled_errors.push(err);
                        }
                        else {
                            compiled_results.push(obj);
                        }
                        _intermediate(null);
                    });
                },
                function(err) {
                    compiled_results = compiled_results.length === 1 ? compiled_results[0] : compiled_results;
                        
                    if(compiled_errors.length === 0) {
                        compiled_errors = null;
                    }
                    else if(compiled_errors.length === 1) {
                        compiled_errors = compiled_errors[0];
                    }
                    _return(compiled_errors, compiled_results);
                }
            );
        }
        else {
            _return(new TypeError("At least one RObject required."), null);
        }
    }
    return _this;
};

Bucket.prototype.objects._deleteStreaming = function(r_objects, _return) {
    var _this = this._this;

    var emitter = new events.EventEmitter();
    _return(emitter);
    if(r_objects) {
        r_objects = r_objects instanceof Array ? r_objects : [r_objects];
        async.forEach(r_objects,
            function(r_object, _intermediate) {
                r_object.delete(function(err, obj) {
                    if(err) {
                        err.data = obj;
                        emitter.emit('error', err.data = obj);
                    }
                    else {
                        emitter.emit('data', obj);
                    }
                    _intermediate(null);
                });
            },
            function(err) {
                emitter.emit('end');
                emitter.removeAllListeners();
            }
        );
    }
    else {
        emitter.emit('error', new TypeError("At least one RObject required."), null);
    }
    return _this;
};

Bucket.prototype.objects.getSiblings = function(key, vtags, _return) {
    var _this = this._this;

    if(_this.getSiblingsSync) {
        _this.client._object.get(_this.name, key, { accept: 'multipart/mixed' }, function(err, response) {
            if(err) _return(err, response);
            else {
                async.map(response.siblings,
                    function(sibling, _intermediate) {
                        _intermediate(err, new RObject(_this, key, sibling.data, sibling.metadata));
                    },
                    function(err, siblings) {
                        _return(err, siblings);
                    }
                );
            }
        });
    }
    else {
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
    }
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