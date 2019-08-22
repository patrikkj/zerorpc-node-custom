var nodeUtil = require("util"),
    zmq = require("zeromq"),
    nodeEvents = require("events"),
    events = require("./events"),
    util = require("./util"),
    channel = require("./channel");

//The default channel capacity
var CHANNEL_CAPACITY = 100;

//Creates a new socket
//zmqSocket : Object
//      The underlying ZeroMQ socket to use
class Socket extends nodeEvents.EventEmitter {
    constructor(zmqSocket) {
        super();
        var self = this;
        self._zmqSocket = zmqSocket;
        util.eventProxy(self._zmqSocket, self, "error");
        var error = function (message) {
            self.emit("error", message);
        };
        self._zmqSocket.on("message", function () {
            //Deserialize the object and perform some sanity checks
            if (arguments[arguments.length - 2].length != 0) {
                return error("Expected second to last argument to be an empty buffer, but it is not");
            }
            var envelope = Array.prototype.slice.call(arguments, 0, arguments.length - 2);
            try {
                var event = events.deserialize(envelope, arguments[arguments.length - 1]);
            }
            catch (e) {
                return error("Invalid event: " + e);
            }
            //Emit the event
            self.emit("socket/receive", event);
        });
    }
    //Sends a message on the socket
    //event : Object
    //      The ZeroRPC event to send
    send(event) {
        var message = events.serialize(event);
        this._zmqSocket.send.call(this._zmqSocket, message);
    }
    //Binds to a ZeroMQ endpoint
    //endpoint : String
    //      The ZeroMQ endpoint
    bind(endpoint) {
        this._zmqSocket.bindSync(endpoint);
    }
    //Connects to a ZeroMQ endpoint
    //endpoint : String
    //      The ZeroMQ endpoint
    connect(endpoint) {
        this._zmqSocket.connect(endpoint);
    }
}

// nodeUtil.inherits(Socket, nodeEvents.EventEmitter);




//Creates a new multiplexing socket
//zmqSocket : Object
//      The underlying ZeroMQ socket to use
class MultiplexingSocket extends Socket {
    constructor(zmqSocket) {
        super(zmqSocket);
        var self = this;
        //Map of open channel IDs => channel objects
        self.channels = {};
        self._closed = false;
        //Route events to a channel if possible; otherwise emit the event
        self.on("socket/receive", function (event) {
            var ch = self.channels[event.header.response_to || ""];
            if (ch) {
                ch.invoke(event);
            }
            else {
                self.emit("multiplexing-socket/receive", event);
            }
        });
    }
    //Opens a new channel
    //srcEvent : Object or null
    //      The ZeroRPC event that caused the channel to be opened, or null if
    //      this is a locally opened channel.
    openChannel(srcEvent) {
        if (srcEvent) {
            var ch = new channel.ServerChannel(srcEvent, this, CHANNEL_CAPACITY);
        }
        else {
            var ch = new channel.ClientChannel(this, CHANNEL_CAPACITY);
        }
        this.channels[ch.id] = ch;
        return ch;
    }
    //Closes the socket
    close(linger) {
        if (this.closed()) {
            throw Error("Socket already closed");
        }
        if (linger !== undefined) {
            this._zmqSocket.setsockopt(zmq.options.linger, linger);
        }
        this._zmqSocket.close();
        for (var id in this.channels)
            this.channels[id].destroy();
        this._closed = true;
    }
    closed() {
        return this._closed;
    }
    setTimeout(timeout) {
    }
}

// nodeUtil.inherits(MultiplexingSocket, Socket);





//Creates a new multiplexing socket server
function server() {
    return new MultiplexingSocket(zmq.socket("xrep"));
}

//Creates a new multiplexing socket client
function client() {
    return new MultiplexingSocket(zmq.socket("xreq"));
}

exports.server = server;
exports.client = client;
