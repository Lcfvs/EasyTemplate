var readFile,
    xmldom,
    sizzlify,
    DOMParser,
    documentPrototype,
    elementPrototype,
    cache,
    emitters,
    source,
    document,
    Sizzle,
    loadDocument,
    loadFragment,
    querySelectorAll,
    querySelector;

EventEmitter = require('events').EventEmitter;
readFile = require('fs').readFile;
xmldom = require('./xmldom');
sizzlify = require('./sizzlify');

DOMParser = xmldom.DOMParser;
documentPrototype = xmldom.Document.prototype;
elementPrototype = xmldom.Element.prototype;

cache = {};
emitters = {};
source = '<!DOCTYPE html><html><body></body></html>';
document = (new DOMParser()).parseFromString(source, 'text/html');
Sizzle = sizzlify(document);

loadDocument = function loadDocument(path, mime, reload) {
    var emitter,
        document;
    
    emitter = new EventEmitter();
    
    if (cache.hasOwnProperty(path) && !reload) {
        document = cache[path].cloneNode(true);
        setImmediate(emitter.emit.bind(emitter, 'done', document));
        
        return emitter;
    }
    
    if (emitters.hasOwnProperty(path) && !reload) {
        emitters[path].once('done', function () {
            emitter.emit('done', cache[path].cloneNode(true));
        });
        
        emitters[path].once('error', emitter.emit.bind(emitter, 'error'));
        
        return emitter;
    }
    
    emitters[path] = emitter;
    
    readFile(path, function (error, data) {
        var template;
        
        if (error) {
            return emitter.emit('error', error);
        }
        
        try {
            template = (new DOMParser())
                .parseFromString(data.toString(), mime);
            
            cache[path] = template;
            
            emitter.emit('done', template.cloneNode(true));
        } catch (parseError) {
            emitter.emit('error', parseError);
        }
    });
    
    return emitter;
};

loadFragment = function loadFragment(path, mime, reload) {
    var emitter,
        document;
    
    emitter = new EventEmitter();
    
    documentEmitter = loadDocument(path, mime, reload);
    
    documentEmitter.on('done', function (document) {
        emitter.emit('done', document.documentElement);
    });
    
    documentEmitter.on('error', function (error) {
        var path,
            errorEmitter;
        
        path = '../templates/fragments/http-errors/500-internal-server-error.fragment.tpl';
        
        errorEmitter = loadFragment(path, mime, reload);
        
        errorEmitter.on('done', emitter.emit.bind(emitter, 'error', error));
    });
    
    return emitter;
};

querySelectorAll = function querySelectorAll(selector) {
    return Sizzle(selector, this);
};

querySelector = function querySelector(selector) {
    var nodes;
    
    nodes = this.querySelectorAll(selector);
    
    return nodes.length
        ? nodes[0]
        : null;
};

documentPrototype.querySelectorAll = querySelectorAll;
documentPrototype.querySelector = querySelector;

Object.defineProperty(documentPrototype, 'title', {
    get: function () {
        var element;
        
        element = this.getElementsByTagName('title')[0];
        
        return element.textContent;
    },
    set: function (value) {
        var element,
            textNode;
        
        element = this.getElementsByTagName('title')[0];
        textNode = element.firstChild;
        
        if (textNode) {
            return textNode.nodeValue = value;
        }
        
        textNode = this.createTextNode(value);
        
        element.appendChild(textNode);
    }
});

Object.defineProperty(documentPrototype, 'body', {
    get: function () {
        return this.getElementsByTagName('body')[0];
    }
});

elementPrototype.querySelectorAll = querySelectorAll;
elementPrototype.querySelector = querySelector;

module.exports = {
    loadDocument: loadDocument,
    loadFragment: loadFragment
};