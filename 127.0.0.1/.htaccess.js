var fs,
    mime,
    index,
    parse,
    notFound,
    scriptFile,
    publicFile;

fs = require('fs');
mime = require('mime-magic');
index = require('./system/index.js');

exports.rewrite = function (SERVER, request, response) {
    var replacer;
        
    SERVER.status = 200;
    
    SERVER.pathname = SERVER.pathname === '/'
        ? '/home.html'
        : SERVER.pathname;
        
    if (!/^(?:\/|(?:\/[^\/]+)+)$/.test(SERVER.pathname)) {
        return notFound(SERVER, request, response);
    }
    
    replacer = parse.bind(this, SERVER, request, response);
    
    SERVER.pathname.replace(/^(.+)\.([^\.]+)$/, replacer);
};

parse = function parse(SERVER, request, response, fullname, path, extension) {
    var file,
        isPublic;
    
    if (extension === 'html') {
        if (!/^\/system\//.test(path)) {
            file = __dirname
            + '/system/templates/fragments/'
            + path + '.fragment.tpl';
        }
    } else {
        isPublic = true;
        file = __dirname + '/public/' + extension + fullname;
    }
    
    fs.stat(file, function (error, stats) {
        if (!stats || !stats.isFile()) {
            return notFound(SERVER, request, response);
        }
        
        if (isPublic) {
            publicFile(response, file, extension);
        } else {
            scriptFile(SERVER, request, response, file);
        }
    });
};

notFound = function notFound(SERVER, request, response) {
    SERVER.status = 404;
        
    SERVER.documentFile = __dirname
    + '/system/templates/documents/base.document.tpl';
    
    SERVER.templateFile = __dirname
    + '/system/templates/fragments/http-errors/404-not-found.fragment.tpl';

    index.main(SERVER, request, response);
};

scriptFile = function scriptFile(SERVER, request, response, file) {     
    SERVER.documentFile = __dirname
    + '/system/templates/documents/base.document.tpl';
    
    if (!SERVER.templateFile) {
        SERVER.templateFile = file;
    }
    
    Object.freeze(SERVER);
    
    index.main(SERVER, request, response);
};

publicFile = function publicFile(response, file, extension) {
    mime(file, function (error, type) {
        fs.readFile(file, function (error, data) {
            response.writeHead(200, {
                'Content-Type': extension === 'js'
                    ? 'text/javascript'
                    : extension === 'css'
                        ? 'text/css'
                        : type
            });
            
            response.end(data);
        });
    });
};
