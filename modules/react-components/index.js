const ts = require("typescript");
const createModule = require('../ModuleHelper');
const explore = require('./TreeTools');

createModule({
    newInput: (payload) => {
        try {
            console.log(`react-components computing ${payload["ts-file"].length} files`);
            let reactComponents = payload['ts-file'].map(tsFile => {
                let ast = ts.createSourceFile(tsFile.path, tsFile.content, ts.ScriptTarget.ES2016, /*setParentNodes */ false);
                return {
                    calls: findReactComponents(ast, tsFile.path),
                    path: tsFile.path
                };
            })
            .filter(call => call.calls.length !== 0);
            console.log('end')
            // Send response
            process.send({
                type: 'computeSuccess',
                payload: {
                    'react-components': reactComponents
                }
            });

        } catch(e) {
            // Send response
            process.send({
                type: 'computeFail',
                payload: "I'm weak master.... (react-components)"+e
            });
        }
    }
});

function findReactComponents(tsAst, fileName) {
    let calls = [];
    let insideApi = false;
    let insideFunction = false;
    let currentCall = {};
    
    delintNode(tsAst);

    function delintNode(node) {
        // Getting inside the Api class
        if(node.kind === ts.SyntaxKind.ClassDeclaration && node.name.text === 'Api') {
            insideApi = true;
            console.log('CLASS (in) - ' + node.name.text + (fileName ? ` inside ${fileName}` : ''));
        }
        // Getting inside a method inside the Api class
        if(insideApi && node.kind === ts.SyntaxKind.MethodDeclaration) {
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

        ts.forEachChild(node, delintNode);

        // Getting out of a ClassDeclaration node
        if(node.kind === ts.SyntaxKind.ClassDeclaration && node.name.text === 'Api') {
            insideApi = false;
            console.log('CLASS (out) - ' + node.name.text + (fileName ? ` inside ${fileName}` : ''));
        }
        // Getting out of a MethodDeclaration node
        if(insideApi && node.kind === ts.SyntaxKind.MethodDeclaration) {
            insideFunction = false;
        }
    }

    return calls;
}