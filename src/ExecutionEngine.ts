import { ProjectConfig, LinkConfig } from "./ProjectManager";
import { IModule, ModuleOutput } from "./Module";
import { ModuleGraph } from "./ModuleGraph";


export function printModuleOutputs(moduleOutputs: Array<ModuleOutput>) {
    for(let output of moduleOutputs) {
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

    public execute() {
        console.log('Executing')
        for(let module of this.moduleGraph.modules) {
            if(!module.isValid) {
                this.executeOneModule(module);
            }
        }
    }
    private executeOneModule(module: IModule) {
        if(module.isValid) {
            return;
        }
        console.log('executeOneModule', module.name);

        // Compute when no dependency or all dependencies are valid
        let invalidDependencies = module.inputs.filter(i => i.link && !i.link.from.module.isValid);

        if(invalidDependencies.length === 0) {
            // Execute module
            module.computeOutputs().then((moduleOutputs: Array<ModuleOutput>) => {
                console.warn(`output of ${module.name} :`);
                printModuleOutputs(moduleOutputs);
                // Execute modules after this one
                module.outputs.forEach(o => o.link && this.executeOneModule(o.link.to.module));
            });
            return;
        }

        // Compute the dependencies of the module
        for(let moduleInput of module.inputs) {
            // Execute the dependency
            if(moduleInput.link) {
                console.log('dependency', moduleInput.name);
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
        this.execute();
    }

    invalidate(module: IModule) {
        module.invalidate();

        // TODO remove this when we know when to call it
        this.execute();
    }
    setModuleGraph(moduleGraph: ModuleGraph) {
        this.moduleGraph = moduleGraph;
    }
}