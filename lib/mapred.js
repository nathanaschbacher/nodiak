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

var Mapred = function Mapred(inputs, client) {
    this.inputs = inputs;
    this.phases = [];

    this.client = client;
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

Mapred.prototype.execute = function(/* options, _return */) {
    var options = typeof(arguments[0]) == 'object' ? arguments[0] : {};
    var _return = typeof(arguments[arguments.length - 1]) == 'function' ? arguments[arguments.length - 1] : function(){};

    var _this = this;

    this.inputs = Mapred.filterInputs(this.inputs, options.include_data);
    delete options.include_data;

    var query = {
        path: this.client.defaults.resources.riak_kv_wm_mapred + "/",
        headers: { "content-type": "application/json" },
        body: { inputs: this.inputs, query: this.phases },
        options: options
    };

    if(query.options.chunked === true) { // If attempting a stream results.
        var emitter = new events.EventEmitter();
        _return(null, emitter); // execute callback once to allow userland nested .on() events to be attached.

        this.client.POST(query, function(err, result) {
            if(err) emitter.emit('error', err);
            else {
                if(result.hasOwnProperty('data')) {
                    result = _this.client.parseMultipartMixed(result.data, result.metadata.content_type);
                    for(var i = 0, length = result.length; i < length; i++) {
                        result[i].phase = result[i].data.phase;
                        result[i].data = result[i].data.data;
                    }
                    if(result.length !== 0) {
                        emitter.emit('data', result.length > 1 ? result : result[0]);
                    }
                }
                else {
                    emitter.emit('end', result);
                }
            }
        });
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