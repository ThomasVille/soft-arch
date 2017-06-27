import { IModule, ModuleOutput, ModuleInput } from "./Module";
import { LinkConfig } from "./ProjectManager";

export class LinkFrom {
    module: IModule;
    output: ModuleOutput;
}

export class LinkTo {
    module: IModule;
    input: ModuleInput;
}

export class Link {
    from: LinkFrom = new LinkFrom();
    to: LinkTo = new LinkTo();
}

export class ModuleGraph {
    modules: Array<IModule> = [];
    links: Array<Link> = [];

    constructor(modules: Array<IModule>, linkConfigs: Array<LinkConfig>) {
        this.modules = modules;
        for(let linkConfig of linkConfigs) {
            let link = new Link();
            let fromModule: IModule = modules.find(m => m.name === linkConfig.from.module)!;
            let toModule: IModule = modules.find(m => m.name === linkConfig.to.module)!;
            
            let fromOutput: ModuleOutput = fromModule.outputs.find(out => out.name === linkConfig.from.output)!;
            let toInput: ModuleInput = toModule.inputs.find(i => i.name === linkConfig.to.input)!;

            this.link(fromOutput, toInput);
        }
    }

    insertModule(module: IModule): void {
        this.modules.push(module);
    }

    /**
     * Link two modules together
     * 
     * @param {ModuleOutput} fromOutput 
     * @param {ModuleInput} toInput 
     * 
     * @memberof ModuleGraph
     */
    link(fromOutput: ModuleOutput, toInput: ModuleInput): void {
        let link = new Link();

        link.from.module = fromOutput.module;
        link.from.output = fromOutput;
        link.to.module = toInput.module;
        link.to.input = toInput;
        fromOutput.link = link;
        toInput.link = link;

        this.links.push(link);
    }

    getEntryNodes(): Array<IModule> {
        return this.modules.filter(m => m.inputs.every(i => i.name.indexOf('file') !== -1));
    }

    /**
     * Returns the list of input formats of the entry nodes in a Set
     */
    getEntryNodesInputFormats(): Set<string> {
        let entryNodes = this.getEntryNodes();
        let extensions = new Set<string>();

        for(let module of entryNodes) {
            for(let input of module.inputs) {
                if(input.name === 'file') {
                    extensions.add(input.name);
                } else {
                    extensions.add(input.name.replace('-file', ''));
                }
            }
        }
        return extensions;
    }
}