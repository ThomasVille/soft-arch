const ts = require("typescript");
const createModule = require('../ModuleHelper');

createModule({
    newInput: (payload) => {
        try {
            console.log(`ts-parser computing ${payload["ts-file"].length} files`);
            let sourceFile = payload['ts-file'].map(tsFile => {
                return {
                    ast: ts.createSourceFile(tsFile.path, tsFile.content, ts.ScriptTarget.ES2016, /*setParentNodes */ false),
                    path: tsFile.path
                };
            });

            // Send response
            process.send({
                type: 'computeSuccess',
                payload: {
                    'ts-ast': sourceFile
                }
            });

        } catch(e) {
            // Send response
            process.send({
                type: 'computeFail',
                payload: "I'm weak master... (ts-parser)"+e
            });
        }
    }
});
