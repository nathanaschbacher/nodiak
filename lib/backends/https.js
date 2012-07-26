var https = require('https'),
    util = require('util'),
    helpers = require('../helpers'),
    HTTPBackend = require('./http');

var HTTPSBackend = function(host, port, resources) {

    HTTPBackend.call(this, host, port, resources);

}; helpers.inherits(HTTPSBackend, HTTPBackend);


HTTPSBackend.prototype.request = function(method, query, _return) {
    var req = https.request({ headers: HTTPSBackend.appendDefaultHeaders(query.metadata),
                           path: query.resource + HTTPSBackend.appendOptions(query.options),
                           method: method,
                           host: this.host,
                           port: this.port}, HTTPSBackend.responseHandler.bind(this, _return));


    req.on('error', function(error) {
    _return(error, null, null);
    });

    req.end(query.body, query.encoding);
};

module.exports = HTTPSBackend;