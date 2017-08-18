const fs = require('fs');
const JsonSocket = require('json-socket');
const net = require('net');

let socket = undefined;

function sendMessage(type, payload) {
    socket.sendMessage({
        type,
        payload
    });
}

function setupIPC(messageHandler) {
    var port = 9839; //The same port that the server is listening on
    var host = '127.0.0.1';
    socket = new JsonSocket(new net.Socket()); //Decorate a standard net.Socket with JsonSocket 
    socket.connect(port, host);
    socket.on('connect', () => { //Don't send until we're connected 
        socket.on('message', messageHandler);
        socket.on('error', (e) => {
            console.log('error',e);
        });
    });
    socket.on('message', messageHandler);
}


/**
 * Returns a function that handles a message based on the informations provided by the module
 * 
 * @param {any} messageHandlers 
 * @returns 
 */
function createMessageHandler(messageHandlers) {
    return function messageHandler(message) {
        if(messageHandlers.hasOwnProperty(message.type)) {
            // Call the function associated with the message.type
            messageHandlers[message.type](message);
        } else {
            // Error in the main softarch or the module helper code
            console.log(`Unknown action ${JSON.stringify(message, null, 4)} received`);
        }
    }
}

module.exports =  {
    createModule(moduleName, messageHandlers) {
        // Create the handlers
        // Contains a function associated with each message.type
        let completeMessageHandlers = {
            newInput: (message) => {
                if(messageHandlers.hasOwnProperty('newInput')) {
                    try {
                        console.log(`${moduleName} begin`);

                        messageHandlers.newInput(message.payload);

                        console.log(`${moduleName} finish`);
                    } catch(e) {
                        // Send error
                        sendMessage('computeFail', "I'm weak master.... (agreed-api-calls)"+e);
                    }
                } else {
                    console.log('This module does nothing...');
                }
            }
        }

        // Setup the module with the provided handlers
        setupIPC(createMessageHandler(completeMessageHandlers));
        sendMessage('startupSuccess', moduleName);
        
    },

    answerSuccess(payload) {
        // Send response
        sendMessage('computeSuccess', payload);
    }
}