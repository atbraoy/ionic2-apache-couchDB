"use strict";
// Ionic Dev Server: Server Side Logger
var logger_1 = require('../util/logger');
var logger_diagnostics_1 = require('../util/logger-diagnostics');
var events_1 = require('../util/events');
var ws_1 = require('ws');
function createNotificationServer(config) {
    var wsServer;
    // queue up all messages to the client
    function queueMessageSend(msg) {
        msgToClient.push(msg);
        drainMessageQueue();
    }
    // drain the queue messages when the server is ready
    function drainMessageQueue() {
        if (wsServer) {
            var msg = void 0;
            while (msg = msgToClient.shift()) {
                try {
                    wsServer.send(JSON.stringify(msg));
                }
                catch (e) {
                    logger_1.Logger.error("error sending client ws, " + e);
                }
            }
        }
    }
    // a build update has started, notify the client
    events_1.on(events_1.EventType.BuildUpdateStarted, function (buildUpdateId) {
        var msg = {
            category: 'buildUpdate',
            type: 'started',
            data: {
                buildUpdateId: buildUpdateId
            }
        };
        queueMessageSend(msg);
    });
    // a build update has completed, notify the client
    events_1.on(events_1.EventType.BuildUpdateCompleted, function (buildUpdateId) {
        var msg = {
            category: 'buildUpdate',
            type: 'completed',
            data: {
                buildUpdateId: buildUpdateId,
                diagnosticsHtml: logger_diagnostics_1.hasDiagnostics(config.buildDir) ? logger_diagnostics_1.getDiagnosticsHtmlContent(config.buildDir) : null
            }
        };
        queueMessageSend(msg);
    });
    // create web socket server
    var wss = new ws_1.Server({ port: config.notificationPort });
    wss.on('connection', function (ws) {
        // we've successfully connected
        wsServer = ws;
        wsServer.on('message', function (incomingMessage) {
            // incoming message from the client
            try {
                printMessageFromClient(JSON.parse(incomingMessage));
            }
            catch (e) {
                logger_1.Logger.error("error opening ws message: " + incomingMessage);
            }
        });
        // now that we're connected, send off any messages
        // we might has already queued up
        drainMessageQueue();
    });
}
exports.createNotificationServer = createNotificationServer;
function printMessageFromClient(msg) {
    if (msg.data) {
        switch (msg.category) {
            case 'console':
                printConsole(msg);
                break;
            case 'exception':
                printException(msg);
                break;
        }
    }
}
function printConsole(msg) {
    var args = msg.data;
    args[0] = "console." + msg.type + ": " + args[0];
    switch (msg.type) {
        case 'error':
            logger_1.Logger.error.apply(this, args);
            break;
        case 'warn':
            logger_1.Logger.warn.apply(this, args);
            break;
        case 'debug':
            logger_1.Logger.debug.apply(this, args);
            break;
        default:
            logger_1.Logger.info.apply(this, args);
            break;
    }
}
function printException(msg) {
}
var msgToClient = [];
