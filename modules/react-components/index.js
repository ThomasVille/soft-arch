const createModule = require('../ModuleHelper');

createModule({
    newInput: (payload) => {
        let componentRegex = /(\w+) extends +React\.Component[^{]*{([\s\S]*)}/g;
        let subComponentsRegex = /<(\w+)/g;
        let componentName = '';
        let subComponentsNames = [];
        let tmpSubComponentsNames;
        //../Agreed/client/components/FinalWinnerPanel.tsx
        // Get component's name and body
        let tmpComponentName = componentRegex.exec(payload);

        if(tmpComponentName) {
            // Get component's name
            componentName = tmpComponentName[1];

            // Get component's body
            let componentBody = tmpComponentName[2];

            // Get component's children
            while ((tmpSubComponentsNames = subComponentsRegex.exec(componentBody)) !== null) {
                subComponentsNames.push(tmpSubComponentsNames[1]);
            }

            // Send response
            process.send({
                type: 'output',
                payload: {
                    name: componentName,
                    children: subComponentsNames
                }
            });

        } else {
            process.send({ type: 'output', payload: {} });
        }
    },
    acceptedInput: ['js-file', 'jsx-file'],
    output: 'component-tree'
});
