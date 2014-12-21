var EasyTemplate;
(function () {
    'use strict';
    var EasyTemplate, easyTemplateProto;
    EasyTemplate = function EasyTemplate(document, titleSuffix, activeClassName, ontemplateload) {
        var instance, state, anchor;
        instance = Object.create(easyTemplateProto, {
            window: {
                value: document.defaultView
            },
            document: {
                value: document
            },
            namespaceURI: {
                value: document.documentElement.namespaceURI
            },
            state: {
                value: undefined,
                writable:true
            },
            documents: {
                value: {}
            },
            queue: {
                value: []
            },
            titleSuffix: {
                value: titleSuffix
            },
            activeClassName: {
                value: activeClassName
            },
            activeClassPattern: {
                value: new RegExp('[^\s]?(\s?' + activeClassName + ')(?!\S)')
            },
            ontemplateload: {
                value: ontemplateload
            }
        });
        anchor = instance.select('.' + activeClassName);
        if (anchor) {
            state = instance.state = instance.parseState(anchor.getAttribute('href'));
            state.statusText = '200 OK';
        } else {
            state = instance.state = instance.parseState(document.location.href);
            state.statusText = state.title.substring(0, state.title.length - titleSuffix.length);
        }
        instance.state.title = instance.document.title;
        instance.append(function () {
            instance.createTemplate(instance.createContainer(instance.state), document);
            instance.window.addEventListener('popstate', function onpopstate(event) {
                var state;
                state = event.state;
                if (state && state.url !== instance.state.url) {
                    instance.append(function () {
                        var href, anchors, length, iterator, anchor;
                        instance.state = state;
                        instance[instance.documents[state.href] === undefined ? 'load' : 'show'](state, false);
                    });
                }
            }, false);
            document.addEventListener('click', function (event) {
                var node, state, requestState;
                node = event.target;
                if (node.nodeName === 'A' && node.target !== '_blank' && (node.download === null || node.download === '')) {
                    state = instance.state;
                    requestState = instance.parseState(node.getAttribute('href'));
                    if (requestState.hostname === state.hostname && requestState.url !== state.url || (requestState.url === state.url && requestState.hash === '')) {
                        instance.state = requestState;
                        instance.append(function () {
                            if (instance.documents[requestState.href] === undefined) {
                                instance.load(requestState, true);
                            } else {
                                requestState.statusText = '200 OK';
                                instance.show(requestState, true);
                            }
                        });
                        event.preventDefault();
                        event.returnValue = false;
                        return false;
                    }
                }
            }, false);
            instance.shift(instance.state);
        });
        instance.window.history.replaceState(state, state.title, state.qualifiedHref);
    };
    easyTemplateProto = {
        parseState: function parseState(href) {
            var span, qualifiedHref, url;
            span = this.document.createElement('span');
            span.innerHTML = '<a href="' + href.split('&').join('&amp;').split('"').join('&quot;').split('<').join('&lt;') + '">&nbsp;</a>';
            qualifiedHref = span.firstChild.href;
            url = qualifiedHref.split('#')[0];
            return Object.create({}, {
                href: {
                    value: href,
                    enumerable: true
                },
                qualifiedHref: {
                    value: qualifiedHref,
                    enumerable: true
                },
                hostname: {
                    value: qualifiedHref.split('//')[1].split('/')[0].split(':')[0],
                    enumerable: true
                },
                url: {
                    value: url,
                    enumerable: true
                },
                hash: {
                    value:qualifiedHref.substring(url.length),
                    enumerable: true
                }
            });
        },
        pushState: function pushState(state) {
            state.title = this.document.title;
            this.window.history.pushState(state, state.title, state.qualifiedHref);
        },
        append: function append(callback) {
            this.queue.push(callback);
            this.call();
        },
        call: function call() {
            var queue;
            queue = this.queue;
            if (queue.length === 1) {
                queue[0]();
            }
        },
        shift: function shift(state) {
            try {
                this.ontemplateload(state);
            } catch (e) {};
            this.queue.shift();
            this.call();
        },
        active: function active(state) {
            var className, activeAnchor, requestAnchor;
            className = this.activeClassName;
            activeAnchor = this.select('a.' + className);
            requestAnchor = this.select('a[href="' + state.href + '"]');
            if (requestAnchor !== activeAnchor) {
                if (activeAnchor) {
                    activeAnchor.className = activeAnchor.className.replace(this.activeClassPattern, '');
                }
                if (requestAnchor) {
                    requestAnchor.className += ' ' + className;
                }
            }
            return requestAnchor;
        },
        select: function select(selector, all) {
            return this.document['querySelector' + (!!all ? 'All' : '')](selector);
        },
        load: function load(state, pushState) {
            var instance, xhr;
            instance = this;
            if (instance.documents[state.href] === undefined) {
                xhr = new XMLHttpRequest();
                xhr.open('GET', state.url, true);
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if ([200, 400, 401, 402, 403, 404, 408, 500, 502, 503, 504].indexOf(xhr.status) > -1) {
                            state.statusText = xhr.status + ' ' + xhr.statusText;
                            instance.createTemplate(instance.createContainer(state, xhr.responseText));
                            instance.show(state, pushState);
                        }
                    }
                };
                xhr.send(null);
            } else {
                instance.show(state, pushState);
            }
        },
        createContainer: function createContainer(state, data) {
            var document;
            document = this.document.implementation.createDocument(this.namespaceURI, 'tpl', null).firstChild;
            document.innerHTML = data || '';
            document.state = state;
            return this.documents[state.href] = document;
        },
        createTemplate: function createTemplate(container, document) {
            var tpl, selector, expire;
            document = document || container;
            tpl = document.querySelector('*[data-tpl-selector]') || document.documentElement;
            selector = tpl.getAttribute('data-tpl-selector');
            container.selector = selector !== '' && selector !== null ? decodeURI(selector) : 'html';
            tpl.removeAttribute('data-tpl-selector');
            expire = parseInt(tpl.getAttribute('data-tpl-expire'), 10);
            container.expire = !isNaN(expire) ? (new Date()).getTime() + expire : 0;
            return container.tpl = tpl;
        },
        show: function show(state, pushState) {
            var href, document, targetNode, parentNode, nextNode, tpl, anchor;
            href = state.href;
            document = this.documents[href];
            if (state.statusText === '200 OK' && (!document.expire || document.expire > (new Date()).getTime())) {
                targetNode = this.select(document.selector);
                parentNode = targetNode.parentNode;
                nextNode = targetNode.nextSibling;
                tpl = document.tpl;
                this.resetForms(tpl);
                anchor = this.select('a.' + this.activeClassName);
                this.documents[anchor ? anchor.getAttribute('href') : this.state.href].appendChild(targetNode);
                if (nextNode) {
                    parentNode.insertBefore(tpl, nextNode);
                } else {
                    parentNode.appendChild(tpl);
                }
                this.document.title = (this.active(state).textContent || state.statusText) + this.titleSuffix;
                state.title = this.document.title;
                if (pushState) {
                    this.pushState(state);
                }
                this.shift(state);
            } else {
                this.documents[href] = undefined;
                this.load(state, pushState);
            }
        },
        resetForms: function resetForms(tpl) {
            var forms, iterator, length;
            forms = tpl.querySelectorAll('form:not([data-tpl-noreset="true"])');
            length = forms.length;
            for (iterator = 0; iterator < length; iterator += 1) {
                forms[iterator].reset();
            }
        }
    };
    self.EasyTemplate = EasyTemplate;
}());