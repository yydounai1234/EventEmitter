function indexOfListener(listeners, listener) {
    var i = listeners.length;
    while (i--) {
        if (listeners[i].listener === listener) {
            return i;
        }
    }
    return -1;
}
function alias(name) {
    return function aliasClosure() {
        return this[name].apply(this, arguments);
    };
}
function isValidListener(listener) {
    if (typeof listener === "function" || listener instanceof RegExp) {
        return true;
    }
    else if (listener && typeof listener === "object") {
        return isValidListener(listener.listener);
    }
    else {
        return false;
    }
}
export default class EventEmitter {
    _onceReturnValue;
    _events;
    getListeners(evt) {
        var events = this._getEvents();
        var response;
        var key;
        if (evt instanceof RegExp) {
            response = {};
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    response[evt] = events[key];
                }
            }
        }
        else {
            response = events[evt] || (events[evt] = []);
        }
        return response;
    }
    getListenersAsObject(evt) {
        var listeners = this.getListeners(evt);
        var response;
        if (listeners instanceof Array) {
            response = {};
            response[evt] = listeners;
        }
        return (response || listeners);
    }
    emitEvent(evt, args) {
        var listenersMap = this.getListenersAsObject(evt);
        var listeners;
        var listener;
        var i;
        var key;
        var response;
        for (key in listenersMap) {
            if (listenersMap.hasOwnProperty(key)) {
                listeners = listenersMap[key].slice(0);
                for (i = 0; i < listeners.length; i++) {
                    listener = listeners[i];
                    if (listener.once === true) {
                        this.removeListener(evt, listener.listener);
                    }
                    response = listener.listener.apply(this, args || []);
                    if (response === this._getOnceReturnValue()) {
                        this.removeListener(evt, listener.listener);
                    }
                }
            }
        }
        return this;
    }
    flattenListeners(listeners) {
        let flatListeners = [];
        for (let i = 0; i < listeners.length; i += 1) {
            flatListeners.push(listeners[i].listener);
        }
        return flatListeners;
    }
    addListener(evt, listener) {
        if (!isValidListener(listener)) {
            throw new TypeError("listener must be a function");
        }
        var listeners = this.getListenersAsObject(evt);
        var listenerIsWrapped = typeof listener === "object";
        for (let key in listeners) {
            if (listeners.hasOwnProperty(key) &&
                indexOfListener(listeners[key], listener) === -1) {
                listeners[key].push(listenerIsWrapped
                    ? listener
                    : {
                        listener: listener,
                        once: false,
                    });
            }
        }
        return this;
    }
    addOnceListener(evt, listener) {
        return this.addListener(evt, {
            listener: listener,
            once: true,
        });
    }
    defineEvent(evt) {
        this.getListeners(evt);
        return this;
    }
    defineEvents(evts) {
        for (var i = 0; i < evts.length; i += 1) {
            this.defineEvent(evts[i]);
        }
        return this;
    }
    removeListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var index;
        var key;
        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                index = indexOfListener(listeners[key], listener);
                if (index !== -1) {
                    listeners[key].splice(index, 1);
                }
            }
        }
        return this;
    }
    addListeners(evt, listeners) {
        return this.manipulateListeners(false, evt, listeners);
    }
    removeListeners(evt, listeners) {
        return this.manipulateListeners(true, evt, listeners);
    }
    manipulateListeners(remove, evt, listeners) {
        var i;
        var value;
        var single = remove ? this.removeListener : this.addListener;
        var multiple = remove ? this.removeListeners : this.addListeners;
        if (typeof evt === "object" && !(evt instanceof RegExp)) {
            for (i in evt) {
                if (evt.hasOwnProperty(i) && (value = evt[i])) {
                    if (typeof value === "function") {
                        single.call(this, i, value);
                    }
                    else {
                        multiple.call(this, i, value);
                    }
                }
            }
        }
        else {
            i = listeners.length;
            while (i--) {
                single.call(this, evt, listeners[i]);
            }
        }
        return this;
    }
    removeEvent(evt) {
        var type = typeof evt;
        var events = this._getEvents();
        if (type === "string") {
            delete events[evt];
        }
        else if (evt instanceof RegExp) {
            for (let key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    delete events[key];
                }
            }
        }
        else {
            delete this._events;
        }
        return this;
    }
    emit(evt, ...args) {
        var args = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(evt, args);
    }
    setOnceReturnValue(value) {
        this._onceReturnValue = value;
        return this;
    }
    _getOnceReturnValue() {
        if (this.hasOwnProperty("_onceReturnValue")) {
            return this._onceReturnValue;
        }
        else {
            return true;
        }
    }
    _getEvents() {
        return this._events || (this._events = {});
    }
    on = alias("addListener");
    once = alias("addOnceListener");
    off = alias("removeListener");
    removeAllListeners = alias("removeEvent");
    trigger = alias("emitEvent");
}
