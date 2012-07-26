var getClient = function(host, port, backend_name, resources) {
    backend_name = backend_name || 'http';

    var backend = new (require('./backends/'+backend_name))(host, port, resources);

    return backend;
};

exports.getClient = getClient;
