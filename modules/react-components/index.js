const createModule = require('../ModuleHelper');

createModule({
    newInput: (payload) => {
        try {
            // Send response
            process.send({
                type: 'computeSuccess',
                payload: {
                    'react-components': 'Being myself'
                }
            });

        } catch(e) {
            // Send response
            process.send({
                type: 'computeFail',
                payload: "I'm weak master...."
            });
        }
    }
});
