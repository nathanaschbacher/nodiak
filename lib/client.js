var getClient = function(host, port, backend_name, defaults) {
    backend_name = backend_name || 'http';

    var backend = new (require('./backends/'+backend_name))(host, port, defaults);

    return backend;
};

exports.getClient = getClient;
