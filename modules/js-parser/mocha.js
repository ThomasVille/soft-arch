const ts = require("typescript");
const createModule = require('../ModuleHelper');
const babylon = require("babylon");
createModule({
    newInput: (payload) => {
        try {
            console.log(`js-parser computing ${payload["js-file"].length} files`);
            let sourceFile = payload['js-file'].map(jsFile => {
                // console.log(`computing file : ${jsFile.path} that starts with ${jsFile.content.substr(0,10)}`);
                return {
                    ast: babylon.parse(jsFile.content, { sourceType: "module", plugins: [ "jsx", "flow" ] }),
                    path: jsFile.path
                };
            });

            // Send response
            process.send({
                type: 'computeSuccess',
                payload: {
                    'js-ast': sourceFile
                }
            });

        } catch(e) {
            // Send response
            process.send({
                type: 'computeFail',
                payload: "I'm weak master... (js-parser)"+e
            });
        }
    }
});
