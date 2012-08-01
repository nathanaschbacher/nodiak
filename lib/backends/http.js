var http = require('http'),
    async = require('async'),
    helpers = require('../helpers'),
    Bucket = require('../bucket');

var HTTPBackend = function(host, port, resources) {
    this.host = host;
    this.port = port;
    this.resources = helpers.merge(HTTPBackend.defaults.resources, resources || {});

    this.buckets = Object.create(HTTPBackend.prototype.buckets); // Establish namespace 'buckets'
    this.buckets.this = this; // used as a placeholder for namespaced functions, referenced using this.this in those functions.

    this.objects = Object.create(HTTPBackend.prototype.objects); // Establish namespace 'objects'
    this.objects.this = this; // used as a placeholder for namespaced functions, referenced using this.this in those functions.
};

HTTPBackend.prototype.stats = function(_return) {
    var query = { resource: this.resources.riak_kv_wm_stats };
    this.get(query, _return);
};


HTTPBackend.prototype.ping = function(_return) {
    var query = { resource: this.resources.riak_kv_wm_ping };
    this.get(query, _return);
};


HTTPBackend.prototype.resources = function(_return) {
    var query = { resource: '' };
    this.get(query, _return);
};

HTTPBackend.prototype.buckets = {};
HTTPBackend.prototype.buckets.list = function(_return) {
    var _this = this.this;

    var query = {
        resource: _this.resources.riak_kv_wm_index,
        options: { buckets: true },
        headers: { "Accept": "application/json" }
    };
    
    _this.get(query, function(err, data, meta) {
        data = JSON.parse(data);
        async.map(data.buckets,
            function(bucket, _intermediate) {
                var temp = _this.buckets.get(bucket);
                temp.fetchProps(function(err, data, meta) {
                    if(err) _intermediate(err, data);
                    else {
                        temp.props = data;
                        _intermediate(err, temp);
                    }
                });
            },
            function(err, results) {
                _return(err, results, meta);
            }
        );
    });
};

HTTPBackend.prototype.buckets.get = function(bucket_name, props) {
    var _this = this.this;

    return new Bucket(bucket_name, props, _this);
};

HTTPBackend.prototype.buckets.props = function(bucket_name, _return) {
    var _this = this.this;

    var query = {
        resource: _this.resources.riak_kv_wm_index+"/"+bucket_name+"/props",
        headers: { "Accept": "application/json" }
    };
    _this.get(query, _return);
};

HTTPBackend.prototype.buckets.save = function(bucket_name, props, _return) {
    var _this = this.this;

    var query = {
        resource: _this.resources.riak_kv_wm_index+"/"+bucket_name+"/props",
        body: JSON.stringify({props: props})
    };
    _this.put(query, _return);
};

HTTPBackend.prototype.buckets.keys = function(bucket_name, _return) {
    var _this = this.this;

    var query = {
        resource: _this.resources.riak_kv_wm_index + "/" +bucket_name+ "/keys/",
        options: { keys: true },
        headers: { "Accept": "application/json" }
    };
    _this.get(query, _return);
};


HTTPBackend.prototype.objects = {};
HTTPBackend.prototype.objects.get = function(/* bucket_name, key, [metadata, [options]], _return */) {
    var _this = this.this;

    var bucket_name = arguments[0];
    var key = arguments[1];
    var metadata = arguments[2] || {};
    var options = arguments[3] || {};
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var query = {
        resource: _this.resources.riak_kv_wm_index + "/" +bucket_name+ "/keys/" +key ,
        headers: HTTPBackend.metadataToHeaders(metadata),
        options: options
    };

    _this.get(query, _return);
};

HTTPBackend.prototype.objects.save = function(/* bucket_name, key, data, metadata, [options] _return */) {
    var _this = this.this;

    var bucket_name = arguments[0];
    var key = arguments[1] || "";
    var data = arguments[2];
    var metadata = arguments[3] || {};
    var options = typeof(arguments[4]) == 'object' ? arguments[4] : {};
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var query = {
        resource: _this.resources.riak_kv_wm_index + "/" +bucket_name+ "/keys/" +key,
        headers: HTTPBackend.metadataToHeaders(metadata),
        body: data,
        options: options
    };

    if(key === "") {
        _this.post(query, _return);
    }
    else {
        _this.put(query, _return);
    }
};

HTTPBackend.prototype.objects.exists = function(/* bucket_name, key, [options] _return */) {
    var _this = this.this;

    var bucket_name = arguments[0];
    var key = arguments[1] || "";
    var options = typeof(arguments[2]) == 'object' ? arguments[2] : {};
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var query = {
        resource: _this.resources.riak_kv_wm_index + "/" +bucket_name+ "/keys/" +key,
        options: options
    };

    _this.head(query, function(err, data, meta) {
        if(err && meta.status_code != 404) _return(err, data, meta);
        else {
            if(meta.status_code != 404) {
                _return(err, true);
            }
            else{
                _return(err, false);
            }
        }
    });
};

HTTPBackend.prototype.objects.delete = function(/* bucket_name, key, [options] _return */) {
    var _this = this.this;

    var bucket_name = arguments[0];
    var key = arguments[1] || "";
    var options = typeof(arguments[2]) == 'object' ? arguments[2] : {};
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var query = {
        resource: _this.resources.riak_kv_wm_index + "/" +bucket_name+ "/keys/" +key,
        options: options
    };

    _this.delete(query, _return);
};


HTTPBackend.prototype.request = function(method, query, _return) {
  var req = http.request({ headers: HTTPBackend.appendDefaultHeaders(query.headers),
                           path: query.resource + HTTPBackend.appendOptions(query.options),
                           method: method,
                           host: this.host,
                           port: this.port}, HTTPBackend.responseHandler.bind(this, _return));
  
  req.on('error', function(error) {
    _return(error, null, null);
  });

  req.end(query.body, query.encoding || 'utf8');
};

HTTPBackend.responseHandler = function(_return, res) { // reversed signature due to bind()'s prepend behavior in request()
  var body = [];
  res.headers['status-code'] = res.statusCode;

  res.on('data', function(chunk) {
    body.push(chunk);
  });

  res.on('end', function() {
    body = Buffer.concat(body, parseInt(res.headers['content-length'], 10) || undefined);
    var err = null;

    if(res.statusCode >= 400 && res.req.method != "DELETE") {
        err = new Error();
        err.code = res.statusCode;
        err.message = body.toString();
    }
    
    _return(err, body, HTTPBackend.headersToMetadata(res.headers));
  });

  res.on('close', function(err){
    _return(err, body, res.headers);
  });
};

HTTPBackend.headersToMetadata = function(headers) {
  var metadata = HTTPBackend.munchHeaders(headers);
  
  return metadata;
};

HTTPBackend.metadataToHeaders = function(metadata) {
  var headers = HTTPBackend.munchMetadata(metadata);

  return headers;
};

HTTPBackend.appendDefaultHeaders = function(headers) {
    headers = headers || {};

    headers["Content-Type"] = headers["Content-Type"] || HTTPBackend.defaults.headers["Content-Type"];
    headers["Accept"] = headers["Accept"] || HTTPBackend.defaults.headers["Accept"];

    return headers;
};

HTTPBackend.appendOptions = function(options) {
    var temp = "";
    
    for(var key in options) {
        temp += key + "=" + options[key] + "&";
    }

    temp = (temp.length !== 0) ? "?"+temp : temp;

    return temp;
};

HTTPBackend.prototype.head = function(query, _return) {
  this.request('HEAD', query, _return);
};

HTTPBackend.prototype.get = function(query, _return) {
  this.request('GET', query, _return);
};

HTTPBackend.prototype.post = function(query, _return) {
  this.request('POST', query, _return);
};

HTTPBackend.prototype.put = function(query, _return) {
  this.request('PUT', query, _return);
};

HTTPBackend.prototype.delete = function(query, _return) {
  this.request('DELETE', query, _return);
};

HTTPBackend.munchHeaders = function(headers) {
  var metadata = {};
  
  headers = HTTPBackend.filterHeaders(headers);

  for(var key in headers) {
    var low_key = key.toLowerCase();
    
    if(low_key.indexOf("x-riak-")) {
      low_key = low_key.replace("-","_");
    }
    else{
      low_key = low_key.slice(7).replace("_","-");
    }
    
    var parts = low_key.split("-");
    parts.push(headers[key]);
    metadata = HTTPBackend.toNamespaced(metadata, parts);
  }
  return metadata;
};

HTTPBackend.filterHeaders = function(headers) {
    for(var i = 0, length = HTTPBackend.defaults.ignore_headers.length; i < length; i++) {
        if(headers[HTTPBackend.defaults.ignore_headers[i]]) {
            delete headers[HTTPBackend.defaults.ignore_headers[i].toLowerCase()];
        }
    }
    return headers;
};

HTTPBackend.munchMetadata = function(metadata, accumulator, container) {
  accumulator = accumulator || "";
  container = container || {};
  
  for(var prop in metadata) {
    var acc = accumulator;

    acc = (prop === "vclock" || prop === "index" || prop === "meta") ? "x-riak" : acc;

    if(metadata.hasOwnProperty(prop) && metadata[prop].constructor.name == "Object") {
      munchMetadata(metadata[prop], (acc === "") ? prop : acc + "-" + prop, container);
    }
    else {
      var value = metadata[prop].constructor.name == "Array" ? metadata[prop].join(", ") : metadata[prop];
      prop = prop.replace("_","-");
      
      if(acc === "") {
        container[prop] = value;
      }
      else {
        container[(prop == "int" || prop == 'bin') ? (acc + "_" + prop) : (acc + "-" + prop)] = value;
      }
    }
  }
  
  return container;
};

HTTPBackend.toNamespaced = function(parent, parts) {
  var namespace = parent;
  
  for(var i = 0, length = parts.length-1; i < length; i++) {
      if(i+1 == length) {
        parent[parts[i]] = (parts[0] == 'index') ? parts[i+1].split(", ") : parts[i+1];
      }
      else {
        parent[parts[i]] = parent[parts[i]] || {};
        parent = parent[parts[i]];
      }
  }
  return namespace;
};

HTTPBackend.defaults = {
    headers: {
        "Content-Type": "application/json",
        "Accept": "*/*"
    },
    ignore_headers: [
        "date",
        "content-length",
        "server",
        "vary"
    ],
    connection: {
        host: 'localhost',
        port: 8098
    },
    resources: {
        riak_kv_wm_buckets: "/riak",
        riak_kv_wm_index: "/buckets",
        riak_kv_wm_keylist: "/buckets",
        riak_kv_wm_link_walker: "/riak",
        riak_kv_wm_mapred: "/mapred",
        riak_kv_wm_object: "/riak",
        riak_kv_wm_ping: "/ping",
        riak_kv_wm_props: "/buckets",
        riak_kv_wm_stats: "/stats",
        riak_solr_indexer_wm: "/solr",
        riak_solr_searcher_wm: "/solr"
    }
};

module.exports = HTTPBackend;