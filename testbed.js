var util = require('util');

var riak = require('./lib/client').getClient('localhost', '8091', 'http');

var riaks = require('./lib/client').getClient('localhost', '8071', 'https');



//var bucket = riaks.buckets.get('testing');

riak.objects.delete('testing', "some_key_value", {returnbody: true}, function(err, obj, meta) {
    console.log(err);
    console.log(meta);
    console.log(obj.toString());
    //console.log(JSON.parse(obj));
});

// bucket.keys(true, function(err, obj, meta){
//   console.log(err);
//   console.log(meta);
//   console.log(obj.toString());
// });


// bucket.props.allow_mult = true;
// console.log(bucket.props);
// bucket.save(function(err, obj, meta) {
//   console.log(err);
//   console.log(meta);
//   console.log(obj.toString());
// });

// bucket.fetchProps(function(err, obj, meta) {
//   console.log(err);
//   console.log(meta);
//   console.log(obj);
// });



// riak.buckets.list(true, function(err, obj, meta) {
//   console.log(err);
//   console.log(meta);
//   console.log(obj);
// });

// riaks.stats(function(err, obj, meta) {
//   console.log(err);
//   console.log(meta);
//   console.log(obj);
// });

// var buck = temp.buckets.get('testing');

// buck.getProps(function(err, obj, meta) {
//   console.log(err);
//   console.log(meta);
//   console.log(obj);
// });
//var bucket = temp.buckets.get('testing');

// bucket.keys('testing', function(err, obj, meta) {
//   console.log(err);
//   console.log(meta);
//   console.log(JSON.parse(obj));
// });