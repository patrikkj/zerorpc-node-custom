var util = require("./util");

//Adds a timeout on a channel - if a response isn't received within a certain
//amount of time, we execute the callback with a timeout error.
function addTimeout(timeout, channel, callback) {
    var runner = setTimeout(function() {
        var error = util.createErrorResponse("TimeoutExpired", "Timeout after " + timeout + "ms");
        callback(error);
        channel.close();
    }, timeout);

    channel.register(function(event, next) {
        clearTimeout(runner);
        next();
    });

    //Clear the timeout when the channel is closed
    channel.on("closed", function() {
        clearTimeout(runner);
    });
}

exports.addTimeout = addTimeout;
