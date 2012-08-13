# Overview

Nodiak is a node.js client to [the Riak distributed database](http://basho.com/products/riak-overview/).  The focus of Nodiak is to provide a client that mimics some of the patterns and functionality of Basho's official clients for other languages while still taking advantage of the benefits of asynchronous patterns that can be easily implemented in node.js.


# Installation

    $ npm install nodiak

# Tests

The test suite can be run by simply:

    $ cd /path/to/nodiak
    $ npm test

The suite expects to find Riak on an HTTP interface on port 8091 and an HTTPS interface on port 8071.  You can edit these values at the top of the `test/test.js` file to suit your environment.

# Examples

# API

#Todos

1. Complete this README.

2. Improve concurrency control to allow use of keep-alive connections.

3. Improve handling of chunked responses.

4. Improve streaming of data to Riak on queries.

5. Add Map Reduce phase management.

6. Add Link parsing and Link-Walking interfaces.

7. Add a protobufs backend implementation.

# License

(The MIT License)

Copyright (c) 2012 Coradine Aviation Systems

Copyright (c) 2012 Nathan Aschbacher

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
