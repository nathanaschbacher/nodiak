// (The MIT License)

// Copyright (c) 2013 Nathan Aschbacher

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


var Counter = function Counter(bucket, name) {
    this.bucket = bucket;
    this.name = name;
};

Counter.prototype.add = function(amount, _return) {
    amount = parseInt(amount, 10);

    if(amount) {
        var query = {
            path: this.bucket.client.defaults.resources.riak_kv_wm_counters + "/" +encodeURIComponent(this.bucket.name)+ "/counters/" +encodeURIComponent(this.name),
            headers: { "content-type": "text/plain" },
            body: amount
        };
        this.bucket.client.POST(query, _return);
    }
    else {
        var err = new Error("Value needs to be an integer (positive or negative)");
        err.data = amount;
        _return(err);
    }
};

Counter.prototype.subtract = function(amount, _return) {
    amount = parseInt(amount * -1, 10);
    this.add(amount, _return);
};

Counter.prototype.value = function(_return) {
    var query = {
        path: this.bucket.client.defaults.resources.riak_kv_wm_counters + "/" +encodeURIComponent(this.bucket.name)+ "/counters/" +encodeURIComponent(this.name)
    };
    this.bucket.client.GET(query, function(err, response) {
        _return(err, parseInt(response.data, 10));
    });
};

module.exports = Counter;