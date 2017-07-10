const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const util = require('util');
const net = require('net');
const JsonSocket = require('json-socket');

import ModuleManager from './ModuleManager';
import FSHelper from './FSHelper';
import {AppConfig} from './AppConfig';
import {ProjectConfig, ProjectManager} from './ProjectManager';
import {ExecutionEngine} from './ExecutionEngine';
import {Link, ModuleGraph} from './ModuleGraph';
import {ModuleOutput, ModuleBuilder,  ModuleConfig} from './Module';
import {FileWatcher} from './FileWatcher';
import * as _ from 'lodash';

var Glob = require("glob").Glob


class Server {
    moduleManager: ModuleManager;
    projectConfig: ProjectConfig;
    appConfig: AppConfig;
    executionEngine: ExecutionEngine;
    fileWatcher: FileWatcher;
    moduleGraph: ModuleGraph;
    socket: any;

    constructor(moduleManager: ModuleManager, appConfig: AppConfig, executionEngine: ExecutionEngine, fileWatcher: FileWatcher) {
        this.moduleManager = moduleManager;
        this.appConfig = appConfig;
        this.executionEngine = executionEngine;
        this.fileWatcher = fileWatcher;

        this.onMessage = this.onMessage.bind(this);
        this.onNewOutput = this.onNewOutput.bind(this);
        
    }

    startRPC() {
        var port = 9838;
        var server = net.createServer();
        server.listen(port);
        server.on('connection', (socket: any) => { //This is a standard net.Socket
            this.socket = new JsonSocket(socket); //Now we've decorated the net.Socket to be a JsonSocket
            this.socket.on('message', this.onMessage);
            this.socket.on('error', (e:any) => {
                console.log('error',e);
            });
            console.log('connection');
        });
    }

    private sendMessage(message: any) {
        if(this.socket) {
            console.log('Send message : ', message.type);
            this.socket.sendMessage(message);
        }
    }

    onMessage(message: any) {
        console.log('onMessage');
        if(message.type === undefined || message.payload === undefined) {
            console.error('Malformed message', message);
            return;
        }
        switch(message.type) {
            case 'getModuleGraph':
                this.sendMessage({type: 'moduleGraph', payload: this.executionEngine.moduleGraph.toJSON()});
                break;
            case 'refreshProject':
                this.openDefaultProject();
                break;
            case 'getAllOutputs':
                this.executionEngine.moduleGraph.getNodes().forEach(module => {
                    this.sendMessage({
                        type: 'newOutput',
                        payload: {
                            module: module.name,
                            outputs: module.outputs.map(o => ({
                                name: o.name,
                                value: o.value
                            }))
                        }
                    });
                });
                break;
            default:
                this.sendMessage({type: 'unknownMessageType', payload: null});
                break;
        }
    }

    /**
     * New output was computed
     * 
     * @param {any} outputs List of outputs
     * @memberof Server
     */
    onNewOutput(outputs: Array<ModuleOutput>) {
        this.sendMessage({type: 'newOutput', payload: outputs});
    }

    injectFileModules() {
        // Get all the nodes that listen to files
        let entryNodes = this.moduleGraph.getEntryNodes();

        // Get the list of extensions
        let extensions = this.moduleGraph.getEntryNodesInputFormats();

        // Build the modules that will listen to file changes
        for(let extension of extensions) {
            //console.log(util.inspect(extension));
            let moduleConfig: ModuleConfig = {
                file: '',
                name: extension,
                inputs: [],
                outputs: [ { name: extension+'-file' } ]
            };

            let changedFiles: Set<string> = new Set<string>();

            let fileModule = ModuleBuilder.buildFunctionModule(moduleConfig, () => {
                let fileContents = Array.from(changedFiles).map((filePath: string) => {
                    return {
                        content: fs.readFileSync(filePath, {encoding: 'utf8'}),
                        path: filePath
                    };
                });
                let outputs = {
                    [extension+'-file']: fileContents
                };
                //console.log(`changedFiles seen by ${module.name}`, util.inspect(changedFiles));
                changedFiles.clear();
                return outputs; 
            });

            this.moduleGraph.insertModule(fileModule);
            
            // Link this watcher module to every module that needs that type of file
            let modulesToConnect = entryNodes.filter(m => m.inputs.find(i => i.name === moduleConfig.outputs[0].name) !== undefined);
            for(let moduleToConnect of modulesToConnect) {
                this.moduleGraph.link(fileModule.outputs[0], moduleToConnect.inputs.find(i => i.name === moduleConfig.outputs[0].name)!);
            }

            let debouncedInvalidation = _.debounce(() => {
                this.executionEngine.invalidate(fileModule);
            }, 500, {trailing: true, leading: false});


            // Store the changed files for a certain time then invalidate the module
            this.fileWatcher.addListener(extension, (filename: string) => {
                console.log(`file ${filename} has changed. Invalidating module ...`);
                changedFiles.add(filename);
                debouncedInvalidation();
            });
        }

        this.fileWatcher.notifyAll();
    }

    openDefaultProject(): void {
        let projectLoader = new ProjectManager(this.appConfig);
        this.fileWatcher.clear();

        projectLoader.loadProject().then((res: ProjectConfig) => {
            this.projectConfig = res;
            this.fileWatcher.addFiles(this.projectConfig.filenames);
            this.moduleManager.loadModules(this.projectConfig.modules);
            this.moduleGraph = new ModuleGraph(this.moduleManager.modules, this.projectConfig.links);
            this.executionEngine.setModuleGraph(this.moduleGraph);
            this.executionEngine.on('newOutput', this.onNewOutput);
            this.injectFileModules();
        });
    }

    start(): void {
        this.openDefaultProject();
        this.startRPC();
    }
}

let appConfig = {
  defaultProjectPath: '.',
  defaultProjectInclude: '*',
  defaultProjectExclude: 'node_modules',
  defaultModuleFolder: '.'
};

let moduleManager = new ModuleManager(appConfig);
let executionEngine = new ExecutionEngine(100);
let fileWatcher = new FileWatcher();

let server = new Server(moduleManager, appConfig, executionEngine, fileWatcher);
server.start();