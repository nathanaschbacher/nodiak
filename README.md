# Overview

Nodiak is a node.js client to [the Riak distributed database](http://basho.com/products/riak-overview/).  The focus of Nodiak is to provide a client that mimics some of the patterns and functionality of Basho's official clients for other languages while still taking advantage of the benefits of asynchronous patterns that can be easily implemented in node.js.

Nodiak's design is split across two general concepts.  The base client, which handles the base Riak HTTP API operations, and useful higher-level abstractions (Bucket and RObject) that build on the base client functionality to make Riak easier to work with.

> ***NOTE:*** 

>While the base client's methods are available in the event you need them. The \_bucket and \_object namespace won't be detailed in this document because you should use the convience classes and abstratctions whenever possible.

# Features

* HTTP and HTTPS connections.
* Automatic exponential-backoff retries.
* Cluster info operations.
* Bulk/Batch object operations (Get, Save, Delete).
* Sibling notification.
* Parallel async and 'at once' sibling fetching.
* Sibling resolution and auto-resolution support (default: client-side LWW).
* MapReduce phase chaining.
* Ad-hoc Javascript and Erlang MapReduce functions.
* Riak Search and Riak 2i support.
* Evented stream results handling.
* Easy multiple cluster support.

# Installation

    $ npm install nodiak

# API

> ***NOTE:*** significant search and streaming changes occurred in >= 0.0.7

All methods that communicate with Riak take a callback function as their last parameter.  In many cases they're optional if you don't care about handling the results, so you can sort of fire-and-forget requests to Riak. In the case of operations which can provide streaming results, the callback is simply dropped from the primary method call, and the `.stream()` method is appeneded.  [See details below](#-streaming-callback-form).

#####standard callback form

```javascript
bucket.objects.get(array_of_keys, function(err, objs){})
```

The argument signature of the callback for non-streaming results is always `callback(error, result)`.  Where error will always be either `null` when there was no error, or an instance of `Error`, or any array of `Error`s with details of the errors when they occur.  The `result` varies depending on the API call.  See the [detailed API documentation](#api) below for details.

#####streaming callback form

```javascript
bucket.objects.get(array_of_keys).stream(function(event_emitter){})
```

For streaming results the callback sent into the `.stream()` function gets an instance of `EventEmitter` passed to it, and this emitter fires `'data'`, `'error'`, and `'end'` events. 

#Getting Started
 
####require('nodiak').getClient( _[backend], [host], [port], [defaults]_ );
###### // get client instance (defaults to HTTP backend on localhost:8098)

```javascript
var riak = require('nodiak').getClient();
```

w/ custom backend, host, and port:

```javascript
var riak = require('nodiak').getClient('https', '10.0.0.2', 8443);
```

w/ non-default client settings, such as resource locations, maxSockets value, mime decoders/encoders, etc:

```javascript
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

For multiple-clusters just create several instances:

```javascript
var cache = require('nodiak').getClient('https', '10.0.0.2', 8443);
var sessions = require('nodiak').getClient('http', '192.168.2.20', 8098);
var db = require('nodiak').getClient();
```

##Cluster info and status:
####.ping( _callback_ );
###### //  check that you can reach Riak

```javascript
riak.ping(function(err, response) {
	console.log(response);
});
```
> ```
'OK'
> ```

####.stats( _callback_ );
###### //  get current stats from Riak

```javascript
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

####.resources( _callback_ );
###### // ask Riak for its current resource endpoints.

> ***NOTE:*** 

>These are what your Riak install is using, not necessarily what the
nodiak client is using.  If you want to synchronize these values, you'll
have to manage that yourself.  getClient() -> .resources(result) ->
getClient(result), or something similar. 

```javascript
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


# Bucket Operations:
##Bucket instance attributes
* ####.name 
>The name of the bucket in Riak as a `String`.

* ####.props
>An `Object` containing the Riak [bucket properties](http://wiki.basho.com/HTTP-Set-Bucket-Properties.html).  Defaults to `{}`. 

* ####.resolver
>The `Function` used to do sibling resolution on `.object.get()` requests.  Defaults to `Bucket.siblingLastWriteWins` ([see here](#sibling-auto-resolution)).

* ####.getSiblingsSync
>Controls whether or not fetching siblings happens using parallel async requests or as one big _'multipart/mixed'_ to be parsed at once. Defaults to `false`.

* ####.client
>An instance of the underlying backend client that handles communication with Riak.  Is set to the client that created the `Bucket` instance with `client.bucket()`.

##Bucket instance methods
####_client_.bucket( _name_ );
###### // factory method on the client that returns an instance of a Bucket object.

```javascript
var user_bucket = riak.bucket('users');
user_bucket.objects.all(function(err, r_objs) {
    console.log(r_objs);
});
```
>```
[[Object], [Object], [Object]]  // Array of RObjects
>```

w/ a simple chaining pattern:

```javascript
riak.bucket('users').objects.all(function(err, r_objs) {
    console.log(r_objs);
});
```
>```
[[Object], [Object], [Object]]  // Array of RObjects
>```

####Bucket.getProps( _[callback]_ );
###### // update the Bucket instance with its bucket props from Riak

```javascript
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

####Bucket.saveProps( _[merge], [callback]_ );
###### // save updated bucket properties back to Riak.

```javascript
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

####Bucket.object.new( _key, [data], [metadata]_ )
###### // factory method that returns a new instance of an RObject.

```javascript
var my_robj = riak.bucket('users').object.new('some_key', { store: 'this thing'}, { vclock: 'aBcDE10fgH92'});
```

It's important to understand that this new object ***has not*** been read from or written to Riak at this point.  If you know this key already exists in, or you want to refresh its data from, Riak, then you can 'hydrate' it using the RObject's `.fetch()` method.

####Bucket.object.exists( _key, callback_ )
###### // checks if an object exists in Riak

```javascript
riak.bucket('users').object.exists('some_key', function(err, result) {
    console.log(result);
});
```

`result` will be either `true` or `false`.

####Bucket.objects.get( _keys, [options], [resolver_fn, callback]_ )
###### // get one or more objects from Riak as RObjects.

This method can take a single key or an `Array` of keys as input.  Each request happens asynchronously in parallel.  The optional `options` parameter is an object that can contain [Riak query parameters](http://wiki.basho.com/HTTP-Fetch-Object.html).  Additionally, the optional `resolver_fn` parameter allows you to pass in a custom sibling resolution function in the event any siblings are found.

```javascript
var my_keys = ['me', 'myself', 'andI'];

riak.bucket('users').objects.get(my_keys, { r: 1 }, function(errs, objs) {
    console.log(objs);
    console.warn(errs);
});
```

Because I passed in an `Array` of keys the resulting `objs` value will be an `Array` of the resuling `RObject`s.  If the request produced errors then the `err` value will be either a single `Error` or an `Array` of `Error`'s for each that occurred.  `Error.data` will contain the _key_ for the failed request.

> ***NOTE:*** 

>By default nodiak fetches object siblings using parallel async GET requests for each sibling.  This behavior can be overridden by setting the `.getSiblingsSync` property on the `Bucket` instance to `true`.  This will cause nodiak to get all the siblings as a single large *'multipart/mixed'* document and parse the contents.  Further details in the [Sibling Auto-Resolution](#sibling-auto-resolution) section.

####Bucket.objects.get( _keys, [options]_ ).stream( _[resolver_fn], callback_ )
###### // get one or more objects from Riak as a stream of RObjects.

All the same details apply here as in the standard `Bucket.objects.get()` method, except to signal that you want to stream the objects back from Riak you drop the callback **and** the resolver from `.get()`, place them in `.stream()`, and attach your listeners to the parameter passed to the callback.

```javascript
var my_keys = ['me', 'myself', 'andI'];

riak.bucket('users').objects.get(my_keys, { r: 1 }).stream(function(results) {
    results.on('data', function(obj) {
        console.log(obj);
    });
    
    results.on('error', function(err) {
        console.warn(err);
    });
    
    results.on('end', function() {
        // do something else after we're all done getting the objects.
    });
});
```

####Bucket.objects.save( _r_objects, [callback]_)
###### // save one or more RObjects to Riak.

You can pass a single `RObject` or an `Array` of `RObject`s into this method.  Just like with the `.get()` and `.delete()` methods, each save request will happen asynchronously in parallel.

```javascript
var things_to_save = [];

for(var i = 0; i < 5; i++) {
    var robj = riak.bucket('users').objects.new('me'+i, { about_me: "I write software." });
    robj.addMeta('extra_info', 'data goes up in here');
    robj.addToIndex('numbers_i_like', [20, 3, 6]);
    things_to_save.push(robj);
}

riak.bucket('users').objects.save(things_to_save, function(errs, objs) {
    console.log(objs);
    console.warn(errs);
});
```

`objs` will be an `Array` of the successfully saved `RObjects`, and `errs` will be single or multiple `Errors` for failed save requests.  `Error.data` will be the RObject that failed to save to Riak.

####Bucket.objects.save( _r_objects_ ).stream( _callback_ )
###### // save one or more RObjects to Riak and get streamed results.

All the same details apply here as in the standard `Bucket.objects.save()` method, except to signal that you want to stream the result notifications back from Riak you drop the callback from `.save()`, place it in `.stream()`, and attach your listeners to the parameter passed to the callback.

```javascript
var things_to_save = [];

for(var i = 0; i < 5; i++) {
    var robj = riak.bucket('users').objects.new('me'+i, { about_me: "I write software." });
    robj.addMeta('extra_info', 'data goes up in here');
    robj.addToIndex('numbers_i_like', [20, 3, 6]);
    things_to_save.push(robj);
}

riak.bucket('users').objects.save(things_to_save).stream(function(results) {
    results.on('data', function(obj) {
        console.log(obj);
    });
    
    results.on('error', function(err) {
        console.warn(err);
    });
    
    results.on('end', function() {
        // do something else after we're all done getting the objects.
    });
});
```

####Bucket.objects.delete( _r_objects, [callback]_ )
###### // delete one or more RObjects from Riak.

You can pass a single `RObject` or an `Array` of `RObject`s into this method.  Just like with the `.get()` and `.save()` methods, each delete request will happen asynchronously in parallel.

```javascript
riak.bucket('users').objects.delete(array_of_robjs, function(errs, objs) {
    console.log(objs);
    console.warn(errs);
});
```

`objs` will be an `Array` of the successfully deleted `RObjects`, and `errs` will be single or multiple `Errors` for failed delete requests.  `Error.data` will be the RObject that failed to be deleted from Riak.

####Bucket.objects.delete( _r_objects_ ).stream( _callback_ )
###### // delete one or more RObjects to Riak and get streamed results.

All the same details apply here as in the standard `Bucket.objects.delete()` method, except to signal that you want to stream the result notifications back from Riak you drop the callback from `.save()`, place it in `.stream()`, and attach your listeners to the parameter passed to the callback.

```javascript
riak.bucket('users').objects.delete(array_of_robjs).stream(function(results) {
    results.on('data', function(obj) {
        console.log(obj);
    });
    
    results.on('error', function(err) {
        console.warn(err);
    });
    
    results.on('end', function() {
        // do something else after we're all done deleting the objects.
    });
});
```

####Bucket.objects.all( _callback_ )
###### // traverse a bucket to get all the RObjects in it.  DO _NOT_ USE IN PRODUCTION, okay? OK.

This method is the equivalent of the dreaded _list keys_ operation… _except even more deadly!_  This will not only perform a list keys on the bucket, but it will also `.get()` every single key it finds.  Use this only for development/testing purposes.  **If you think you need this in production, you're doing it wrong!**

```javascript
riak.bucket('users').objects.all(function(err, objs) {
    console.warn("I BETTER NOT BE IN PRODUCTION");
    console.warn("NO, SERIOUSLY.");
    
    console.log(objs);
});
```

#RObject Operations
##RObject instance attributes
* ####.bucket
>The `Bucket` instance that created this `RObject`.

* ####.key
>The key for this object in Riak.  Defaults to `null`, which will cause Riak to generate a key when saving the RObject.

* ####.data
>The data stored in Riak for this object.  Defaults to `{}`.

* ####.metadata
>The metadata on the object stored in Riak, ie. vclock, content_type, last_modified, etc.  Defaults to `{}`.  A fully populated `metadata` object might look like this:
>>```javascript
{
    vclock: 'a85hYGBgzGDKBVIcR4M2cgcY8xzJYEpkzGNlcJ708CRfFgA=',
    meta: {
        info: 'you might want to know',
        extra: 'stuff you can store here'
    },
    index: {
        words: {
            bin: ['other', 'that', 'the', 'this']
        },
        mynumbers: {
            int: ['5', '37', '4234']
        }
    },
    link: '</buckets/test>; rel="up"',
    last_modified: 'Thu, 04 Oct 2012 04:53:23 GMT',
    etag: '"BTYdk4S0eisdrIYeA1OkM"',
    content_type: 'application/json',
    status_code: 200
}
>>```

* ####.options
>An `Object` for setting [Riak query parameters](http://wiki.basho.com/HTTP-Fetch-Object.html).  Defaults to `{}`.

* ####.siblings
>An `Array` of sibling `RObjects` for this object in Riak.  Defaults to `undefined`.

##RObjects instance methods
####RObject.save( _[callback]_ )
###### // saves this RObject instance to Riak. Uses RObject's `.options` for the request if they exist.

```javascript
var my_obj = riak.bucket('users').objects.new('my_key', { my_profile: "Is Amazing!" });

my_obj.save(function(err, obj) {
    console.log(obj);
});
```

####RObject.delete( _[callback]_ )
###### // deletes this RObject instance from Riak. Uses RObject's `.options` for the request if they exist.

```javascript
my_obj.delete(function(err, obj) {
    console.log(obj);
});
```

####RObject.fetch( _[resolver_fn], callback_ )
###### // fetch/refresh object data from Riak and update this RObject's data, metadata, siblings.  Uses RObject's `.options` for the request if they exist.

```javascript
var my_obj = riak.bucket('users').objects.new('my_key');

my_obj.fetch(function(err, obj) {
    console.log(obj);
});
```

Notice that this method can also take a custom [`resolver_fn`](#sibling-auto-resolution) in the event that reading updated data from Riak results in finding siblings.  If this isn't set it defaults to the resolver function on the `Bucket` instance that produced this `RObject`.

####RObject.setMeta( _name, value_ )
###### // set an X-Riak-Meta entry on this RObject.

```javascript
riak.bucket('users').object.get('me', function(err, obj) {
    obj.setMeta('extra', 'stuff can go here');  // sets metedata.meta.extra to 'stuff can go here' 
});
```

####RObject.getMeta( _name_ )
###### // get an X-Riak-Meta entry to this RObject.

```javascript
riak.bucket('users').object.get('me', function(err, obj) {
    obj.getMeta('extra');  // will get the value of metedata.meta.extra    
});
```

####RObject.removeMeta( _name_ )
###### // remove an X-Riak-Meta entry from this RObject.

```javascript
riak.bucket('users').object.get('me', function(err, obj) {
    obj.removeMeta('extra');  // will delete metedata.meta.extra 
});
```

####RObject.addToIndex( _name, value_ )
###### // add an X-Riak-Index entry to this RObject.

The `name` parameter sets the base name of the index.  The type, `_int` or `_bin`, of the index will be determined by the data type of `value`.  Anything passed into `value` that is an integer will be set in `metadata.index.name.int`, and anything else will be set in `metadata.index.name.bin`.

```javascript
riak.bucket('users').object.get('me', function(err, obj) {
    obj.addToIndex('things', 'apple');  // will add 'apple' to metadata.index.things.bin    
    obj.addToIndex('counts', [2, 4, 6]);  // will add 2, 4, and 6 to metadata.index.counts.int
});
```

In the second example an `Array` of values was passed into the `value` parameter.  This will add all the values in the array to the named index.  All the values should be of the type in the array.


####RObject.getIndex( _name_ )
###### // get all values as an `Array` in an X-Riak-Index entry on this RObject.

```javascript
riak.bucket('users').object.get('me', function(err, obj) {
    obj.getIndex('things');  // value of metadata.index.things.bin or .int, whichever exists
});
```

####RObject.removeFromIndex( _name, value_ )
###### // remove a specific value from an X-Riak-Index entry on this RObject.

Just like with the `.addToIndex()` method, the actual type of the underlying index will be determined based on the data type of the `value` you pass in.

```javascript
riak.bucket('users').object.get('me', function(err, obj) {
    obj.removeFromIndex('things', 'apple');  // removes 'apple' from metadata.index.things.bin
});
```

####RObject.clearIndex( _name_ )
###### // clears all values out of an X-Riak-Index entry on this RObject.

```javascript
riak.bucket('users').object.get('me', function(err, obj) {
    obj.clearIndex('things');  // deletes metadata.index.things completely
});
```

##Sibling Auto-Resolution

By default nodiak's Bucket class contains a client-side implementation of Last-Write-Wins for managing resolution.  It takes an array of sibling RObjects and returns the resolved sibling.  Implemented as follows:

```javascript
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
```

The returned object then has the original set of siblings attached to it and is sent up to the user through a callback on the original `get` or `fetch` request.  This is true of bulk/batch operations as well.  Each RObject in the batch will be its resolved version with ***all*** its original siblings attached on a `.siblings` property.

When you write your own auto-resolution functions they should conform to this spec, taking an `Array` of `RObjects` as input and returning a single resolved `RObject` as output.

You can provide your own auto-resolution functions either by overriding a Bucket instance's default resolver, like:

```javascript
var my_bucket = riak.bucket('some_bucket');

my_bucket.resolver = function(conflicted_siblings) { 
    // If they don't shut-up you'll turn this car around!
    var resolved = conflicted_siblings.pop();
    
    return resolved;
};
```

and/or on every request for an object, like:


```javascript
var my_resolver = function(conflicted_siblings) { 
    // If they don't shut-up you'll turn this car around!
    var resolved = conflicted_siblings.pop();
    
    return resolved;
};

riak.bucket('some_bucket').object.get(['key1', 'key2'], my_resolver, function(err, r_objs) {
    // Any RObject in the r_objs Array that had siblings will have been
    // resolved using my_resolver, and will have it's originally siblings
    // available through a .siblings property. 
});
```

The RObject `.fetch()` method also accepts a user defined resolver function preceding the callback in its arguments list.  See the `RObject.fetch()` [documentation above](#robjectfetch-auto_resolver_fn-callback-) for details.

> ***NOTE:*** 

> Additionally, the `Bucket` class has a `boolean` property `.getSiblingsSync` that controls the behavior of how siblings will be retrieved from Riak.  The default is `false` which will cause nodiak to make parallel async requests to get all the siblings at once.  If set to `true` then nodiak will attempt to retrieve all the siblings as a single large _'multipart/mixed'_ document.

> The tradeoff is in the overhead in making lots and lots of smaller requests compared to one monolithic request.  The former can impact your network and cluster more negatively as it has to deal with the concurrent requests, but the latter also induces additionally time blocking while lots of data is being read and processed for a single request.


##Riak Search and Riak 2i's

####Bucket.search.solr( _query, callback_ )
###### // perform a Riak Search operation and retrieve the standard Riak Search response object.

The `query` should be an `Object` containing properties that map to the URL query params specified in [Querying via the Solr Interface](http://wiki.basho.com/Riak-Search---Querying.html).  The `wt` parameter defaults to JSON.

```javascript
var query = { 
    q: 'field1:been', 
    'q.op': 'and',
    start: 25
};

riak.bucket('test').search.solr(query, true, function(err, response) {
    console.log(response); 
});
```

>```javascript
{
    responseHeader: {
        QTime: 54,
        params: {
            q: 'field1:been',
            'q.op': 'or',
            filter: '',
            wt: 'json'
        },
        status: 0
    },
    response: {
        maxScore: '0.353553',
        numFound: 100,
        start: 0,
        docs: [
            {
                props: {},
                index: 'test',
                fields: {
                    field1: 'has been set'
                },
                id: '11OAOmQHJmn9fcCfO5gPZatHdyL'
            },
            ...
        ]
    }
}
>```

####Bucket.search.solr( _query_ ).stream( _callback_ )
###### // perform a Riak Search operation and stream back the `docs` elements as `RObject`s

Just as with the non-streaming version of this call, the `query` should be an `Object` containing properties that map to the URL query params specified in [Querying via the Solr Interface](http://wiki.basho.com/Riak-Search---Querying.html).  The `wt` parameter defaults to JSON.

```javascript
var query = { 
    q: 'field1:been', 
    'q.op': 'and',
    start: 25
};

var compiled_results = [];

riak.bucket('test').search.solr(query).stream(function(results) {
    results.on('data', function(obj) {
        compiled_results.push(obj);
    });

    results.on('error', function(err) {
        console.warn(err);
    });
    
    results.on('end', function() {
        // we're all done fetching results.
    });
});
```

This is simply provided as a convenience for when you know specifically that you want to fetch the actual objects in Riak referenced by the search result.


####Bucket.search.twoi( _query, index, callback_ )
###### // a 2i's range query that returns the list of matching keys.

The query format in nodiak for a 2i's search is an `Array` tuple containing the beginning and end of the range you want to search `['a','zzzzzzzzz']`, or just a scalar value when you want to do an exact match `'match_this'`.

You do not need to provide the `_int` or `_bin` suffix to the `index` name.  This is derived for you from the type of data you pass in to your query.  If the type is explicitly an integer `Number` then `_int` will be used, otherwise `_bin` will be automatically assumed. 

```javascript
riak.bucket('test').search.twoi([0,10000], 'my_numbers', function(err, keys) {
    console.log(keys);
});
```

The response will be an `Array` of the matching keys with the duplicates removed.  Riak by default adds a *key* to the matching set for every match, so if you have multiple entries in an index that match your query, then you'll get duplicate entries of that *key*  in the results.  If for some reason you need those duplicates then you can use the underlying backend adapter client directly.

####Bucket.search.twoi( _query, index_ ).stream( _callback_ )
###### // a 2i's range query that streams back the `RObjects` for the matched keys.

var compiled_results = [];

riak.bucket('test').search.twoi([0,10000], 'my_numbers').stream(function(results) {
    results.on('data', function(obj) {
        compiled_results.push(obj);
    });

    results.on('error', function(err) {
        console.warn(err);
    });
    
    results.on('end', function() {
        // we're all done fetching results.
    });
});

##MapReduce

MapReduce queries in nodiak are performed by chaining `map`, `link`, and `reduce` phases together on a set of `inputs` and then finally by running the chain using `execute`.

Each of these phases, including the inputs conforms to the spec set forward by Basho in [their documentation](http://wiki.basho.com/Loading-Data-and-Running-MapReduce-Queries.html).

Also, nodiak allows you supply your own ad-hoc native functions as the `source` parameter on your `map` and `reduce` phase specifications.  If your phase has `'language' : 'javascript'` set, then it will simply convert your function to it's string source representation before attaching it to the `source` parameter.

For ad-hoc Erlang functions to work in Riak you have to add `{allow_strfun, true}` to the `riak_kv` section of your app.config files.  When send in a native Javascript function as the `source` parameter of your phase specification, and `'language' : 'erlang'` is set, then that native function must return from it a string representation of a valid Erlang MapReduce function. 

> ***NOTE:*** 

> Only use ad-hoc queries in development, they're slower and open up potential security risks compared to queries pre-deployed in your cluster.

###client.mapred.inputs( _inputs, [include_data]_ )
####.map( _phase_ ) .link( _phase_ ) .reduce( _phase_ )  .execute( _callback_ )
###### // MapReduce w/ pre-aggregated results.

```javascript
riak.mapred.inputs([['a_bucket','key1'], ['b_bucket','key2']])
    .map({
        language: 'erlang',
        module: 'riak_kv_mapreduce',
        function: 'map_object_value',
        arg: 'filter_notfound'})
    
    .reduce({
        language: 'erlang',
        module: 'riak_kv_mapreduce',
        function: 'reduce_count_inputs'})     
    
    .execute(function(err, results) {
        if(!err) console.log(results);
    }
);
```
####.execute( ).stream( _callback_ )
###### // MapReduce w/ streaming results.

```javascript
var compiled_results = [];

riak.mapred.inputs('test')
    .map({
        language: 'erlang',
        module: 'riak_kv_mapreduce',
        function: 'map_object_value',
        arg: 'filter_notfound'})
    
    .reduce({
        language: 'erlang',
        module: 'riak_kv_mapreduce',
        function: 'reduce_count_inputs'})     
    
    .execute().stream(function(results) {
        results.on('data', function(result) {
            compiled_results.push(result);
        });

        results.on('end', function() {
            console.log(compiled_results);
        });

        results.on('error', function(err) {
            // Handle this however you like.
        });
    }
);
```

>***NOTE:***

>You can also pass an `Array` of `RObject`s into the `inputs` section of a MapReduce query.  Nodiak will automatically run through each object and convert the RObject into the `[bucket, key]` pairing that Riak expects.  Additionally, if you set `include_data` to `true` as the second `inputs` argument, then nodiak will also include the RObject's data, like `[bucket, key, data]`.


# Tests

The test suite can be run by simply:

    $ cd /path/to/nodiak
    $ npm install -d
    $ npm test

The suite expects to find Riak on an HTTP interface on port 8091 and an HTTPS interface on port 8071.  You can edit these values at the top of the `test/test.js` file to suit your environment.

#Todos

1. Add Link parsing and Link-Walking interfaces.

2. Add a protobufs backend implementation.

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
