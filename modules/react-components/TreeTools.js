const _ = require('lodash');

module.exports = function explore(ast, inCb, outCb) {
    if(!ast) return
    
    if(ast.kind && inCb) {
        inCb(ast)
    }
    
    // Iterate every property (object or array)
    _.forEach(ast, (value, key) => {
        // Explore if the property exists and has a kind or is an array
        if(value && (value.kind || Array.isArray(value)))
            explore(value, inCb, outCb)
    })

    if(ast.kind && outCb) {
        outCb(ast)
    }
}