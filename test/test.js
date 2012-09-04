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
                riak.bucket.save('test', {"precommit":[{"mod":"riak_search_kv_hook","fun":"precommit"}]}, function(err, result) {
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
                        for(var i = 1; i <= 5; i++) {
                            riak.object.save('test', null, data, metadata, function(err, obj) {
                                if(err) throw new Error(err.toString());
                                else {
                                    created.push(obj);
                                }

                                if(created.length == 5) {
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
            riak.bucket.props('random_bucket', function(err, props) {
                should.not.exist(err);
                props.should.be.a('object').and.have.property('name', 'random_bucket');
                done();
            });
        });

        it("should be able to save properties to a bucket", function(done) {
            riak.bucket.props('random_bucket', function(err, props) {
                should.not.exist(err);

                var toggled = props.allow_mult ? false : true;
                props.allow_mult = toggled;

                riak.bucket.save('random_bucket', props, function(err, response) {
                    should.not.exist(err);
                    
                    riak.bucket.props('random_bucket', function(err, props) {
                        should.not.exist(err);
                        props.allow_mult.should.equal(toggled);
                        done();
                    });
                });
            });
        });

        it("should be able to list all buckets", function(done) {
            riak.buckets.list(function(err, buckets) {
                should.not.exist(err);
                buckets.should.be.an.instanceOf(Array);
                done();
            });
        });

        it("should be able to list all keys in a bucket", function(done) {
            riak.bucket.keys('test', function(err, keys) {
                should.not.exist(err);
                if(keys !== undefined) {
                    keys.should.be.an.instanceOf(Array);
                }
                else {
                    done();
                }
            });
        });
    });

    describe("Using the base client to interact with objects", function() {
        it("should be able to check existence of object", function(done) {
            riak.object.save('test', 'this_ol_key', { "pointless": "data" }, null, function(err, obj) {
                should.not.exist(err);

                riak.object.exists('test', 'this_ol_key', function(err, exists) {
                    should.not.exist(err);
                    exists.should.be.true;

                    riak.object.exists('test', 'no_key_here', function(err, exists) {
                        should.not.exist(err);
                        exists.should.be.false;
                        done();
                    });
                });
            });
        });

        it("should be able to save an object", function(done) {
            riak.object.save('test', 'this_ol_key', { "pointless": "data" }, null, function(err, obj) {
                should.not.exist(err);
                obj.should.be.a('object').and.have.property('key', 'this_ol_key');
                obj.should.be.a('object').and.have.property('data');
                obj.data.should.eql({ "pointless": "data" });
                done();
            });
        });

        it("should be able to get an object", function(done) {
            riak.object.get('test', 'this_ol_key', function(err, obj) {
                should.not.exist(err);
                obj.should.be.a('object').and.have.property('key', 'this_ol_key');
                obj.should.be.a('object').and.have.property('data');
                obj.data.should.eql({ "pointless": "data" });
                obj.metadata.should.be.a('object').and.have.property('vclock');
                done();
            });
        });

        it("should be able to delete an object", function(done) {
            riak.object.delete('test', 'this_ol_key', function(err, obj) {
                should.not.exist(err);
                obj.metadata.status_code.should.equal(204);
                done();
            });
        });

        it("should be able to get sibling vtags when siblings exist", function(done) {
            riak.bucket.save('siblings_test', { allow_mult: true }, function(err, response) {
                should.not.exist(err);

                riak.object.save('siblings_test', 'this_ol_key', { "pointless": "data" }, null, function(err, obj) {
                    should.not.exist(err);
                    obj.should.be.a('object').and.have.property('key', 'this_ol_key');
                    obj.should.be.a('object').and.have.property('data');
                    obj.data.should.eql({ "pointless": "data" });
                
                    riak.object.save('siblings_test', 'this_ol_key', { "pointless": "sibling" }, null, function(err, obj) {
                        should.not.exist(err);
                        obj.should.be.a('object').and.have.property('key', 'this_ol_key');
                        obj.should.be.a('object').and.have.property('data');
                        obj.data.should.eql({ "pointless": "sibling" });

                        riak.object.get('siblings_test', 'this_ol_key', function(err, obj) {
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

    describe("Using the core client to perform searches", function() {
        it("should be able to perform ranged integer 2i searches", function(done) {
            riak.bucket.search('test', [0,10000], 'numbers_int', function(err, keys) {
                should.not.exist(err);
                keys.should.be.an.instanceOf(Array).with.lengthOf(25);
                done();
            });
        });

        it("should be able to perform exact match integer 2i searches", function(done) {
            riak.bucket.search('test', 1000, 'numbers_int', function(err, keys) {
                should.not.exist(err);
                keys.should.be.an.instanceOf(Array).with.lengthOf(5);
                done();
            });
        });

        it("should be able to perform ranged binary 2i searches", function(done) {
            riak.bucket.search('test', ['a','zzzzzzzzzzz'], 'strings_bin', function(err, keys) {
                should.not.exist(err);
                keys.should.be.an.instanceOf(Array).with.lengthOf(20);
                done();
            });
        });

        it("should be able to perform exact match binary 2i searches", function(done) {
            riak.bucket.search('test', 'that', 'strings_bin', function(err, keys) {
                should.not.exist(err);
                keys.should.be.an.instanceOf(Array).with.lengthOf(5);
                done();
            });
        });

        it("should be able to perform solr search on indexed bucket", function(done) {
            riak.bucket.search('test', { q: 'field1:been' }, null, function(err, obj) {
                should.not.exist(null);
                obj.data.should.have.property('response');
                obj.data.response.should.have.property('numFound', 5);
                obj.data.response.should.have.property('docs').with.lengthOf(5);
                done();
            });
        });
    });

    describe("Using the 'Bucket' class to interact with buckets and objects", function() {
        it("should be able to get a Bucket instance from the core client", function(done) {
            var bucket = riak.bucket.get('some_bucket');

            bucket.should.have.property('constructor');
            bucket.constructor.should.have.property('name', 'Bucket');
            bucket.name.should.equal('some_bucket');
            done();
        });

        it("should be able to fetch props from Riak", function(done) {
            var bucket = riak.bucket.get('test');

            bucket.fetchProps(function(err, props) {
                should.not.exist(err);

                props.should.have.property('name');
                props.name.should.equal('test');
                bucket.props.name.should.eql(props.name);

                done();
            });
        });

        it("should be able to save its props to Riak", function(done) {
            var bucket = riak.bucket.get('test');

            bucket.props.n_val = 1;
            bucket.props.last_write_wins = true;

            bucket.save(function(err, saved) {
                should.not.exist(err);

                bucket.props.should.have.property('n_val', 1);
                bucket.props.n_val.should.equal(saved.props.n_val);

                bucket.props.should.have.property('last_write_wins', true);
                bucket.props.last_write_wins.should.equal(saved.props.last_write_wins);

                bucket.props.n_val = 3;
                bucket.props.last_write_wins = false;

                bucket.save(function(err, saved) {
                    should.not.exist(err);

                    bucket.props.should.have.property('n_val', 3);
                    bucket.props.n_val.should.equal(saved.props.n_val);

                    bucket.props.should.have.property('last_write_wins', false);
                    bucket.props.last_write_wins.should.equal(saved.props.last_write_wins);

                    done();
                });
            });
        });
    });



    after(function(done) { // teardown pre-test setup.
        function delete_all(done) {
            async.parallel([
                function(next) {
                    var bucket = riak.bucket.get('test');
                    bucket.objects.all(function(err, r_objs) {
                        bucket.objects.delete(r_objs, function(err, result) {
                            next(err, result);
                        });
                    });
                },
                function(next) {
                    var bucket = riak.bucket.get('siblings_test');
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
