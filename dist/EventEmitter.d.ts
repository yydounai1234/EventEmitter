declare type EventKey = string | RegExp;
interface EventMap {
    [event: string]: EventKey;
}
declare type Events = EventKey | EventMap;
interface Listener {
    listener: Function;
    once: boolean;
}
interface ListenerMap {
    [event: string]: Listener[];
}
declare type Listeners = Listener[] | ListenerMap;
export default class EventEmitter<E = EventKey> {
    _onceReturnValue: any;
    _events: any;
    getListeners(evt: E): Listeners;
    getListenersAsObject(evt: E): ListenerMap;
    emitEvent(evt: E, args?: any[]): this;
    flattenListeners(listeners: Listener[]): Function[];
    addListener(evt: E, listener: Listener | Function): this;
    addOnceListener(evt: E, listener: Function): this;
    defineEvent(evt: E): this;
    defineEvents(evts: E[]): this;
    removeListener(evt: E, listener: Function): this;
    addListeners(evt: Events, listeners: Function[]): this;
    removeListeners(evt: Events, listeners: Function[]): this;
    manipulateListeners(remove: boolean, evt: Events, listeners: Function[]): this;
    removeEvent(evt?: E): this;
    emit(evt: E, ...args: any[]): this;
    setOnceReturnValue(value: any): this;
    _getOnceReturnValue(): any;
    _getEvents(): any;
    on: any;
    once: any;
    off: any;
    removeAllListeners: any;
    trigger: any;
}
export {};
