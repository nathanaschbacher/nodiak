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
    var riak = require('../../nodiak').getClient('http', 'localhost', '8091');
    var riaks = require('../../nodiak').getClient('https', 'localhost', '8071');
    
    var async = require('async');
    var should = require('should');

    before(function(done){ // bootstrap settings and data for tests.
        riak.ping(function(err, response) {
            if(err) throw new Error(err.toString());
            else {
                riak._bucket.save('test', {"precommit":[{"mod":"riak_search_kv_hook","fun":"precommit"}]}, function(err, result) {
                    if(err) throw new Error(err.toString());
                    else {
                        var data = { field1: "has been set" };
                        var metadata = {
                            index: {
                                strings: { bin: ['this', 'that', 'the', 'other'] },
                                numbers: { int: [1000,250,37,4234,5] }
                            },
                            meta: { extra_details: "you might want to know"}
                        };
                        var created = [];
                        for(var i = 1; i <= 100; i++) {
                            riak._object.save('test', null, data, metadata, function(err, obj) {
                                if(err) throw new Error(err.toString());
                                else {
                                    created.push(obj);
                                }

                                if(created.length == 100) {
                                    done();
                                }
                            });
                        }
                    }
                });
            }
        });
    });

    describe("Basic HTTP & HTTPS functionality", function() {
        it("should be able to ping the cluster via HTTP", function(done) {
            riak.ping(function(err, response) {
                should.not.exist(err);
                response.should.equal("OK");
                done();
            });
        });

        it("should be able to ping the cluster via HTTPS", function(done) {
            riaks.ping(function(err, response) {
                should.not.exist(err);
                response.should.equal("OK");
                done();
            });
        });

        it("should be able to get stats via HTTP", function(done) {
            riak.stats(function(err, response) {
                should.not.exist(err);
                response.should.be.a('object');
                done();
            });
        });

        it("should be able to get stats via HTTPS", function(done) {
            riaks.stats(function(err, response) {
                should.not.exist(err);
                response.should.be.a('object');
                done();
            });
        });

        it("should be able to list resources via HTTP", function(done) {
            riak.resources(function(err, response) {
                should.not.exist(err);
                response.should.be.a('object');
                done();
            });
        });

        it("should be able to list resources via HTTPS", function(done) {
            riaks.resources(function(err, response) {
                should.not.exist(err);
                response.should.be.a('object');
                done();
            });
        });
    });

    describe("Using the base client to interact with buckets", function() {
        it("should be able to read bucket properties", function(done) {
            riak._bucket.props('random_bucket', function(err, props) {
                should.not.exist(err);
                props.should.be.a('object').and.have.property('name', 'random_bucket');
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
            riak._bucket.keys('test', function(err, keys) {
                should.not.exist(err);

                keys.on('data', function(data) {
                    data.should.be.an.instanceOf(Array);
                });

                keys.on('end', function(metadata) {
                    done();
                });

                keys.on('error', function(err) {
                    should.not.exist(err);
                });
            });
        });
    });

    describe("Using the base client to interact with objects", function() {
        it("should be able to check existence of object", function(done) {
            riak._object.save('test', 'this_ol_key', { "pointless": "data" }, null, function(err, obj) {
                should.not.exist(err);

                riak._object.exists('test', 'this_ol_key', function(err, exists) {
                    should.not.exist(err);
                    exists.should.be.true;

                    riak._object.exists('test', 'no_key_here', function(err, exists) {
                        should.not.exist(err);
                        exists.should.be.false;
                        done();
                    });
                });
            });
        });

        it("should be able to save an object", function(done) {
            riak._object.save('test', 'this_ol_key', { "pointless": "data" }, null, function(err, obj) {
                should.not.exist(err);
                obj.should.be.a('object').and.have.property('key', 'this_ol_key');
                obj.should.be.a('object').and.have.property('data');
                obj.data.should.eql({ "pointless": "data" });
                done();
            });
        });

        it("should be able to get an object", function(done) {
            riak._object.get('test', 'this_ol_key', function(err, obj) {
                should.not.exist(err);
                obj.should.be.a('object').and.have.property('key', 'this_ol_key');
                obj.should.be.a('object').and.have.property('data');
                obj.data.should.eql({ "pointless": "data" });
                obj.metadata.should.be.a('object').and.have.property('vclock');
                done();
            });
        });

        it("should be able to delete an object", function(done) {
            riak._object.delete('test', 'this_ol_key', function(err, obj) {
                should.not.exist(err);
                obj.metadata.status_code.should.equal(204);
                done();
            });
        });

        it("should be able to get sibling vtags when siblings exist", function(done) {
            riak._bucket.save('siblings_test', { allow_mult: true }, function(err, response) {
                should.not.exist(err);

                riak._object.save('siblings_test', 'this_ol_key', { "pointless": "data" }, null, function(err, obj) {
                    should.not.exist(err);
                    obj.should.be.a('object').and.have.property('key', 'this_ol_key');
                    obj.should.be.a('object').and.have.property('data');
                    obj.data.should.eql({ "pointless": "data" });
                
                    riak._object.save('siblings_test', 'this_ol_key', { "pointless": "sibling" }, null, function(err, obj) {
                        should.not.exist(err);
                        obj.should.be.a('object').and.have.property('key', 'this_ol_key');
                        obj.should.be.a('object').and.have.property('data');
                        obj.data.should.eql({ "pointless": "sibling" });

                        riak._object.get('siblings_test', 'this_ol_key', function(err, obj) {
                            should.not.exist(err);
                            obj.should.be.a('object').and.have.property('siblings');
                            obj.siblings.should.be.an.instanceof(Array);
                            obj.metadata.should.be.a('object').and.have.property('vclock');
                            done();
                        });
                    });
                });

            });
        });
    });

    describe("Using the base client to perform searches", function() {
        it("should be able to perform ranged integer 2i searches", function(done) {
            riak._bucket.twoi('test', [0,10000], 'numbers_int', function(err, keys) {
                should.not.exist(err);
                keys.should.be.an.instanceOf(Array).with.lengthOf(500);
                done();
            });
        });

        it("should be able to perform exact match integer 2i searches", function(done) {
            riak._bucket.twoi('test', 1000, 'numbers_int', function(err, keys) {
                should.not.exist(err);
                keys.should.be.an.instanceOf(Array).with.lengthOf(100);
                done();
            });
        });

        it("should be able to perform ranged binary 2i searches", function(done) {
            riak._bucket.twoi('test', ['a','zzzzzzzzzzz'], 'strings_bin', function(err, keys) {
                should.not.exist(err);
                keys.should.be.an.instanceOf(Array).with.lengthOf(400);
                done();
            });
        });

        it("should be able to perform exact match binary 2i searches", function(done) {
            riak._bucket.twoi('test', 'that', 'strings_bin', function(err, keys) {
                should.not.exist(err);
                keys.should.be.an.instanceOf(Array).with.lengthOf(100);
                done();
            });
        });

        it("should be able to perform solr search on indexed bucket", function(done) {
            riak._bucket.solr('test', { q: 'field1:been' }, function(err, obj) {
                should.not.exist(null);
                obj.data.should.have.property('response');
                obj.data.response.should.have.property('numFound', 100);
                obj.data.response.should.have.property('docs').with.lengthOf(10);
                done();
            });
        });
    });

    describe("Performing MapReduce queries", function() {
        it("should be able to handle streamed results", function(done) {
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
                .execute({chunked: true}, function(err, results) {
                    results.on('data', function(result) {
                        result.should.be.a('object');
                        result.data.should.be.an.instanceOf(Array);
                        result.data[0].should.equal(101);
                    });

                    results.on('end', function(metadata) {
                        done();
                    });

                    results.on('error', function(err) {
                        should.not.exist(err);
                    });
                }
            );
        });

        it("should be able to handle non-streamed results", function(done) {
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
                .execute(function(err, result) {
                    should.not.exist(err);
                    result.should.be.a('object');
                    result.data.should.be.an.instanceOf(Array);
                    result.data[0].should.equal(101);
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
            var bucket = riak._bucket.get('test');

            bucket.getProps(function(err, props) {
                should.not.exist(err);

                props.should.have.property('name');
                props.name.should.equal('test');
                bucket.props.name.should.eql(props.name);

                done();
            });
        });

        it("should be able to save its props to Riak", function(done) {
            var bucket = riak._bucket.get('test');

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
    });

    describe("Using the 'Bucket' class to perform Solr and 2i's searches", function() {
        it("should be able to perform ranged 2i searches, results as RObjects", function(done) {
            riak.bucket('test').search.twoi([0,10000], 'numbers', true, function(err, response) {
                should.not.exist(err);
                response.should.have.property('results');
                response.results.should.be.an.instanceOf(Array).with.lengthOf(100);

                response.should.have.property('numFound');
                response.numFound.should.eql(100);

                response.results[0].constructor.name.should.eql('RObject');
                done();
            });
        });

        it("should be able to perform ranged 2i searches, results as keys", function(done) {
            riak.bucket('test').search.twoi([0,10000], 'numbers', function(err, response) {
                should.not.exist(err);
                response.should.have.property('results');
                response.results.should.be.an.instanceOf(Array).with.lengthOf(100);

                response.should.have.property('numFound');
                response.numFound.should.eql(100);

                response.results[0].constructor.name.should.eql('String');
                done();
            });
        });

        it("should be able to perform exact match 2i searches, results as RObjects", function(done) {
            riak.bucket('test').search.twoi('that', 'strings', true, function(err, response) {
                should.not.exist(err);
                response.should.have.property('results');
                response.results.should.be.an.instanceOf(Array).with.lengthOf(100);

                response.should.have.property('numFound');
                response.numFound.should.eql(100);

                response.results[0].constructor.name.should.eql('RObject');
                done();
            });
        });

        it("should be able to perform exact match 2i searches, results as keys", function(done) {
            riak.bucket('test').search.twoi('that', 'strings', function(err, response) {
                should.not.exist(err);
                response.should.have.property('results');
                response.results.should.be.an.instanceOf(Array).with.lengthOf(100);

                response.should.have.property('numFound');
                response.numFound.should.eql(100);

                response.results[0].constructor.name.should.eql('String');
                done();
            });
        });

        it("should be able to perform Solr search on indexed bucket, results as RObjects", function(done) {
            riak.bucket('test').search.solr({ q: 'field1:been' }, true, function(err, response) {
                should.not.exist(err);
                response.should.have.property('numFound');
                response.numFound.should.eql(100);

                response.should.have.property('docs');
                response.docs.should.be.an.instanceOf(Array).with.lengthOf(10);
                response.docs[0].constructor.name.should.eql('RObject');
                done();
            });
        });

        it("should be able to perform Solr search on indexed bucket", function(done) {
            riak.bucket('test').search.solr({ q: 'field1:been' }, function(err, response) {
                should.not.exist(err);
                response.should.have.property('numFound');
                response.numFound.should.eql(100);

                response.should.have.property('docs');
                response.docs.should.be.an.instanceOf(Array).with.lengthOf(10);
                response.docs[0].constructor.name.should.eql('Object');
                done();
            });
        });
    });



    after(function(done) { // teardown pre-test setup.
        function delete_all(done) {
            async.parallel([
                function(next) {
                    var bucket = riak._bucket.get('test');
                    bucket.objects.all(function(err, r_objs) {
                        bucket.objects.delete(r_objs, function(err, result) {
                            next(err, result);
                        });
                    });
                },
                function(next) {
                    var bucket = riak._bucket.get('siblings_test');
                    bucket.objects.all(function(err, r_objs) {
                        bucket.objects.delete(r_objs, function(err, result) {
                            next(err, result);
                        });
                    });
                }
            ],
            function(err, results){
                if(err) throw new Error(err.toString());
                else done();
            });
        }

        delete_all(done);
    });
});
