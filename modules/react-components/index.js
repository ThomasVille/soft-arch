const createModule = require('../ModuleHelper');
const explore = require('./TreeTools');

createModule({
    newInput: (payload) => {
        try {
            payload['ts-ast'] = JSON.parse(payload['ts-ast']);

            console.log(`react-components computing ${payload["ts-ast"].length} ASTs`);
            console.log(payload);
            let classes = payload['ts-ast'].map(tsAst => {
                return {
                    className: findClasses(tsAst.ast),
                    path: tsAst.path
                };
            });

            console.log(classes);
            // Send response
            process.send({
                type: 'computeSuccess',
                payload: {
                    'react-components': classes
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

function findClasses(tsAst) {
    let level = 1;
    let classes = [];

    let inCb = (node) => {
        //console.log('-'.repeat(level++) + ' ' + node.kind);
        if(node.kind === 229) {
            console.log('CLASS - ' + node.name.text);
            classes.push(node.name.text);
        }
    };

    let outCb = (node) => {
        //console.log('-'.repeat(level--) + ' ' + node.kind);
    }
    console.log('--------------------------------Analyzing ast')
    explore(tsAst, inCb, outCb);

    return classes;
}