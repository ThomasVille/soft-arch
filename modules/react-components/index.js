const createModule = require('../ModuleHelper');
const explore = require('./TreeTools');

createModule({
    newInput: (payload) => {
        try {
            console.log(`react-components computing ${payload["ts-ast"].length} ASTs`);
            let classes = payload['ts-ast'].map(tsAst => {
                return {
                    className: findClasses(tsAst.ast),
                    path: tsAst.path
                };
            });

            console.log(JSON.stringify(classes, null, 4));
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

    explore(tsAst, inCb);

    return classes;
}