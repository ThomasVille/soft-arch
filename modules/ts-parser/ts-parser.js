const ts = require("typescript");
const createModule = require('../ModuleHelper');

createModule({
    newInput: (payload) => {
        let sourceFile = ts.createSourceFile('fileNameTest', payload, ts.ScriptTarget.ES6, /*setParentNodes */ false);

        // Send response
        process.send({
            type: 'output',
            payload: {
                ast: sourceFile
            }
        });

        //process.send({ type: 'analyzeFailed' });
    },
    acceptedInput: ['ts-file', 'tsx-file'],
    output: 'ts-ast'
});
