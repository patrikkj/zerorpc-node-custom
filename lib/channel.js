var util = require("./util"),
    nodeUtil = require("util"),
    nodeEvents = require("events"),
    events = require("./events"),
    buffer = require("./buffer");

var CHANNEL_OPEN = "open";
var CHANNEL_CLOSING = "closing";
var CHANNEL_CLOSED = "closed";
var PROTOCOL_VERSION = 3;


//Creates a new channel
//id : String
//      The channel ID
//envelope : Array of Buffers
//      The ZeroMQ envelope of the remote endpoint that caused the channel to
//      be opened
//socket : MultiplexingSocket
//      The socket that opened the channel
//capacity : Number
//      The channel buffer's capacity
class Channel extends nodeEvents.EventEmitter {
    constructor(id, envelope, socket, capacity) {
        super();
        this.id = id;
        this._state = CHANNEL_OPEN;
        this._envelope = envelope;
        this._socket = socket;
        this._capacity = capacity;
        //Callbacks to call when the channel receives a message
        this._callbacks = [];
        //Buffers for sending & receiving messages
        this._inBuffer = new buffer.ChannelBuffer(capacity);
        this._inBuffer.setCapacity(1);
        this._outBuffer = new buffer.ChannelBuffer(1);
    }
    
    //Registers a new callback to be run when this channel receives a message
    //callback : Function(event : Object, next : Function)
    //      The callback to execute when a new event is received. Unless the
    //      callback is the last in the chain, it should call its next argument
    //      when its work is complete, so that the next callback can be run.
    register(callback) {
        this._callbacks.push(callback);
    }

    //Called when the channel receives an event
    //event : Object
    //      The ZeroRPC event received
    invoke(event) {
        var self = this;
        if (self._state == CHANNEL_OPEN) {
            //Enqueue the message in the buffer
            self._inBuffer.add(event);
            self._inBuffer.decrementCapacity();
            //Call each callback one at a time, similar to connect middleware.
            //This is done asyncronously to take advantage of the buffer.
            setTimeout(function () {
                var event = self._inBuffer.remove();
                var i = -1;
                //Update the remote process with how much open capacity we have in
                //our buffer - but only if the event is not one that is going to
                //close the channel; otherwise we'll send a _zpc_more event, and
                //the server won't know how to route it
                // if(event.name === "STREAM" && self._inBuffer.getCapacity() < self._capacity / 2) {
                //     self._resetCapacity();
                // }
                var next = function () {
                    i++;
                    if (i < self._callbacks.length) {
                        self._callbacks[i].call(self, event, next);
                    }
                };
                next();
            }, 0);
        }
    }

    //Puts the channel in the closing state
    close() {
        this._state = CHANNEL_CLOSING;
        this.emit("closing");
        this.flush();
    }

    //Close and destroy channel
    destroy() {
        this._state = CHANNEL_CLOSED;
        this.emit("closed");
        delete this._socket.channels[this.id];
    }

    //Sends as many outbound messages as possible
    flush() {
        while (this._outBuffer.length() > 0 && this._outBuffer.hasCapacity()) {
            this._socket.send(this._outBuffer.remove());
            this._outBuffer.decrementCapacity();
        }
        if (this._state == CHANNEL_CLOSING && this._outBuffer.length() == 0) {
            this.destroy();
        }
    }

    //Sends a message
    //name : String
    //      The event name
    //args : Array
    //      The event arguments
    send(name, args) {
        if (this._state != CHANNEL_OPEN) {
            throw new Error("Cannot send on closed channel");
        }
        //Create & enqueue the event
        var event = events.create(this._envelope, this._createHeader(), name, args);
        //Send the message or enqueue it to be sent later
        if (this._outBuffer.hasCapacity()) {
            this._socket.send(event);
            this._outBuffer.decrementCapacity();
        }
        else {
            this._outBuffer.add(event);
        }
    }

    //Creates a header for an event
    _createHeader() {
        return { v: PROTOCOL_VERSION, message_id: events.fastUUID(), response_to: this.id };
    }
}

// Creates a new server-side channel
// srcEvent : Object
//      The event that caused this channel to be opened
// socket : Object
//      The multiplexing socket instance that opened this channel
// capacity : Number
//      The capacity of the socket's input buffer
class ServerChannel extends Channel {
    constructor(srcEvent, socket, capacity) {
        super(srcEvent.header.message_id, srcEvent.envelope, socket, capacity);
    }
}

//Creates a new client-side buffer
//socket : Object
//      The multiplexing socket instance that opened this channel
//capacity : Number
//      The capacity of the socket's input buffer
class ClientChannel extends Channel {
    constructor(socket, capacity) {
        super(events.fastUUID(), null, socket, capacity);
        this._fresh = true;
    }
    _createHeader(name, args) {
        if (this._fresh) {
            this._fresh = false;
            return { v: PROTOCOL_VERSION, message_id: this.id };
        }
        else {
            return Channel.prototype._createHeader.call(this);
        }
    }
}

exports.ServerChannel = ServerChannel;
exports.ClientChannel = ClientChannel;
