var riak = require('nodiak');
var helpers = require('nodiak/lib/helpers')

var args = process.argv.slice(2);
var host = args[0] || "localhost";
var port = args[1] !== null ? parseInt(args[1]) : 8098;
var variant = args[2] !== null ? parseInt(args[2]) : 2;

var db = riak.getClient('http', host, port);

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

        if (variant >= 2) db._bucketType.list("json", printer);
        db._bucketType.list(null, printer);

        db._bucket.props(null, "users", printer);
        if (variant >= 2) db._bucket.props("json", "sessions", printer);

    } else {
        var users, sessions;
        users = db.bucket("users");
        if (variant >= 2) sessions = db.bucketType("json").buckets.new("sessions");

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

            targetBucket = variant >= 2 ? sessions : users;
            
            targetBucket.objects.exists(key, function(err, exists) {
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
                    targetBucket.objects.new(key, data).save(printer);
                } else {
                    targetBucket.objects.get(key, function(err, object) {
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
