import { ProjectConfig, LinkConfig } from "./ProjectManager";
import { IModule, ModuleOutput } from "./Module";
import { ModuleGraph } from "./ModuleGraph";
import * as _ from 'lodash';


export function printModuleOutputs(module: IModule) {
    console.warn(`Outputs of ${module.name} :`);
    
    for(let output of module.outputs) {
        console.log(`---- Output "${output.name}" : `);
        console.log(JSON.stringify(output.value));
        console.log('----');
    }
}

/**
 * Execute the modules that needs to be executed based on the state of the dependency graph.
 */
export class ExecutionEngine {
    moduleGraph: ModuleGraph;
    asyncExecute: ()=>void;

    constructor(executeDelay: number) {
        this.setExecuteDelay(executeDelay);
    }

    public setExecuteDelay(executeDelay: number) {
        this.asyncExecute = _.debounce(() => {
            for(let module of this.moduleGraph.modules) {
                if(!module.isValid) {
                    //console.log(`Executing ${module.name}`);
                    this.executeOneModule(module);
                    //console.log(`Finished executing ${module.name}\n`);
                }
            }
        }, executeDelay, {trailing: true, leading: false});
    }

    private executeOneModule(module: IModule) {
        if(module.isValid || module.isExecuting) {
            return;
        }
        //console.log('executeOneModule', module.name);

        // Compute when no dependency or all dependencies are valid
        let invalidDependencies = module.inputs.filter(i => i.link && !i.link.from.module.isValid);

        if(invalidDependencies.length === 0) {
            // Execute module
            module.computeOutputs().then((moduleOutputs: Array<ModuleOutput>) => {
                //printModuleOutputs(module);
                // Execute modules after this one
                for(let o of module.outputs) {
                    if(o.link) {
                        this.executeOneModule(o.link.to.module);
                    }
                }
            });
            return;
        }

        // Compute the dependencies of the module
        for(let moduleInput of module.inputs) {
            // Execute the dependency
            if(moduleInput.link) {
                //console.log('dependency', moduleInput.name);
                let dependency = moduleInput.link.from.module;
                this.executeOneModule(dependency);
            }
        }

    }
    invalidateAll() {
        for(let module of this.moduleGraph.modules) {
            module.invalidate();
        }

        // TODO remove this when we know when to call it
        this.asyncExecute();
    }

    invalidate(module: IModule) {
        //console.log(`Invalidating ${module.name}`);
        module.invalidate();
        for(let o of module.outputs) {
            if(o.link) {
                this.invalidate(o.link.to.module);
            }
        }

        this.asyncExecute();
    }
    setModuleGraph(moduleGraph: ModuleGraph) {
        this.moduleGraph = moduleGraph;
    }
}