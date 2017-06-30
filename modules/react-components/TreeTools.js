const _ = require('lodash');

module.exports = function explore(ast, inCb, outCb) {
    let stack = [ast];
    while(stack.length !== 0) {
        let currentNode = stack.pop();

        if(!currentNode) continue;

        if(currentNode.kind && inCb) {
            inCb(currentNode);
        }
        
        // Iterate every property (object or array)
        _.forEach(currentNode, (value, key) => {
            // Explore if the property exists and has a type or is an array
            if(value && (value.kind || Array.isArray(value))) {
                stack.push(value);
            }
        })
    }
}