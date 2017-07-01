function setup(messageHandler) {
    process.on('message', messageHandler);

    process.send({ type: 'startupSuccess', payload: 'ok' });
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
            console.log(`Unknown action ${message.type} received`);
        }
    }
}

module.exports = function createModule(messageHandlers) {
    // Create the handlers
    // Contains a function associated with each message.type
    let completeMessageHandlers = {
        newInput: (message) => {
            if(messageHandlers.hasOwnProperty('newInput')) {
                messageHandlers.newInput(message.payload);
            } else {
                console.log('This module does nothing...');
            }
        }
    }

    // Setup the module with the provided handlers
    setup(createMessageHandler(completeMessageHandlers));
}