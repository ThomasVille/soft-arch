const createModule = require('../ModuleHelper');
const explore = require('./TreeTools');

createModule({
    newInput: (payload) => {
        try {
            console.log(`agreed-api-calls computing ${payload["ts-ast"].length} ASTs`);
            let apiCalls = payload['ts-ast'].map(tsAst => {
                return {
                    calls: findApiCalls(tsAst.ast, tsAst.path),
                    path: tsAst.path
                };
            })
            .filter(call => call.calls.length !== 0);

            // Send response
            process.send({
                type: 'computeSuccess',
                payload: {
                    'api-calls': apiCalls
                }
            });

        } catch(e) {
            // Send response
            process.send({
                type: 'computeFail',
                payload: "I'm weak master...."+e
            });
        }
    }
});

function findApiCalls(tsAst, fileName) {
    let calls = [];
    let insideApi = false;
    let insideFunction = false;
    let currentCall = {};

    let inCb = (node) => {
        // Getting inside the Api class
        if(node.kind === 229 && node.name.text === 'Api') {
            insideApi = true;
            //console.log('CLASS (in) - ' + node.name.text + (fileName ? ` inside ${fileName}` : ''));
        }
        // Getting inside a method inside the Api class
        if(insideApi && node.kind === 151) {
            insideFunction = true;
            currentCall.name = node.name.text;
        }
        // Getting inside a string inside a method inside the Api class
        if(insideApi && insideFunction && (node.kind === 14 || node.kind === 9)) {
            // If the string begins with / then consider it to be an API address
            if(node.text.indexOf('/') === 0) {
                currentCall.address = node.text;
                calls.push(Object.assign({}, currentCall));
            }
        }
    };

    let outCb = (node) => {
        // Getting out of a ClassDeclaration node
        if(node.kind === 229 && node.name.text === 'Api') {
            insideApi = false;
            //console.log('CLASS (out) - ' + node.name.text + (fileName ? ` inside ${fileName}` : ''));
        }
        // Getting out of a MethodDeclaration node
        if(insideApi && node.kind === 151) {
            insideFunction = false;
        }
    };

    explore(tsAst, inCb, outCb);

    return calls;
}