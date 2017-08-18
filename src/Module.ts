import Message from './Message';
import MessageType from './MessageType';
import { Link } from "./ModuleGraph";
import MessageBuilder from './MessageBuilder';

export class ModuleInput {
    name: string;
    module: IModule;
    link: Link | undefined;

    static toJSON(m: ModuleInput): any {
        return m.name;
    }
}
export class ModuleOutput {
    name: string;
    module: IModule;
    link: Array<Link>;
    value: any;

    static toJSON(m: ModuleOutput): any {
        return m.name;
    }
}
export interface ModuleConfig {
    name: string,
    file: string,
    inputs: Array<any>,
    outputs: Array<any>
}

export class ModuleBuilder {

    public static buildProcessModule(moduleConfig: ModuleConfig, process: any): ProcessModule {
        let module: ProcessModule = new ProcessModule();
        module.name = moduleConfig.name;
        module.filePath = moduleConfig.file;
        module.inputs = moduleConfig.inputs.map(i => ({
            name: i.name,
            module: module,
            link: undefined
        }));
        module.outputs = moduleConfig.outputs.map(i => ({
            name: i.name,
            module: module,
            link: [],
            value: undefined
        }));
        module.process = process;

        return module;
    }

    public static buildFunctionModule(moduleConfig: ModuleConfig, operation: any): FunctionModule {
        let module: FunctionModule = new FunctionModule();
        module.name = moduleConfig.name;
        module.inputs = moduleConfig.inputs.map(i => ({
            name: i.name,
            module: module,
            link: undefined
        }));
        module.outputs = moduleConfig.outputs.map(i => ({
            name: i.name,
            module: module,
            link: [],
            value: undefined
        }));
        module.operation = operation;

        return module;
    }
}

export interface IModule {
    name: string;
    inputs: Array<ModuleInput>;
    outputs: Array<ModuleOutput>;
    state: ModuleState;
    isValid: boolean;
    isExecuting: boolean;
    

    //sendMessage(message: any): void;
    //addMessageListener(messageType: MessageType, listener: (message: Message)=>void): void;
    computeOutputs(): Promise<Array<ModuleOutput>>;
    invalidate(): void;
    toJSON(): any;
}

export class ModuleBaseImpl {
    public name: string = '';
    public inputs: Array<ModuleInput> = [];
    public outputs: Array<ModuleOutput> = [];
    public state: ModuleState = ModuleState.BUSY;
    public messageQueue: Array<any> = [];
    public messageListeners: Map<MessageType, Array<(message: Message)=>void>> = new Map();
    public isValid: boolean = false;
    public isExecuting: boolean = false;

    invalidate(): void {
        this.isValid = false;
    }
    
    toJSON(): any {
        return {
            name: this.name,
            inputs: this.inputs.map(i => ModuleInput.toJSON(i)),
            outputs: this.outputs.map(o => ModuleOutput.toJSON(o))
        };
    }
}

export class ProcessModule extends ModuleBaseImpl implements IModule {
    public process: any = undefined;
    public filePath: string = '';
    private socket: any = undefined;

    constructor() {
        super();
        this.onMessage = this.onMessage.bind(this);
        this.onError = this.onError.bind(this);
    }

    public setSocket(socket: any) {
        this.socket = socket;
        socket.on('message', this.onMessage);
        socket.on('error', this.onError);
    }

    public sendMessage(message: any): void {
        // If the module is BUSY, enqueue the message for later
        if(this.state === ModuleState.BUSY) {
            this.messageQueue.push(message);
            console.log(`Queueing message for ${this.name}`);
        }
        // Send the message only if the module is IDLEing and has no pending messages
        if(this.state === ModuleState.IDLE && this.messageQueue.length === 0) {
            this.state = ModuleState.BUSY;
            this.socket.sendMessage(message);
        }
    }

    public addMessageListener(messageType: MessageType, listener: (message: Message)=>void): void {
        if(this.messageListeners.has(messageType)) {
            let listeners = this.messageListeners.get(messageType);
            if(listeners) {
                listeners.push(listener);
            }
        } else {
            this.messageListeners.set(messageType, [listener]);
        }
    }
    public removeMessageListener(messageType: MessageType, listener: (message: Message)=>void) {
        if(this.messageListeners.has(messageType)) {
            let listeners = this.messageListeners.get(messageType);
            if(listeners) {
                this.messageListeners.set(messageType, listeners.filter(l => l !== listener));
            }
        }
    }

    private onMessage(message: any) {
        this.state = ModuleState.IDLE;

        let strictMessage: Message = reconstructMessage(message);
        console.log('[SERVER] message from module ', this.name)
        if(this.messageQueue.length !== 0) {
            let sending = this.messageQueue.shift();
            this.state = ModuleState.BUSY;
            this.socket.sendMessage(sending);
        }

        let listeners = this.messageListeners.get(strictMessage.type);
        if(listeners) {
            for(let listener of listeners) {
                listener(strictMessage);
            }
        }
    }

    private onClose(code: any) {
        console.log(`child process exited with code ${code}`);
        this.state = ModuleState.STOPPED;
    }
    private onError(code: any) {
        console.log(`child process errored ${code}`);
        this.state = ModuleState.STOPPED;
    }

    public computeOutputs(): Promise<Array<ModuleOutput>> {
        //console.log('computeOutput of', this.name);
        this.isExecuting = true;
        return new Promise((resolve, reject) => {
            // Transform the input array to an object
            let inputs: any = {};
            this.inputs.forEach((i: ModuleInput) => inputs[i.name] = i.link ? i.link.from.output.value : undefined);

            let successCallback = (message: Message) => {
                let outputs = message.payload;

                // Store the output array
                // Outputs not described are not part of the module output array
                let modifiedOutputs = 0;
                for(let key in outputs) {
                    let output = this.outputs.find(o => o.name === key);
                    if(output) {
                        modifiedOutputs++;
                        output.value = outputs[key];
                    }
                }
                if(modifiedOutputs !== this.outputs.length) {
                    throw new Error('Not all outputs have been computed');
                }

                this.removeMessageListener('computeSuccess', successCallback);
                this.removeMessageListener('computeFail', failCallback);
                this.isExecuting = false;
                this.isValid = true;
                resolve(this.outputs);
            };
            let failCallback = (message: Message) => {
                this.removeMessageListener('computeSuccess', successCallback);
                this.removeMessageListener('computeFail', failCallback);
                this.isExecuting = false;
                this.isValid = true;
                reject(message.payload);
            };

            this.sendMessage(MessageBuilder.createNewInput(inputs));
            this.addMessageListener('computeSuccess', successCallback);
            this.addMessageListener('computeFail', failCallback);
        });
    }
}

export class FunctionModule extends ModuleBaseImpl implements IModule {
    public name: string = '';
    public operation: (moduleInputs: any)=>any; // ({ [inputName]: any }) => { [outputName]: any }
    public inputs: Array<ModuleInput> = [];
    public outputs: Array<ModuleOutput> = [];
    public state: ModuleState = ModuleState.BUSY;
    public messageQueue: Array<any> = [];
    public messageListeners: Map<MessageType, Array<(message: Message)=>void>> = new Map();

    public sendMessage(message: any): void {
        // If the module is BUSY, enqueue the message for later
        if(this.state === ModuleState.BUSY) {
            this.messageQueue.push(message);
            console.log(`Queueing message for ${this.name}`);
        }
        // Send the message only if the module is IDLEing and has no pending messages
        if(this.state === ModuleState.IDLE && this.messageQueue.length === 0) {
            this.state = ModuleState.BUSY;
            this.operation(message);
        }
    }

    public addMessageListener(messageType: MessageType, listener: (message: Message)=>void): void {
        if(this.messageListeners.has(messageType)) {
            let listeners = this.messageListeners.get(messageType);
            if(listeners) {
                listeners.push(listener);
            }
        } else {
            this.messageListeners.set(messageType, [listener]);
        }
    }

    public computeOutputs(): Promise<Array<ModuleOutput>> {
        //console.log('computeOutput of', this.name);
        this.isExecuting = true;
        return new Promise((resolve, reject) => {
            // Transform the input array to an object
            let inputs: any = {};
            this.inputs.forEach((i: ModuleInput) => inputs[i.name] = i.link ? i.link.from.output.value : undefined);

            let outputs: any = this.operation(inputs);

            // Store the output array
            // Outputs not described are not part of the module output array
            let modifiedOutputs = 0;
            for(let key in outputs) {
                let output = this.outputs.find(o => o.name === key);
                if(output) {
                    modifiedOutputs++;
                    output.value = outputs[key];
                }
            }

            if(modifiedOutputs !== this.outputs.length) {
                throw new Error('Not all outputs have been computed');
            }
            this.isExecuting = false;
            this.isValid = true;
            resolve(this.outputs);
        });
    }
}

export const enum ModuleState {
    IDLE,
    BUSY,
    STOPPED
}

function reconstructMessage(message: any): Message {
    return {
        type: message.type,
        payload: message.payload
    };
}