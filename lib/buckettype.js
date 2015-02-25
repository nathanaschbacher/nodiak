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

var events = require('events'),
    helpers = require('./helpers'),
    Bucket = require('./bucket'),
    async = require('async');

var BucketType = function BucketType(name, client) {
    this.name = name;
    this.client = client;

    this.buckets = this.bucket = Object.create(BucketType.prototype.buckets, { // Establish namespace 'buckets' and 'bucket'
        _this: { // used as a placeholder for namespaced functions, referenced using this._this in those functions.
            enumerable: false,
            configurable: true,
            writable: true,
            value: this
        }
    });
};

BucketType.prototype.buckets = {};
BucketType.prototype.buckets.new = function(name) {
    var _this = this._this;
    return new Bucket(name, _this.client).ofType(_this);
};

BucketType.prototype.buckets.list = function(_return) {
    var _this = this._this;

    _this.client._bucketType.list(_this.bucketType, _return);
};

module.exports = BucketType;