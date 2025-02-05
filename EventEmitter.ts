type EventKey = string | RegExp;

interface EventMap {
  [event: string]: EventKey;
}

type Events = EventKey | EventMap;

interface Listener {
  listener: Function;
  once: boolean;
}

interface ListenerMap {
  [event: string]: Listener[];
}

type Listeners = Listener[] | ListenerMap;

/**
 * Finds the index of the listener for the event in its storage array.
 *
 * @param {Function[]} listeners Array of listeners to search through.
 * @param {Function} listener Method to look for.
 * @return {Number} Index of the specified listener, -1 if not found
 * @api private
 */
function indexOfListener(listeners: any, listener: any): number {
  var i = listeners.length;
  while (i--) {
    if (listeners[i].listener === listener) {
      return i;
    }
  }

  return -1;
}

/**
 * Alias a method while keeping the context correct, to allow for overwriting of target method.
 *
 * @param {String} name The name of the target method.
 * @return {Function} The aliased method
 * @api private
 */
function alias(name: string): any {
  return function aliasClosure() {
    //@ts-ignore
    return this[name].apply(this, arguments);
  };
}

function isValidListener(listener: any): boolean {
  if (typeof listener === "function" || listener instanceof RegExp) {
    return true;
  } else if (listener && typeof listener === "object") {
    return isValidListener(listener.listener);
  } else {
    return false;
  }
}

/**
 * Class for managing events.
 * Can be extended to provide event functionality in other classes.
 *
 * @class EventEmitter Manages event registering and emitting.
 */
export default class EventEmitter<E = EventKey> {
  _onceReturnValue: any;
  _events: any;

  /**
   * Returns the listener array for the specified event.
   * Will initialise the event object and listener arrays if required.
   * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
   * Each property in the object response is an array of listener functions.
   *
   * @param {String|RegExp} evt Name of the event to return the listeners from.
   * @return {Function[]|Object} All listener functions for the event.
   */
  getListeners(evt: E): Listeners {
    var events = this._getEvents();
    var response;
    var key;

    // Return a concatenated array of all matching events if
    // the selector is a regular expression.
    if (evt instanceof RegExp) {
      response = {};
      for (key in events) {
        if (events.hasOwnProperty(key) && evt.test(key)) {
          (response as any)[evt] = events[key];
        }
      }
    } else {
      response = events[evt] || (events[evt] = []);
    }

    return response;
  }
  /**
   * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
   *
   * @param {String|RegExp} evt Name of the event to return the listeners from.
   * @return {Object} All listener functions for an event in an object.
   */
  getListenersAsObject(evt: E): ListenerMap {
    var listeners = this.getListeners(evt);
    var response;

    if (listeners instanceof Array) {
      response = {};
      (response as any)[evt] = listeners;
    }

    return (response || listeners) as any;
  }

  /**
   * Emits an event of your choice.
   * When emitted, every listener attached to that event will be executed.
   * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
   * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
   * So they will not arrive within the array on the other side, they will be separate.
   * You can also pass a regular expression to emit to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
   * @param {Array} [args] Optional array of arguments to be passed to each listener.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  emitEvent(evt: E, args?: any[]): this {
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
          // If the listener returns true then it shall be removed from the event
          // The function is executed either with a basic call or an apply if there is an args array
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

  /**
   * Takes a list of listener objects and flattens it into a list of listener functions.
   *
   * @param {Object[]} listeners Raw listener objects.
   * @return {Function[]} Just the listener functions.
   */
  flattenListeners(listeners: Listener[]): Function[] {
    let flatListeners: Function[] = [];

    for (let i = 0; i < listeners.length; i += 1) {
      flatListeners.push(listeners[i].listener);
    }

    return flatListeners;
  }

  /**
   * Adds a listener function to the specified event.
   * The listener will not be added if it is a duplicate.
   * If the listener returns true then it will be removed after it is called.
   * If you pass a regular expression as the event name then the listener will be added to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to attach the listener to.
   * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  addListener(evt: E, listener: Listener | Function): this {
    if (!isValidListener(listener)) {
      throw new TypeError("listener must be a function");
    }

    var listeners = this.getListenersAsObject(evt);
    var listenerIsWrapped = typeof listener === "object";

    for (let key in listeners) {
      if (
        listeners.hasOwnProperty(key) &&
        indexOfListener(listeners[key], listener) === -1
      ) {
        listeners[key].push(
          listenerIsWrapped
            ? (listener as Listener)
            : ({
                listener: listener,
                once: false,
              } as Listener)
        );
      }
    }

    return this;
  }

  /**
   * Semi-alias of addListener. It will add a listener that will be
   * automatically removed after its first execution.
   *
   * @param {String|RegExp} evt Name of the event to attach the listener to.
   * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  addOnceListener(evt: E, listener: Function): this {
    return this.addListener(evt, {
      listener: listener,
      once: true,
    });
  }

  /**
   * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
   * You need to tell it what event names should be matched by a regex.
   *
   * @param {String} evt Name of the event to create.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  defineEvent(evt: E): this {
    this.getListeners(evt);
    return this;
  }

  /**
   * Uses defineEvent to define multiple events.
   *
   * @param {String[]} evts An array of event names to define.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  defineEvents(evts: E[]): this {
    for (var i = 0; i < evts.length; i += 1) {
      this.defineEvent(evts[i]);
    }
    return this;
  }

  /**
   * Removes a listener function from the specified event.
   * When passed a regular expression as the event name, it will remove the listener from all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to remove the listener from.
   * @param {Function} listener Method to remove from the event.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  removeListener(evt: E, listener: Function): this {
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

  /**
   * Adds listeners in bulk using the manipulateListeners method.
   * If you pass an object as the first argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
   * You can also pass it a regular expression to add the array of listeners to all events that match it.
   * Yeah, this function does quite a bit. That's probably a bad thing.
   *
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to add.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  addListeners(evt: Events, listeners: Function[]): this {
    // Pass through to manipulateListeners
    return this.manipulateListeners(false, evt, listeners);
  }

  /**
   * Removes listeners in bulk using the manipulateListeners method.
   * If you pass an object as the first argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
   * You can also pass it an event name and an array of listeners to be removed.
   * You can also pass it a regular expression to remove the listeners from all events that match it.
   *
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to remove.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  removeListeners(evt: Events, listeners: Function[]): this {
    // Pass through to manipulateListeners
    return this.manipulateListeners(true, evt, listeners);
  }

  /**
   * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
   * The first argument will determine if the listeners are removed (true) or added (false).
   * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
   * You can also pass it an event name and an array of listeners to be added/removed.
   * You can also pass it a regular expression to manipulate the listeners of all events that match it.
   *
   * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  manipulateListeners(
    remove: boolean,
    evt: Events,
    listeners: Function[]
  ): this {
    var i;
    var value;
    var single = remove ? this.removeListener : this.addListener;
    var multiple = remove ? this.removeListeners : this.addListeners;

    // If evt is an object then pass each of its properties to this method
    if (typeof evt === "object" && !(evt instanceof RegExp)) {
      for (i in evt) {
        if (evt.hasOwnProperty(i) && (value = evt[i])) {
          // Pass the single listener straight through to the singular method
          if (typeof value === "function") {
            single.call(this, i as any, value);
          } else {
            // Otherwise pass back to the multiple function
            multiple.call(this, i, value as any);
          }
        }
      }
    } else {
      // So evt must be a string
      // And listeners must be an array of listeners
      // Loop over it and pass each one to the multiple method
      i = listeners.length;
      while (i--) {
        single.call(this, evt as any, listeners[i]);
      }
    }

    return this;
  }

  /**
   * Removes all listeners from a specified event.
   * If you do not specify an event then all listeners will be removed.
   * That means every event will be emptied.
   * You can also pass a regex to remove all events that match it.
   *
   * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  removeEvent(evt?: E): this {
    var type = typeof evt;
    var events = this._getEvents();

    // Remove different things depending on the state of evt
    if (type === "string") {
      // Remove all listeners for the specified event
      delete events[evt];
    } else if (evt instanceof RegExp) {
      // Remove all events matching the regex.
      for (let key in events) {
        if (events.hasOwnProperty(key) && evt.test(key)) {
          delete events[key];
        }
      }
    } else {
      // Remove all listeners in all events
      delete this._events;
    }

    return this;
  }

  /**
   * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
   * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
   * @param {...*} Optional additional arguments to be passed to each listener.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  emit(evt: E, ...args: any[]): this {
    var args: any[] = Array.prototype.slice.call(arguments, 1);
    return this.emitEvent(evt, args);
  }

  /**
   * Sets the current value to check against when executing listeners. If a
   * listeners return value matches the one set here then it will be removed
   * after execution. This value defaults to true.
   *
   * @param {*} value The new value to check for when executing listeners.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  setOnceReturnValue(value: any): this {
    this._onceReturnValue = value;
    return this;
  }

  /**
   * Fetches the current value to check against when executing listeners. If
   * the listeners return value matches this one then it should be removed
   * automatically. It will return true by default.
   *
   * @return {*|Boolean} The current value to check for or the default, true.
   * @api private
   */
  _getOnceReturnValue() {
    if (this.hasOwnProperty("_onceReturnValue")) {
      return this._onceReturnValue;
    } else {
      return true;
    }
  }

  /**
   * Fetches the events object and creates one if required.
   *
   * @return {Object} The events storage object.
   * @api private
   */
  _getEvents() {
    return this._events || (this._events = {});
  }

  /**
   * Alias of addListener
   */
  on = alias("addListener");

  /**
   * Alias of addOnceListener.
   */
  once = alias("addOnceListener");

  /**
   * Alias of removeListener
   */
  off = alias("removeListener");

  /**
   * Alias of removeEvent.
   *
   * Added to mirror the node API.
   */
  removeAllListeners = alias("removeEvent");

  /**
   * Alias of emitEvent
   */
  trigger = alias("emitEvent");
}
