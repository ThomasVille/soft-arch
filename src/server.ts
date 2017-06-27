const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const util = require('util');
import ModuleManager from './ModuleManager';
import FSHelper from './FSHelper';
import {AppConfig} from './AppConfig';
import {ProjectConfig, ProjectManager} from './ProjectManager';
import {ExecutionEngine} from './ExecutionEngine';
import {Link, ModuleGraph} from './ModuleGraph';
import {ModuleBuilder, ModuleConfig} from './Module';
import {FileWatcher} from './FileWatcher';
import * as _ from 'lodash';

var Glob = require("glob").Glob


class Server {
    moduleManager: ModuleManager;
    projectConfig: ProjectConfig;
    appConfig: AppConfig;
    executionEngine: ExecutionEngine;
    fileWatcher: FileWatcher;

    constructor(moduleManager: ModuleManager, appConfig: AppConfig, executionEngine: ExecutionEngine, fileWatcher: FileWatcher) {
        this.moduleManager = moduleManager;
        this.appConfig = appConfig;
        this.executionEngine = executionEngine;
        this.fileWatcher = fileWatcher;
    }

    startCommandLine(): void {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'softarch> '
        });

        rl.prompt();

        rl.on('line', (line: string) => {
            let command = line.trim().split(' ');

            switch(command[0]) {
                case 'analyze':
                    console.log(`Analyzing '${command[1]}'`);
                    break;
                case 'getModuleList':
                    console.log('Getting all modules');
                    console.log(this.moduleManager.getAllModules());
                    break;
                case 'help':
                    console.log('Help :');
                    console.log('analyze');
                    console.log('getModuleList');
                    break;
                default:
                    console.log('Command not recognized. Type "help".');
            }
            rl.prompt();
        }).on('close', () => {
            process.exit(0);
        });
    }

    onModulesLoaded() {
        console.log('links', this.projectConfig.links);

        let moduleGraph = new ModuleGraph(this.moduleManager.modules, this.projectConfig.links);
        this.executionEngine.setModuleGraph(moduleGraph);

        // Get all the nodes that listen to files
        let entryNodes = moduleGraph.getEntryNodes();

        // Get the list of extensions
        let extensions = moduleGraph.getEntryNodesInputFormats();

        // Build the modules that will listen to file changes
        for(let extension of extensions) {
            //console.log(util.inspect(extension));
            let files: Array<string>;
            // Get the list of all files that will be tracked
            if(extension === 'file') {
                files = this.projectConfig.filenames;
            } else {
                files = this.projectConfig.filenames.filter(f => f.endsWith(extension));
            }
            //console.log(util.inspect(files));
            let moduleConfig: ModuleConfig = {
                file: '',
                name: extension,
                inputs: [],
                outputs: [ { name: extension+'-file' } ]
            };

            let changedFiles: Set<string> = new Set<string>();
            
            let module = ModuleBuilder.buildFunctionModule(moduleConfig, () => {
                return {
                    [extension+'-file']: Array.from(changedFiles)
                };
            });

            moduleGraph.insertModule(module);

            // Link this watcher module to every module that need that type of file
            let modulesToConnect = entryNodes.filter(m => m.inputs.find(i => i.name === moduleConfig.outputs[0].name) !== undefined);
            for(let moduleToConnect of modulesToConnect) {
                moduleGraph.link(module.outputs[0], moduleToConnect.inputs.find(i => i.name === moduleConfig.outputs[0].name)!);
            }

            let invalidateModule = _.debounce(() => {
                this.executionEngine.invalidate(module);
            }, 10, {trailing: true, leading: false});


            // Store the files changed for a certain time then invalidate the module
            this.fileWatcher.addChangeListener(extension, (filename: string) => {
                console.log(`file ${filename} has changed. Invalidating module ...`);
                changedFiles.add(filename);
                invalidateModule();
            });
        }

        this.executionEngine.invalidateAll();
    }

    openDefaultProject(): void {
        let projectLoader = new ProjectManager(this.appConfig);

        projectLoader.loadProject().then((res: ProjectConfig) => {
            this.projectConfig = res;
            this.fileWatcher.addFiles(this.projectConfig.filenames);
            this.moduleManager.loadModules(this.projectConfig.modules);
            this.onModulesLoaded();
        });
    }

    start(): void {
        this.openDefaultProject();
        this.startCommandLine();
    }
}

let appConfig = {
  defaultProjectPath: '.',
  defaultProjectInclude: '*',
  defaultProjectExclude: 'node_modules',
  defaultModuleFolder: '.'
};

let moduleManager = new ModuleManager(appConfig);
let executionEngine = new ExecutionEngine();
let fileWatcher = new FileWatcher();

let server = new Server(moduleManager, appConfig, executionEngine, fileWatcher);
server.start();