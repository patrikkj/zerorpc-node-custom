var socket = require("./socket"),
    _ = require("underscore"),
    nodeUtil = require("util"),
    events = require("events"),
    util = require("./util"),
    middleware = require("./middleware");

// Heartbeat rate in ms
var DEFAULT_HEARTBEAT = 5000;

//Gets the arguments associated with a function as an array
//fun : Function
//      The function to get the arguments from.
//return : Array of Strings
//      The function's arguments
function getArguments(fun) {
    var m1 = /^[\s\(]*function[^(]*\(([^)]*)\)/;
    var m2 = /\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g;
    var m3 = /\s+/g;

    var names = fun.toString().match(m1)[1].replace(m2, '').replace(m3, '').split(',');
    var args = names.length == 1 && !names[0] ? [] : names;

    //Remove the last argument from the args becase it is the callback
    args.pop();

    return args;
}

//Extracts the public methods (and their arguments) of a context.
//context : Object
//      The object to be exposed
//return : Object of String => Array
//      A map where they key is the method name and the value are the method
//      arguments, not including the callback argument.
function publicMethods(context) {
    var methods = {};

    //Ignore members that start with an underscore or are not functions
    for(var name in context) {
        if(!/^_/.test(name) && typeof(context[name]) == 'function') {
            methods[name] = getArguments(context[name]);
        }
    }

    return methods;
}


class Server {
    constructor(context, heartbeat) {
        var self = this;
        var heartbeat = heartbeat || DEFAULT_HEARTBEAT;
        
        self._socket = socket.server(heartbeat);
        util.eventProxy(self._socket, self, "error");
        
        self._methods = publicMethods(context);

        self._socket.on("multiplexing-socket/receive", function (event) {
            if (event.name in self._methods)
                self._recv(event, context);
        });
    }

    //Called when a method call event is received
    //event : Object
    //      The ZeroRPC event
    //context : Object
    //      The object to expose.
    _recv(event, context) {
        //Execute and send output back to the client
        var ch = this._socket.openChannel(event);
        var output = context[event.name].apply(context, event.args);
        ch.send("OK", [output]);
    }
    //Binds to a ZeroMQ endpoint
    //endpoint : String
    //      The ZeroMQ endpoint
    bind(endpoint) {
        this._socket.bind(endpoint);
    }

    //Connects to a ZeroMQ endpoint
    //endpoint : String
    //      The ZeroMQ endpoint
    connect(endpoint) {
        this._socket.connect(endpoint);
    }

    //Closes the server
    close() {
        this._socket.close();
    }

    closed() {
        return this._socket.closed();
    }
}

nodeUtil.inherits(Server, events.EventEmitter);
exports.Server = Server;