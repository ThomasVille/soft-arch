const fs = require('fs');
const cp = require('child_process');
import {IModule, ModuleState, ModuleBuilder, ModuleConfig} from './Module';
import MessageBuilder from './MessageBuilder';
import {AppConfig} from './AppConfig';
import Message from './Message';

export default class ModuleManager {
    modules: Array<IModule>;
    pipelines: Array<Array<IModule>>;
    appConfig: AppConfig;

    constructor(appConfig: AppConfig) {
        this.modules = [];
        this.pipelines = [];
        this.appConfig = appConfig;
    }

    loadModules(modules: Array<string>) {
        modules.forEach((m: string) => this.loadModule(m));
    }

    loadModuleConfig(fileContent: string): ModuleConfig {
        let json = JSON.parse(fileContent);

        // TODO implement true loading with proper checks
        if(json.name === undefined || json.file === undefined || json.inputs === undefined || json.outputs === undefined) {
            throw new Error('Bad module configuration');
        }

        return {
            name: json.name,
            file: json.file,
            inputs: json.inputs,
            outputs: json.outputs
        }
    }

    loadModule(moduleName: string): boolean {
        let moduleConfig: ModuleConfig;

        try{
            fs.accessSync(`${this.appConfig.defaultModuleFolder}/modules/${moduleName}`);
            fs.accessSync(`${this.appConfig.defaultModuleFolder}/modules/${moduleName}/module.json`);
            moduleConfig = this.loadModuleConfig(fs.readFileSync(`${this.appConfig.defaultModuleFolder}/modules/${moduleName}/module.json`, 'utf8'));            
            fs.accessSync(`${this.appConfig.defaultModuleFolder}/modules/${moduleName}/${moduleConfig.file}`);
        } catch(e) {
            return false;
        }

        console.log(`spawning ${this.appConfig.defaultModuleFolder}/modules/${moduleName}/${moduleConfig.file}`);
        let proc = cp.exec(`node ${this.appConfig.defaultModuleFolder}/modules/${moduleName}/${moduleConfig.file}`);
        proc.stdout.on('data', (m: any) => console.log('stdout', m));
        proc.on('close', (code: any) => console.log('close', code));
        proc.on('error', (code: any) => console.log('error', code));
        let module: IModule = ModuleBuilder.buildProcessModule(moduleConfig, proc);
        this.modules.push(module);

        //module.addMessageListener('acceptedInput', (message: Message) => this.onAcceptedInput(message.payload, module));
        //module.sendMessage(MessageBuilder.createAcceptedInput());

        return true;
    }

    getAllModules(): Array<string> {
        return this.modules.map(m => m.name);
    }

    getModuleByName(name: string): IModule | undefined {
        return this.modules.find(m => m.name === name);
    }

}
