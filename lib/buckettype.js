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
    Bucket = require('./bucket'),
    async = require('async');

var BucketType = function BucketType(name, client) {
    this.name = name;
    this.client = client;

    this.buckets = this.bucket = Object.create(BucketType.prototype.buckets, { // Establish namespace 'buckets' and 'bucket'
        _this: { // used as a placeholder for namespaced functions, referenced using this._this in those functions.
            enumerable: false,
            configurable: true,
            writable: true,
            value: this
        }
    });
};

BucketType.prototype.buckets = {};
BucketType.prototype.buckets.new = function(name) {
    var _this = this._this;
    return new Bucket(name, _this.client).ofType(_this);
};

BucketType.prototype.buckets.list = function(_return) {
    var _this = this._this;

    _this.client._bucketType.list(_this.bucketType, _return);
};


// Bucket.prototype.objects.all = function(_return) {
//     var _this = this._this;

//     var compiled_keys = [];
//     _this.client._bucket.keys(_this.bucketType, _this.name).stream()
//     .on('data', function(data) {
//         compiled_keys = compiled_keys.concat(data);
//     })
//     .on('end', function() {
//         var compiled_robjs = [];
//         _this.objects.get(compiled_keys).stream()
//         .on('data', function(r_obj) {
//             compiled_robjs.push(r_obj);
//         })
//         .on('error', function(error) {
//             //_return(error, compiled_robjs);
//         })
//         .on('end', function() {
//             _return(null, compiled_robjs);
//         });
//     })
//     .on('error', function(err) {
//         _return(err, undefined);
//     });
//     return _this;
// };

// Bucket.prototype.objects.exists = function(/* key, [options], _return */) {
//     var key = arguments[0] || "";
//     var options = typeof(arguments[1]) == 'object' ? arguments[1] : {};
//     var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

//     var _this = this._this;

//     _this.client._object.exists(_this.bucketType, _this.name, key, options, _return);
//     return _this;
// };

// Bucket.prototype.buckets.get = function(/* bucket_name, [_return] */) {
//     var bucket_name = arguments[0];
//     var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

//     var _this = this._this;

//     if(_return === undefined) { // return bucket with stream function.
//         return {
//             stream: function() {
//                 return _this.buckets._getStreaming(bucket_name);
//             }
//         };
//     }
//     else { // non-streamed response.
//         var compiled_results = [];
//         var compiled_errors = [];
        
//         if(keys) {
//             var not_array_input = false;
//             if(!(keys instanceof Array)) {
//                 not_array_input = true;
//                 keys = [keys];
//             }
//             async.each(keys,
//                 function(key, _intermediate) {
//                     _this.client._object.get(_this.bucketType, _this.name, key, null, options, function(err, obj) {
//                         if(err) {
//                             err.data = key;
//                             compiled_errors.push(err);
//                             _intermediate(null);
//                         }
//                         else if(obj.siblings && obj.siblings.length > 0 ) {
//                             _this.object.getSiblings(obj.key, obj.siblings, function(err, siblings) {
//                                 if(err) {
//                                     err.data = key;
//                                     compiled_errors.push(err);
//                                 }
//                                 else {
//                                     var resolved = resolver_fn(siblings);
//                                     resolved.siblings = siblings;
//                                     compiled_results.push(resolved);
//                                 }
//                                 _intermediate(null);
//                             });
//                         }
//                         else {
//                             compiled_results.push(new RObject(_this, key, obj.data, obj.metadata));
//                             _intermediate(null);
//                         }
//                     });
//                 },
//                 function(err) {
//                     Bucket.prepareResult(compiled_results, compiled_errors, not_array_input, _return);
//                 }
//             );
//         }
//         else {
//             _return(new TypeError("At least one key required."), null);
//         }
//     }
//     return _this;
// };

// Bucket.prototype.objects._getStreaming = function(keys, options, resolver_fn) {
//     var _this = this._this;

//     var emitter = new events.EventEmitter();
//     keys = keys instanceof Array ? keys : [keys];
    
//     if(keys.length) {
//         async.each(keys,
//             function(key, _intermediate) {
//                 _this.client._object.get(_this.bucketType, _this.name, key, null, options, function(err, obj) {
//                     if(err) {
//                         err.data = key;
//                         emitter.emit('error', err);
//                         _intermediate(null);
//                     }
//                     else if(obj.siblings && obj.siblings.length > 0 ) {
//                         _this.object.getSiblings(obj.key, obj.siblings, function(err, siblings) {
//                             if(err) {
//                                 err.data = key;
//                                 emitter.emit('error', err);
//                             }
//                             else {
//                                 var resolved = resolver_fn(siblings);
//                                 resolved.siblings = siblings;
//                                 emitter.emit('data', resolved);
//                             }
//                             _intermediate(null);
//                         });
//                     }
//                     else {
//                         emitter.emit('data', new RObject(_this, key, obj.data, obj.metadata));
//                         _intermediate(null);
//                     }
//                 });
//             },
//             function(err) {
//                 emitter.emit('end');
//                 emitter.removeAllListeners();
//             }
//         );
//     }
//     else {
//         process.nextTick(function() {
//             emitter.emit('error', new TypeError("Empty object get request."));
//             emitter.emit('end');
//             emitter.removeAllListeners();
//         });
//     }
//     return emitter;
// };

// Bucket.prototype.objects.save = function(/* r_objects, _return */) {
//     var r_objects = arguments[0];
//     var options = typeof(arguments[1]) == 'object' ? arguments[1] : {};
//     var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : undefined;

//     var _this = this._this;

//     if(_return === undefined) { // return object with stream function.
//         return {
//             stream: function() {
//                 return _this.objects._saveStreaming(r_objects);
//             }
//         };
//     }
//     else { // non-streamed response.
//         var compiled_results = [];
//         var compiled_errors = [];
//         if(r_objects) {
//             var not_array_input = false;
//             if(!(r_objects instanceof Array)) {
//                 not_array_input = true;
//                 r_objects = [r_objects];
//             }
//             async.each(r_objects,
//                 function(r_object, _intermediate) {
//                     _this.client._object.save(_this.bucketType, _this.name, r_object.key, r_object.data, r_object.metadata, r_object.options, function(err, obj) {
//                         if(err) {
//                             err.data = r_object;
//                             compiled_errors.push(err);
//                         }
//                         else {
//                             if(!err && obj.metadata.status_code != 204) {
//                                 r_object.data = obj.data;
//                                 r_object.metadata = obj.metadata;
//                                 r_object.key = obj.key;
//                             }
//                             compiled_results.push(r_object);
//                         }
//                         _intermediate(null);
//                     });
//                 },
//                 function(err) {
//                     Bucket.prepareResult(compiled_results, compiled_errors, not_array_input, _return);
//                 }
//             );
//         }
//         else {
//             _return(new TypeError("At least one RObject required."), null);
//         }
//     }
//     return _this;
// };

// Bucket.prototype.objects._saveStreaming = function(r_objects) {
//     var _this = this._this;

//     var emitter = new events.EventEmitter();
//     r_objects = r_objects instanceof Array ? r_objects : [r_objects];
    
//     if(r_objects.length) {
//         async.each(r_objects,
//             function(r_object, _intermediate) {
//                 r_object.save(function(err, obj) {
//                     if(err) {
//                         err.data = obj;
//                         emitter.emit('error', err);
//                     }
//                     else {
//                         emitter.emit('data', obj);
//                     }
//                     _intermediate(null);
//                 });
//             },
//             function(err) {
//                 emitter.emit('end');
//                 emitter.removeAllListeners();
//             }
//         );
//     }
//     else {
//         process.nextTick(function() {
//             emitter.emit('error', new TypeError("At least one RObject required."), null);
//             emitter.emit('end');
//             emitter.removeAllListeners();
//         });
//     }
//     return emitter;
// };

// Bucket.prototype.objects.delete = function(/* r_objects, _return */) {
//     var r_objects = arguments[0];
//     var options = typeof(arguments[1]) == 'object' ? arguments[1] : {};
//     var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

//     var _this = this._this;

//     if(_return === undefined) { // return object with stream function.
//         return {
//             stream: function() {
//                 return _this.objects._deleteStreaming(r_objects);
//             }
//         };
//     }
//     else { // non-streamed response.
//         var compiled_results = [];
//         var compiled_errors = [];

//         if(r_objects) {
//             var not_array_input = false;
//             if(!(r_objects instanceof Array)) {
//                 not_array_input = true;
//                 r_objects = [r_objects];
//             }
//             async.each(r_objects,
//                 function(r_object, _intermediate) {
//                     r_object.delete(function(err, obj) {
//                         if(err) {
//                             err.data = obj;
//                             compiled_errors.push(err);
//                         }
//                         else {
//                             compiled_results.push(obj);
//                         }
//                         _intermediate(null);
//                     });
//                 },
//                 function(err) {
//                     Bucket.prepareResult(compiled_results, compiled_errors, not_array_input, _return);
//                 }
//             );
//         }
//         else {
//             _return(new TypeError("At least one RObject required."), null);
//         }
//     }
//     return _this;
// };

// Bucket.prototype.objects._deleteStreaming = function(r_objects) {
//     var _this = this._this;

//     var emitter = new events.EventEmitter();
//     r_objects = r_objects instanceof Array ? r_objects : [r_objects];

//     if(r_objects.length) {    
//         async.each(r_objects,
//             function(r_object, _intermediate) {
//                 r_object.delete(function(err, obj) {
//                     if(err) {
//                         err.data = obj;
//                         emitter.emit('error', err.data = obj);
//                     }
//                     else {
//                         emitter.emit('data', obj);
//                     }
//                     _intermediate(null);
//                 });
//             },
//             function(err) {
//                 emitter.emit('end');
//                 emitter.removeAllListeners();
//             }
//         );
//     }
//     else {
//         process.nextTick(function() {
//             emitter.emit('error', new TypeError("At least one RObject required."), null);
//             emitter.emit('end');
//             emitter.removeAllListeners();
//         });
//     }
//     return emitter;
// };

// Bucket.prepareResult = function prepareResult(results, errors, not_array_input, _return) {
//     if(results.length === 0) {
//         results = null;
//     }
//     else if(not_array_input) {
//         results = results[0];
//     }

//     if(errors.length === 0) {
//         errors = null;
//     }
//     else if(not_array_input) {
//         errors = errors[0];
//     }
//     _return(errors, results);
// };


module.exports = BucketType;