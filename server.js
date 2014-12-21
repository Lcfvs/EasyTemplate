var http,
    url,
    resolve,
    querystring,
    vhosts,
    parseRequest,
    parseVhostSync;

http = require('http');
url = require('url');
resolve = require('path').resolve;
querystring = require('querystring');
vhosts = {};

parseRequest = function parseRequest(request, response, callback) {
    var host,
        hostParts,
        hostname,
        port,
        requestURL,
        postData,
        SERVER;

    host = request.headers.host;
    hostParts = host.split(':');
    hostname = hostParts[0];
    port = hostParts[1];
    requestURL = url.parse(request.url);
    postData = [];
    SERVER = Object.create(parseVhostSync(hostname));
    SERVER.port = port;
    SERVER.isXHR = request.headers['x-requested-with'] === 'XMLHttpRequest';
    SERVER.requestHref = requestURL.href;
    SERVER.method = request.method.toUpperCase();
    SERVER.pathname = requestURL.pathname;
    SERVER.getData = querystring.parse(requestURL.query);

    request.on('data', function (chunk) {
        postData.push(chunk);
    });

    request.on('end', function() {
        SERVER.postData = querystring.parse(postData.join(''));
        callback(SERVER);
    });
};

parseVhostSync = function parseVhostSync(hostname) {
    var vhost,
        documentRoot;

    if (!vhosts.hasOwnProperty(hostname)) {
        documentRoot = resolve(__dirname, hostname);

        vhost = {
            hostname: hostname,
            documentRoot: documentRoot,
            htaccess: documentRoot + '/.htaccess.js',
            sessions: {},
            templates: {}
        };

        Object.freeze(vhost);
        vhosts[hostname] = vhost;
    } else {
        vhost = vhosts[hostname];
    }

    return vhost;
};

exports.start = function start() {
    var server;

    server = http.createServer(function(request, response) {
        parseRequest(request, response, function (SERVER) {
            var htaccess;

            htaccess = require(SERVER.htaccess);
            htaccess.rewrite(SERVER, request, response);
        });
    });

    server.listen(3000);
};