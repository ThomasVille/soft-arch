const ts = require("typescript");
const {createModule, answerSuccess} = require('../ModuleHelper');

createModule('npm-tasks', {
    newInput: (payload) => {
        console.log(`npm-tasks computing ${payload["json-file"].length} files`);
        let packageFile = payload['json-file'].filter(jsonFile => jsonFile.path.indexOf('package.json') !== -1);
        let npmTasks = [];
        if(packageFile && packageFile.length > 0) {
            try {
                let scripts = JSON.parse(packageFile[0].content).scripts;
                for(let s in scripts) {
                    npmTasks.push({
                        iconName: 'take-action',
                        label: s,
                        childNodes: [
                            {
                                iconName: 'arrow-right',
                                label: scripts[s]
                            }
                        ]
                    });
                }
            } catch(e) {
                // No task in the file
            }
        }

        // Send response
        answerSuccess({
            'npm-tasks': {
                displayType: 'tree-list',
                content: npmTasks
            }
        });
    }
});
