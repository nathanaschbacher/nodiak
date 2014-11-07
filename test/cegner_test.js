var riak = require('nodiak');
var helpers = require('nodiak/lib/helpers')

var db = riak.getClient('http', "localhost", 11898, {riak_kv_wm_bucket_type: "/types"})

db.ping(function(err, isAlive) {
    if (!isAlive) { 
        console.error("Unable to establish connection to riak server", db.host, db.port);
    } else if (err) {
        console.error("Error connecting to riak server", db.host, db.port);
    } else {
        console.log("Connected")
    }
});

db.loadResources(function(err, resources) {
    if (err) {
        console.error("failed to connect to riak", err);
        return;
    }

    var printer = function(err, results) {
        if (err) {
            console.error("failed", err);
            console.trace();
        } else {
            console.log("success", results);
        }
        console.log(Array(81).join("="));
    };

    // var raw = 1;
    var raw = 0;
    if ( raw ) {    
        db.resources(printer);

        db._bucketType.list("json", printer);
        db._bucketType.list(null, printer);

        db._bucket.props(null, "users", printer);
        db._bucket.props("json", "sessions", printer);

    } else {
        var users = db.bucket("users");
        var sessions = db.bucketType("json").buckets.new("sessions");

        // console.log("props");
        // users.getProps(printer);
        // sessions.getProps(printer);

        // console.log("all objects");

        // users.objects.all(printer);
        // sessions.objects.all(printer);

        var create = 1;
        // var create = 0;
        if ( create ) {
            var key = "some_data";
            sessions.objects.exists(key, function(err, exists) {
                if (err) {
                    console.error(err);
                    return;
                }

                console.log("exists", key, exists);

                if ( !exists ) {
                    data = {
                        "hello": "world",
                        "counter": 1,
                        "createdAt": new Date().toISOString()
                    };
                    sessions.objects.new(key, data).save(printer);
                } else {
                    sessions.objects.get(key, function(err, object) {
                        if (err) {
                            console.error("cannot fetch", key, err);
                            return;
                        }
                        object.delete(printer);
                    });
                }
            });
        }
    }
});
