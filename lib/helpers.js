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

var deepmerge = require('deepmerge');
var trustfund = require('trustfund');

exports.merge = function (obj1, obj2) {
  return deepmerge(obj1, obj2);
};

exports.inherits = trustfund.inherits;

exports.removeDuplicates = function(array) {
    var set = {};
    var reduced = [];

    for(var i = 0, length = array.length; i < length; i++) {
        if(!set[array[i]]) {
            set[array[i]] = true;
            reduced.push(array[i]);
        }
    }

    return reduced;
};

exports.partialStreamResponseCompiler = function(chunk, start_delim, stop_delim, cache, _return) {
    var str = chunk.toString();

    if(str.substr(0,start_delim.length) === start_delim && str.substr(-stop_delim.length) === stop_delim) {
        _return(chunk);
    }
    else if(str[str.length-1] === stop_delim) {
        cache.push(chunk);

        _return(Buffer.concat(cache));
    }
    else {
        cache.push(chunk);
    }
};