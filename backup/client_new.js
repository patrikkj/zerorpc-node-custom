var socket = require("./socket"),
    _ = require("underscore"),
    nodeUtil = require("util"),
    events = require("events"),
    util = require("./util"),
    middleware = require("./middleware");

var DEFAULT_TIMEOUT = 30;

// Creates a new client
// options : Object
//      Options associated with the client. Allowed options:
//      * timeout (number): Seconds to wait for a response before it is
//        considered timed out (default 30s)
//        (default 5000ms)
class Client extends events.EventEmitter {
    constructor(options) {
        super();
        options = options || {};
        this._timeout = options.timeout || DEFAULT_TIMEOUT;
        this._socket = socket.client();
        util.eventProxy(this._socket, this, "error");
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
    
    //Closes the client
    close(linger) {
        this._socket.close(linger);
    }
    
    closed() {
        return this._socket.closed();
    }

    //Calls a remote method
    //options: Object
    //      Optional options object to override the constructor options (currently only timeout)
    //method : String
    //      The method name
    //args... : Varargs
    //      The arguments to send with the invocation
    //callback : Function
    //      The callback to call on an update
    invoke(/*options, */ method /*, args..., callback*/) {
        var self = this;
        var hasCallback = typeof arguments[arguments.length - 1] == 'function';
        var callback = hasCallback ? arguments[arguments.length - 1] : function () { };
        var offset = 1;
        var args = Array.prototype.slice.call(arguments, offset, hasCallback ? arguments.length - 1 : arguments.length);
        var alreadyCalled = false;
        var callbackErrorWrapper = function (error) {
            if (alreadyCalled === false) {
                callback(error, undefined, false);
                alreadyCalled = true;
            }
        };
        var ch = self._socket.openChannel();
        var timeout = parseInt(options && options.timeout, 10) || self._timeout;
        middleware.addTimeout(timeout * 1000, ch, callbackErrorWrapper);
        //Associated callbacks to execute for various events
        var handlers = {
            "ERR": function (event) {
                if (!(event.args instanceof Array) || event.args.length != 3) {
                    return self.emit("error", "Invalid event: Bad error");
                }
                var error = util.createErrorResponse(event.args[0], event.args[1], event.args[2]);
                callbackErrorWrapper(error);
                ch.close();
            },
            "OK": function (event) {
                callback(undefined, event.args[0], false);
                ch.close();
            }
            // ,
            // "STREAM": function (event) {
            //     callback(undefined, event.args, true);
            // },
            // "STREAM_DONE": function () {
            //     callback(undefined, undefined, false);
            //     ch.close();
            // }
        };
        ch.register(function (event) {
            var handler = handlers[event.name];
            if (handler) {
                handler(event);
            }
            else {
                //Send an error if the server sent a bad event - this should
                //never happen
                var error = util.createErrorResponse("ProtocolError", "Invalid event: Unknown event name");
                callbackErrorWrapper(error);
                ch.close();
            }
        });
        ch.send(method, args);
    }
}

exports.Client = Client;
