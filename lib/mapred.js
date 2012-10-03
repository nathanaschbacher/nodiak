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

var events = require('events');

var Mapred = function Mapred(client) {
    this._inputs = null;
    this.include_data = false;
    this.phases = [];

    this.client = client;
};

Mapred.prototype.inputs = function(inputs, include_data) {
    this._inputs = inputs;
    this.include_data = include_data;
    return this;
};

Mapred.prototype.link = function(phase) {
    this.append('link', phase);
    return this;
};

Mapred.prototype.map = function(phase) {
    this.append('map', phase);
    return this;
};

Mapred.prototype.reduce = function(phase) {
    this.append('reduce', phase);
    return this;
};

Mapred.prototype.execute = function(_return) {
    var stream_results = _return instanceof Function ? false : true;

    var _this = this;

    this._inputs = Mapred.filterInputs(this._inputs, this.include_data);

    var options = {};
    if(stream_results) options.chunked = true;

    var query = {
        path: this.client.defaults.resources.riak_kv_wm_mapred + "/",
        headers: { "content-type": "application/json" },
        body: { inputs: this._inputs, query: this.phases },
        options: options
    };

    if(stream_results) { // If attempting a stream results.
        return {
            stream: function(_return) {
                var emitter = new events.EventEmitter();
                _return(emitter); // execute callback once to allow userland nested .on() events to be attached.
                _this.client.POST(query, function(err, result) {
                    if(err) {
                        err.data = result;
                        emitter.emit('error', err);
                    }
                    else {
                        if(result.hasOwnProperty('data')) {
                            result = _this.client.parseMultipartMixed(result.data, result.metadata.content_type);
                            if(result.length !== 0) {
                                for(var i = 0, length = result.length; i < length; i++) {
                                    result[i].phase = result[i].data.phase;
                                    result[i].data = result[i].data.data;
                                }
                                emitter.emit('data', result.length > 1 ? result : result[0]);
                            }
                        }
                        else {
                            emitter.emit('end');
                            emitter.removeAllListeners();
                        }
                    }
                });
                return _this;
            }
        };
    }
    else { // Else not dealing with a stream
        this.client.POST(query, _return);
    }
    return this;
};

Mapred.prototype.append = function(type, phase) {
    var new_phase = {};

    if(typeof(phase) == 'object' && phase.language && phase.language.toLowerCase() == 'javascript' && phase.source) {
        phase.source = phase.source.toString();
    }
    else if(typeof(phase) == 'object' && phase.language && phase.language.toLowerCase() == 'erlang' && phase.source) {
        phase.source = phase.source();
    }
    
    new_phase[type] = phase;

    this.phases.push(new_phase);
};

Mapred.filterInputs = function(inputs, include_data) {
    // Use this if...for to get raw keys out of RObjects
    if(inputs instanceof Array && inputs.length > 0 && inputs[0].constructor.name == 'RObject') {
        for(var i = 0, length = inputs.length; i < length; i++) {
            inputs[i] = [inputs[i].bucket.name, inputs[i].key];
            if(include_data) {
                inputs[i].push(inputs[i].data);
            }
        }
    }
    return inputs;
};

module.exports = Mapred;