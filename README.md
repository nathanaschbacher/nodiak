# Overview

Nodiak is a node.js client to [the Riak distributed database](http://basho.com/products/riak-overview/).  The focus of Nodiak is to provide a client that mimics some of the patterns and functionality of Basho's official clients for other languages while still taking advantage of the benefits of asynchronous patterns that can be easily implemented in node.js.

Nodiak's design is split across two general concepts.  The base client, which handles the base Riak HTTP API operations, and useful higher-level abstractions (Bucket and RObject) that build on the base client functionality to make Riak easier to work with.

> ***NOTE:*** While the base client's methods are available in the event you need them. The _bucket and _object namespace won't be detailed in this document because you should use the convience classes and abstratctions whenever possible. 

# Features

* HTTP and HTTPS connections.
* Cluster info operations.
* Bulk/Batch object operations (Get, Save, Delete).
* Sibling notification.
* Sibling resolution and auto-resolution support (default: client-side LWW).
* MapReduce phase chaining.
* Ad-hoc Javascript and Erlang MapReduce functions.
* Riak Search and Riak 2i support.
* Evented stream results handling.
* Easy multiple cluster support.

# Installation

    $ npm install nodiak

# API
All methods that communicate with Riak take a callback function as their last parameter.  In many cases they're optional if you don't care about handling the results, doing sort of fire-and-forget requests to Riak.

The argument signature of the callback is always `callback(error, result)`.  Where error will always be either `null` when there was no error, or an instance of `Error` with details of the error if one occurs.

The `result` varies depending on the API call.  See the documentation below for details.

##Getting Client Instance
 
###**require('nodiak').getClient**( _[backend], [host], [port], [defaults]_ );

```javascript
// defaults to HTTP backend on localhost:8098

var riak = require('nodiak').getClient();
```
or

```javascript
// uses HTTPS backend on 10.0.0.2:8443

var riak = require('nodiak').getClient('https', '10.0.0.2', 8443);
```
or

```javascript
// With non-default client settings, such as resource locations, 
// maxSockets value, mime decoders/encoders, etc.

var my_defaults = {
	connection: { maxSockets: 50 },
	resources: {
        riak_kv_wm_mapred: "/mapreduce",
        riak_kv_wm_stats: "/statistics",
        riak_solr_indexer_wm: "/search"
	}
}

// the 'defaults' object should always be the last.
var riak = require('nodiak').getClient('https', my_defaults); 
```
For multiple-clusters just create several instances

```javascript
// All the relevant settings and helpers are attached to the instances
// so you don't have to worry about clobbering them across clients.

var cache = require('nodiak').getClient('https', '10.0.0.2', 8443);
var sessions = require('nodiak').getClient('http', '192.168.2.20', 8098);
var db = require('nodiak').getClient();
```
##Cluster info and status:
###.ping( _callback_ );

```javascript
// Check that you can reach Riak

riak.ping(function(err, response) {
	console.log(response);
});
```
> ```
'OK'
> ```

###.stats( _callback_ );

```javascript
// Get current stats from Riak

riak.stats(function(err, response) {
	console.log(response); // prints the stats provided by the 'riak_kv_wm_stats' resource.
});
```
> ```
{ vnode_gets: 0,
  ring_num_partitions: 64,
  storage_backend: 'riak_kv_eleveldb_backend',
  ... }
> ```

###.resources( _callback_ );
```javascript
// Ask Riak for its current resource endpoints.
// NOTE: These are what your Riak install is using, not necessarily what the
//       nodiak client is using.  If you want to synchronize these values, you'll
//       have to manage that yourself.  getClient() -> .resources(result) ->
//       getClient(result), or something similar. 

riak.resources(function(err, response) {
	console.log(response);
});
```
> ```
{ riak_kv_wm_buckets: '/riak',
  riak_kv_wm_index: '/buckets',
  riak_kv_wm_keylist: '/buckets',
  riak_kv_wm_link_walker: '/riak',
  riak_kv_wm_mapred: '/mapred',
  ... }
> ```


## Bucket Operations:
###client.bucket( _name_ );

```javascript
// Returns and instance of a Bucket object.

var user_bucket = riak.bucket('users');
user_bucket.objects.all(function(err, r_objs) {
    console.log(r_objs);
});
```
>```
[[Object], [Object], [Object]]  // Array of RObjects
>```

The Bucket object also allows for simple chaining patterns.

```javascript
riak.bucket('users').objects.all(function(err, r_objs) {
    console.log(r_objs);
});
```
>```
[[Object], [Object], [Object]]  // Array of RObjects
>```

###Bucket.getProps( _callback_ );

```javascript
// Update the Bucket instance with its bucket props from Riak
var user_bucket = riak.bucket('users');

user_bucket.getProps(function(err, props) {
	console.log(users.props);
});
```
>```
{ name: 'users',
  allow_mult: false,
  basic_quorum: false,
  big_vclock: 50,
  ... }
>```

###Bucket.saveProps( _[merge], callback_ );

```javascript
// Save updated bucket properties back to Riak.
var users = riak.bucket('users');

users.props.n_val = 2;
users.props.allow_mult = true;
users.props.last_write_wins = false;

users.saveProps(true, function(err, props) {
	console.log(users.props);
});
```
>```
{ name: 'users',
  allow_mult: true,
  last_write_wins: false,
  n_val: 2,
  ... }
>```

The optional `merge` argument is a boolean indicating wether to first get the bucket's properties from Riak and merge your updates with them, or to simply write your updates to Riak right away. This defaults to `true` and is helpful in preventing you from obliterating things like pre and post-commit hooks defined on the bucket.

###Bucket.object.new( _key, [data], [metadata]_ )
###Bucket.object.exists( _key, callback_ )
###Bucket.objects.get( _keys, [options], [resolver_fn], callback_ )
###Bucket.objects.save(_ r_objects, callback_)
###Bucket.objects.delete( _r_objects, callback_ )
###Bucket.prototype.objects.all( _callback_ )

##RObject Operations
###RObject.save( _[callback]_ )
###RObject.delete( _[callback]_ )
###RObject.addMeta( name, value )
###RObject.removeMeta( name )
###RObject.addToIndex( name, value )
###RObject.removeFromIndex( name, value )
###RObject.clearIndex( name )

##Riak Search and Riak 2i's
###Bucket.search( _query, [index], callback_ );
```
// Search Bucket using Riak Search.

```
>```

>```

```
// Search Bucket using Riak 2i's.

```
>```

>```

##MapReduce
###client.mapred.inputs( _inputs_ )
###Mapred.map( _phase_ )
###Mapred.link( _phase_ )
###Mapred.reduce( _phase_ )
###Mapred.execute( _[options], callback_ )
```
// MapReduce w/ aggregated results.

```
>```

>```

```
// MapReduce w/ streaming results.

```
>```

>```



# Tests

The test suite can be run by simply:

    $ cd /path/to/nodiak
    $ npm test

The suite expects to find Riak on an HTTP interface on port 8091 and an HTTPS interface on port 8071.  You can edit these values at the top of the `test/test.js` file to suit your environment.

#Todos

1. Complete this README (getting closer).

2. ~~Improve concurrency control to allow use of keep-alive connections.~~

3. ~~Improve handling of chunked responses.~~

4. ~~Improve streaming of data to Riak on queries.~~

5. ~~Add Map Reduce phase management.~~

6. Add Link parsing and Link-Walking interfaces.

7. Add a protobufs backend implementation.

# License

(The MIT License)

Copyright (c) 2012 Coradine Aviation Systems

Copyright (c) 2012 Nathan Aschbacher

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
