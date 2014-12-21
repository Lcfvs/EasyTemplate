var DOM,
    loadDocument,
    loadFragment,
    appendTemplate,
    internalError;

DOM = require('./DOM');
loadDocument = DOM.loadDocument;
loadFragment = DOM.loadFragment;

module.exports.main = function main(SERVER, request, response) {
    var emitter;
    
    if (SERVER.isXHR) {
        return appendTemplate(SERVER, request, response);
    }
    
    emitter = loadDocument(SERVER.documentFile, 'text/html');

    emitter.on('done', function (document) {
        var currentAnchor;
        
        currentAnchor = document.querySelector('nav a[href="' + SERVER.requestHref + '"]');
        
        if (currentAnchor) {
            currentAnchor.setAttribute('class', 'currentAnchor');
            
            document.title = currentAnchor.textContent;
        }
        
        appendTemplate(SERVER, request, response, document);
    });

    emitter.on('error', internalError.bind(response, null));
};

appendTemplate = function appendTemplate(SERVER, request, response, document) {
    var emitter;
    
    emitter = loadFragment(SERVER.templateFile, 'text/html');
    
    emitter.on('done', function (template) {
        var selector,
            target;
    
        response.writeHead(SERVER.status, {
            'Content-Type': 'text/html'
        });
    
        if (!document) {
            return response.end(template.toString());
        }
        
        selector = template.getAttribute('data-tpl-selector');
        target = document.querySelector(selector);
        target.parentNode.replaceChild(template, target);
    
        response.end(document.toString());
    });
    
    emitter.on('error', internalError.bind(response, document));
};

internalError = function internalError(document, error, template) {
    var prefix,
        suffix,
        selector,
        target;

    this.writeHead(500, {
        'Content-Type': 'text/html'
    });

    if (!document) {
        prefix = '<!DOCTYPE html><html><head><title></title></head><body>';
        suffix = '</body></html>';
        
        return this.end(prefix + template + suffix);
    }
    
    selector = template.getAttribute('data-tpl-selector');
    target = document.querySelector(selector);
    target.parentNode.replaceChild(template, target);

    this.end(document.toString());
};