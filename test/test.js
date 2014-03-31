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

describe("Nodiak Riak Client Test Suite", function() {
    var TIMEOUT = process.env.TIMEOUT || 20000;
    var NUM_OBJECTS = parseInt(process.env.NUM_OBJECTS, 10) || 1000;
    var backend = process.env.NODIAK_BACKEND || 'http';
    var host = process.env.NODIAK_HOST || 'localhost';
    var port = process.env.NODIAK_PORT || '8098';
    var search_enabled = process.env.NODIAK_SEARCH && process.env.NODIAK_SEARCH != 'false' ? true : false;
    var twoi_enabled = process.env.NODIAK_2I && process.env.NODIAK_2I != 'false'? true : false;

    var riak = require('../index.js').getClient(backend, host, port);
    
    var async = require('async');
    var should = require('should');

    before(function(done){ // bootstrap settings and data for tests.
        this.timeout(TIMEOUT);
        riak.ping(function(err, response) {
            if(err) throw new Error(err.toString());
            else {
                var search_hook = search_enabled ? {precommit:[{mod:"riak_search_kv_hook",fun:"precommit"}]} : {precommit:[]};

                riak._bucket.save('nodiak_test', search_hook, function(err, result) {
                    if(err) throw new Error(err.toString());
                    else {
                        var data = { field1: "has been set" };
                        var metadata = {
                            index: {
                                strings: { bin: ['this', 'that', 'the', 'other'] },
                                numbers: { int: [1000,250,37,4234,5] }
                            },
                            meta: { details: "you might want to know" }
                        };
                        var created = [];
                        for(var i = 1; i <= NUM_OBJECTS; i++) {
                            riak._object.save('nodiak_test', i, data, metadata, function(err, obj) {
                                if(err) throw new Error(err.toString());
                                else {
                                    created.push(obj);
                                }

                                if(created.length == NUM_OBJECTS) {
                                    done();
                                }
                            });
                        }
                    }
                });
            }
        });
    });

    describe("Basic connection functionality", function() {
        it("should be able to ping the cluster via "+backend.toUpperCase(), function(done) {
            riak.ping(function(err, response) {
                should.not.exist(err);
                response.should.equal("OK");
                done();
            });
        });

        it("should be able to get stats via "+backend.toUpperCase(), function(done) {
            riak.stats(function(err, response) {
                should.not.exist(err);
                response.should.be.an.Object;
                done();
            });
        });

        it("should be able to list resources via "+backend.toUpperCase(), function(done) {
            riak.resources(function(err, response) {
                should.not.exist(err);
                response.should.be.an.Object;
                done();
            });
        });
    });

    describe("Using the base client to interact with buckets", function() {
        it("should be able to read bucket properties", function(done) {
            riak._bucket.props('random_bucket', function(err, props) {
                should.not.exist(err);
                props.should.be.an.Object.and.have.property('name', 'random_bucket');
                done();
            });
        });

        it("should be able to save properties to a bucket", function(done) {
            riak._bucket.props('random_bucket', function(err, props) {
                should.not.exist(err);

                var toggled = props.allow_mult ? false : true;
                props.allow_mult = toggled;

                riak._bucket.save('random_bucket', props, function(err, response) {
                    should.not.exist(err);
                    
                    riak._bucket.props('random_bucket', function(err, props) {
                        should.not.exist(err);
                        props.allow_mult.should.equal(toggled);
                        done();
                    });
                });
            });
        });

        it("should be able to list all buckets", function(done) {
            riak._bucket.list(function(err, buckets) {
                should.not.exist(err);
                buckets.should.be.an.instanceOf(Array);
                done();
            });
        });

        it("should be able to list all keys in a bucket", function(done) {
            riak._bucket.keys('nodiak_test').stream()
            .on('data', function(data) {
                data.should.be.an.instanceOf(Array);
            })
            .on('end', function() {
                done();
            })
            .on('error', function(err) {
                should.not.exist(err);
            });
        });
    });

    describe("Using the base client to interact with objects", function() {
        it("should be able to check existence of object", function(done) {
            riak._object.save('nodiak_test', 'this_ol_key', { "pointless": "data" }, null, function(err, obj) {
                should.not.exist(err);

                riak._object.exists('nodiak_test', 'this_ol_key', function(err, exists) {
                    should.not.exist(err);
                    exists.should.be.true;

                    riak._object.exists('nodiak_test', 'no_key_here', function(err, exists) {
                        should.not.exist(err);
                        exists.should.be.false;
                        done();
                    });
                });
            });
        });

        it("should be able to save an object", function(done) {
            riak._object.save('nodiak_test', 'this_ol_key', { "pointless": "data" }, null, function(err, obj) {
                should.not.exist(err);
                obj.should.be.an.Object.and.have.property('key', 'this_ol_key');
                obj.should.be.an.Object.and.have.property('data');
                obj.data.should.eql({ "pointless": "data" });
                done();
            });
        });

        it("should be able to get an object", function(done) {
            riak._object.get('nodiak_test', 'this_ol_key', function(err, obj) {
                should.not.exist(err);
                obj.should.be.an.Object.and.have.property('key', 'this_ol_key');
                obj.should.be.an.Object.and.have.property('data');
                obj.data.should.eql({ "pointless": "data" });
                obj.metadata.should.be.an.Object.and.have.property('vclock');
                done();
            });
        });

        it("should be able to delete an object", function(done) {
            riak._object.delete('nodiak_test', 'this_ol_key', function(err, obj) {
                should.not.exist(err);
                obj.metadata.status_code.should.equal(204);
                done();
            });
        });

        it("should be able to get sibling vtags when siblings exist", function(done) {
            riak._bucket.save('siblings_test', { allow_mult: true }, function(err, response) {
                should.not.exist(err);

                riak._object.save('siblings_test', 'this_ol_key', { "pointless": "data" }, { meta: { extra: "meta data goes here"} }, function(err, obj) {
                    should.not.exist(err);
                    obj.should.be.an.Object.and.have.property('key', 'this_ol_key');
                    obj.should.be.an.Object.and.have.property('data');
                    obj.data.should.eql({ "pointless": "data" });
                
                    riak._object.save('siblings_test', 'this_ol_key', { "pointless": "sibling" }, { meta: {extra: "meta data goes EVERYWHERE"} }, function(err, obj) {
                        should.not.exist(err);
                        obj.should.be.an.Object.and.have.property('key', 'this_ol_key');
                        obj.should.be.an.Object.and.have.property('data');
                        obj.data.should.eql({ "pointless": "sibling" });

                        riak._object.get('siblings_test', 'this_ol_key', function(err, obj) {
                            should.not.exist(err);
                            obj.should.be.an.Object.and.have.property('siblings');
                            obj.siblings.should.be.an.instanceof(Array);
                            obj.metadata.should.be.an.Object.and.have.property('vclock');
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("Using the base client to perform 2i queries", function() {
        if(twoi_enabled) {
            it("should be able to perform ranged integer 2i searches", function(done) {
                riak._bucket.twoi('nodiak_test', [0,10000], 'numbers_int', {}, function(err, keys) {
                    should.not.exist(err);
                    keys.should.be.an.instanceOf(Array).with.lengthOf(NUM_OBJECTS * 5);
                    done();
                });
            });

            it("should be able to perform exact match integer 2i searches", function(done) {
                riak._bucket.twoi('nodiak_test', 1000, 'numbers_int', {}, function(err, keys) {
                    should.not.exist(err);
                    keys.should.be.an.instanceOf(Array).with.lengthOf(NUM_OBJECTS);
                    done();
                });
            });

            it("should be able to perform ranged binary 2i searches", function(done) {
                riak._bucket.twoi('nodiak_test', ['a','zzzzzzzzzzz'], 'strings_bin', {}, function(err, keys) {
                    should.not.exist(err);
                    keys.should.be.an.instanceOf(Array).with.lengthOf(NUM_OBJECTS * 4);
                    done();
                });
            });

            it("should be able to perform exact match binary 2i searches", function(done) {
                riak._bucket.twoi('nodiak_test', 'that', 'strings_bin', {}, function(err, keys) {
                    should.not.exist(err);
                    keys.should.be.an.instanceOf(Array).with.lengthOf(NUM_OBJECTS);
                    done();
                });
            });
        }
        else {
            return;
        }
    });

    describe("Using the base client to perform Riak Search queries", function() {
        if(search_enabled) {
            it("should be able to perform solr search on indexed bucket", function(done) {
                riak._bucket.solr('nodiak_test', { q: 'field1:been' }, function(err, obj) {
                    should.not.exist(null);
                    obj.data.should.have.property('response');
                    obj.data.response.should.have.property('numFound', NUM_OBJECTS);
                    obj.data.response.should.have.property('docs').with.lengthOf(10);
                    done();
                });
            });
        }
        else {
            return;
        }
    });

    describe("Performing MapReduce queries", function() {
        it("should be able to handle streamed results", function(done) {
            riak.mapred.inputs('nodiak_test')
                .map({
                    language: 'erlang',
                    module: 'riak_kv_mapreduce',
                    function: 'map_object_value',
                    arg: 'filter_notfound'})
                .reduce({
                    language: 'erlang',
                    module: 'riak_kv_mapreduce',
                    function: 'reduce_count_inputs'})
                .execute().stream()
                .on('data', function(result) {
                    result.should.be.an.Object;
                    result.data.should.be.an.instanceOf(Array);
                    result.data[0].should.equal(NUM_OBJECTS + 1);
                })
                .on('end', function() {
                    done();
                })
                .on('error', function(err) {
                    should.not.exist(err);
                });
        });

        it("should be able to handle non-streamed results", function(done) {
             riak.mapred.inputs('nodiak_test')
                .map({
                    language: 'erlang',
                    module: 'riak_kv_mapreduce',
                    function: 'map_object_value',
                    arg: 'filter_notfound'})
                .reduce({
                    language: 'erlang',
                    module: 'riak_kv_mapreduce',
                    function: 'reduce_count_inputs'})     
                .execute(function(err, result) {
                    should.not.exist(err);
                    result.should.be.an.Object;
                    result.data.should.be.an.instanceOf(Array);
                    result.data[0].should.equal(NUM_OBJECTS + 1);
                    done();
                }
            );
        });
    });

    describe("Using the 'Bucket' class to interact with buckets and objects", function() {
        it("should be able to get a Bucket instance from the base client", function(done) {
            var bucket = riak.bucket('some_bucket');

            bucket.should.have.property('constructor');
            bucket.constructor.should.have.property('name', 'Bucket');
            bucket.name.should.equal('some_bucket');
            done();
        });

        it("should be able to fetch props from Riak", function(done) {
            var bucket = riak._bucket.get('nodiak_test');

            bucket.getProps(function(err, props) {
                should.not.exist(err);

                props.should.have.property('name');
                props.name.should.equal('nodiak_test');
                bucket.props.name.should.eql(props.name);

                done();
            });
        });

        it("should be able to save its props to Riak", function(done) {
            var bucket = riak._bucket.get('nodiak_test');

            bucket.props.last_write_wins = true;

            bucket.saveProps(function(err, saved) {
                should.not.exist(err);

                bucket.props.should.have.property('last_write_wins', true);
                bucket.props.last_write_wins.should.equal(saved.props.last_write_wins);

                bucket.props.last_write_wins = false;

                bucket.saveProps(function(err, saved) {
                    should.not.exist(err);

                    bucket.props.should.have.property('last_write_wins', false);
                    bucket.props.last_write_wins.should.equal(saved.props.last_write_wins);

                    done();
                });
            });
        });

        it("should be able to get RObject w/ siblings fetched as async requests for vtags", function(done) {
            var bucket = riak.bucket('siblings_test');
            bucket.objects.get('this_ol_key', function(err, obj) {
                should.not.exist(err);
                obj.constructor.name.should.eql('RObject');
                obj.should.have.property('siblings');
                obj.siblings.should.be.an.instanceOf(Array).with.lengthOf(2);
                obj.siblings[0].constructor.name.should.eql('RObject');
            });
            done();
        });
        
        it("should be able to get RObject w/ siblings as one request for multipart/mixed objects", function(done) {
            var bucket = riak.bucket('siblings_test');
            bucket.getSiblingsSync = true;
            bucket.objects.get('this_ol_key', function(err, obj) {
                should.not.exist(err);
                obj.constructor.name.should.eql('RObject');
                obj.should.have.property('siblings');
                obj.siblings.should.be.an.instanceOf(Array).with.lengthOf(2);
                obj.siblings[0].constructor.name.should.eql('RObject');
            });
            done();
        });
    });

    describe("Using the 'Bucket' class to perform 2i queries", function() {
        if(twoi_enabled) {
            it("should be able to perform ranged 2i searches, stream results as keys", function(done) {
                var all_results = [];
                riak.bucket('nodiak_test').search.twoi([0,10000], 'numbers').stream()
                .on('data', function(key) {
                    key.constructor.name.should.eql('String');
                    all_results.push(key);
                })
                .on('error', function(err) {
                    should.not.exist(err);
                })
                .on('end', function() {
                    all_results.length.should.eql(NUM_OBJECTS);
                    done();
                });
            });

            it("should be able to perform ranged 2i searches, results as keys", function(done) {
                riak.bucket('nodiak_test').search.twoi([0,10000], 'numbers', function(err, response) {
                    should.not.exist(err);
                    response.should.be.an.instanceOf(Array).with.lengthOf(NUM_OBJECTS);

                    response[0].constructor.name.should.eql('String');
                    done();
                });
            });

            it("should be able to perform exact match 2i searches, stream results as keys", function(done) {
                var all_results = [];
                riak.bucket('nodiak_test').search.twoi('that', 'strings').stream()
                .on('data', function(key) {
                    key.constructor.name.should.eql('String');
                    all_results.push(key);
                })
                .on('error', function(err) {
                    should.not.exist(err);
                })
                .on('end', function() {
                    all_results.length.should.eql(NUM_OBJECTS);
                    done();
                });
            });

            it("should be able to perform exact match 2i searches, results as keys", function(done) {
                riak.bucket('nodiak_test').search.twoi('that', 'strings', function(err, response) {
                    should.not.exist(err);
                    response.should.be.an.instanceOf(Array).with.lengthOf(NUM_OBJECTS);

                    response[0].constructor.name.should.eql('String');
                    done();
                });
            });
        }
        else {
            return;
        }
    });

    describe("Using the 'Bucket' class to perform Riak Search queries", function() {
        if(search_enabled) {
            it("should be able to perform Solr search on indexed bucket, stream results as RObjects", function(done) {
                var all_results = [];
                riak.bucket('nodiak_test').search.solr({ q: 'field1:been' }).stream()
                .on('data', function(r_obj) {
                    r_obj.constructor.name.should.eql('RObject');
                    all_results.push(r_obj);
                })
                .on('error', function(err) {
                    should.not.exist(err);
                })
                .on('end', function() {
                    all_results.length.should.eql(10);
                    done();
                });
            });

            it("should be able to perform Solr search on indexed bucket", function(done) {
                riak.bucket('nodiak_test').search.solr({ q: 'field1:been' }, function(err, results) {
                    should.not.exist(err);
                    results.should.have.property('response');
                    results.response.should.have.property('numFound');
                    results.response.numFound.should.eql(NUM_OBJECTS);

                    results.response.should.have.property('docs');
                    results.response.docs.should.be.an.instanceOf(Array).with.lengthOf(10);
                    results.response.docs[0].constructor.name.should.eql('Object');
                    done();
                });
            });
        }
        else {
            return;
        }
    });

    describe("Using the 'RObject' class to perform fetch/save/delete operations", function() {
        var obj = riak.bucket('nodiak_test').object.new('1');

        it("should be able to hydrate an uninitialized RObject from Riak", function(done) {
            obj.fetch(function(err, result) {
                should.not.exist(err);
                done();
            });
        });

        it("should be able to save a hydrated RObject to Riak", function(done) {
            obj.save(function(err, result) {
                should.not.exist(err);
                done();
            });
        });

        it("should be able to delete a hydrate a RObject from Riak", function(done) {
            obj.delete(function(err, result) {
                should.not.exist(err);
                done();
            });
        });
    });

    describe("Using the 'Counter' class to perform CRDT Counter operations", function() {
        it("should be able to add to a counter", function(done) {
            riak.counter('siblings_test', 'the_count').add(4, function(err, response) {
                should.not.exist(err);
                done();
            });
        });

        it("should be able to subtract from a counter", function(done) {
            riak.counter('siblings_test', 'the_count').subtract(2, function(err, response) {
                should.not.exist(err);
                done();
            });
        });

        it("should be able to get the value of a counter", function(done) {
            riak.counter('siblings_test', 'the_count').value(function(err, response) {
                should.not.exist(err);
                var type = typeof(response);
                type.should.eql('number');
                response.should.eql(2);
                done();
            });
        });
    });

    after(function(done) { // teardown pre-test setup.
        this.timeout(TIMEOUT);
        function delete_all(done) {
            async.parallel([
                function(next) {
                    var bucket = riak.bucket('nodiak_test');
                    bucket.objects.all(function(err, r_objs) {
                        bucket.objects.delete(r_objs, function(err, result) {
                            next(null, result);
                        });
                    });
                },
                function(next) {
                    var bucket = riak.bucket('siblings_test');
                    bucket.objects.all(function(err, r_objs) {
                        bucket.objects.delete(r_objs, function(err, result) {
                            next(null, result);
                        });
                    });
                }
            ],
            function(err, results){
                if(err) throw err;
                done();
            });
        }

        delete_all(done);
    });
});
