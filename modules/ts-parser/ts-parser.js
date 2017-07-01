const ts = require("typescript");
const createModule = require('../ModuleHelper');
// Allow us to prune circular references of the ast
const stringify = require('json-stringify-safe');

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
                    'ts-ast': JSON.parse(stringify(sourceFile, null, 0, () => {}))
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
