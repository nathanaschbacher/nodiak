describe("Nodiak Riak Client Test Suite", function() {
    var riak = require('../../nodiak').getClient('localhost', '8091', 'http');
    var riaks = require('../../nodiak').getClient('localhost', '8071', 'https');
    
    var async = require('async');
    var should = require('should');

    before(function(pass){ // bootstrap settings and data for tests.
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
                                    pass();
                                }
                            });
                        }
                    }
                });
            }
        });
    });

    describe("Basic HTTP & HTTPS functionality", function() {
        it("should be able to ping the cluster via HTTP", function(pass) {
            riak.ping(function(err, response) {
                should.not.exist(err);
                response.data.should.equal("OK");
                pass();
            });
        });

        it("should be able to ping the cluster via HTTPS", function(pass) {
            riaks.ping(function(err, response) {
                should.not.exist(err);
                response.data.should.equal("OK");
                pass();
            });
        });

        it("should be able to get stats via HTTP", function(pass) {
            riak.stats(function(err, response) {
                should.not.exist(err);
                response.data.should.be.a('object');
                pass();
            });
        });

        it("should be able to get stats via HTTPS", function(pass) {
            riaks.stats(function(err, response) {
                should.not.exist(err);
                response.data.should.be.a('object');
                pass();
            });
        });
    });

    describe("Using the base client to interact with buckets", function() {
        it("should be able to read bucket properties", function(pass) {
            riak.bucket.props('random_bucket', function(err, props) {
                should.not.exist(err);
                props.should.be.a('object').and.have.property('name', 'random_bucket');
                pass();
            });
        });

        it("should be able to save properties to a bucket", function(pass) {
            riak.bucket.props('random_bucket', function(err, props) {
                should.not.exist(err);

                var toggled = props.allow_mult ? false : true;
                props.allow_mult = toggled;

                riak.bucket.save('random_bucket', props, function(err, response) {
                    should.not.exist(err);
                    
                    riak.bucket.props('random_bucket', function(err, props) {
                        should.not.exist(err);
                        props.allow_mult.should.equal(toggled);
                        pass();
                    });
                });
            });
        });

        it("should be able to list all buckets", function(pass) {
            riak.buckets.list(function(err, buckets) {
                should.not.exist(err);
                buckets.should.be.an.instanceOf(Array);
                pass();
            });
        });

        it("should be able to list all keys in a bucket", function(pass) {
            riak.bucket.keys('test', function(err, keys) {
                should.not.exist(err);
                keys.should.be.an.instanceOf(Array);
                pass();
            });
        });
    });

    describe("Using the 'Bucket' class to interact with buckets and objects", function() {

    });

    describe("Using the 'RObject' class to interact with objects", function() {

    });

    describe("Using the base client to interact with objects", function() {
        it("should be able to check existence of object", function(pass) {
            riak.object.save('test', 'this_ol_key', { "pointless": "data" }, null, function(err, obj) {
                should.not.exist(err);

                riak.object.exists('test', 'this_ol_key', function(err, exists) {
                    should.not.exist(err);
                    exists.should.be.true;

                    riak.object.exists('test', 'no_key_here', function(err, exists) {
                        should.not.exist(err);
                        exists.should.be.false;
                        pass();
                    });
                });
            });
        });

        it("should be able to save an object", function(pass) {
            riak.object.save('test', 'this_ol_key', { "pointless": "data" }, null, function(err, obj) {
                should.not.exist(err);
                obj.should.be.a('object').and.have.property('key', 'this_ol_key');
                obj.should.be.a('object').and.have.property('data');
                obj.data.should.eql({ "pointless": "data" });
                pass();
            });
        });

        it("should be able to get an object", function(pass) {
            riak.object.get('test', 'this_ol_key', function(err, obj) {
                should.not.exist(err);
                obj.should.be.a('object').and.have.property('key', 'this_ol_key');
                obj.should.be.a('object').and.have.property('data');
                obj.data.should.eql({ "pointless": "data" });
                obj.metadata.should.be.a('object').and.have.property('vclock');
                pass();
            });
        });

        it("should be able to delete an object", function(pass) {
            riak.object.delete('test', 'this_ol_key', function(err, obj) {
                should.not.exist(err);
                obj.metadata.status_code.should.equal(204);
                pass();
            });
        });

        it("should be able to get sibling vtags when siblings exist", function(pass) {
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
                            pass();
                        });
                    });
                });

            });
        });
    });

    describe("Using the core client to perform searches", function() {
        it("should be able to perform ranged integer 2i searches", function(pass) {
            riak.bucket.search('test', [0,10000], 'numbers_int', function(err, keys) {
                should.not.exist(err);
                keys.should.be.an.instanceOf(Array).with.lengthOf(25);
                pass();
            });
        });

        it("should be able to perform exact match integer 2i searches", function(pass) {
            riak.bucket.search('test', 1000, 'numbers_int', function(err, keys) {
                should.not.exist(err);
                keys.should.be.an.instanceOf(Array).with.lengthOf(5);
                pass();
            });
        });

        it("should be able to perform ranged binary 2i searches", function(pass) {
            riak.bucket.search('test', ['a','zzzzzzzzzzz'], 'strings_bin', function(err, keys) {
                should.not.exist(err);
                keys.should.be.an.instanceOf(Array).with.lengthOf(20);
                pass();
            });
        });

        it("should be able to perform exact match binary 2i searches", function(pass) {
            riak.bucket.search('test', 'that', 'strings_bin', function(err, keys) {
                should.not.exist(err);
                keys.should.be.an.instanceOf(Array).with.lengthOf(5);
                pass();
            });
        });

        it("should be able to perform solr search on indexed bucket", function(pass) {
            riak.bucket.search('test', { q: 'field1:been' }, null, function(err, obj) {
                should.not.exist(null);
                obj.data.should.have.property('response');
                obj.data.response.should.have.property('numFound', 5);
                obj.data.response.should.have.property('docs').with.lengthOf(5);
                pass();
            });
        });
    });

    after(function(pass) { // teardown pre-test setup.
        riak.buckets.list(function(err, buckets) {
            async.map(buckets,
                function(bucket_name, _intermediate) {
                    var bucket = riak.bucket.get(bucket_name);
                    bucket.objects.all(function(err, r_objs){
                        bucket.objects.delete(r_objs, function(err, result) {
                            _intermediate(err, result);
                        });
                    });
                },
                function(err, results) {
                    if(err) throw new Error(err.toString());
                    else pass();                
                }
            );
        });
    });
});
