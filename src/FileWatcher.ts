const fs = require('fs');

export class FileWatcher {
    // Maps each file with a list of listeners
    files: Map<string, Array<(filename: string)=>void>> = new Map();
    watchers: Array<any> = new Array();

    constructor() {
        this.handleFileChange = this.handleFileChange.bind(this);
        this.clear = this.clear.bind(this);
    }

    public clear() {
        for(let w of this.watchers) {
            w.close();
        }
        this.watchers = [];
        this.files.clear();
    }

    public notifyAll() {
        this.files.forEach((listeners: Array<(filename: string)=>void>, filename: string) => {
            for(let listener of listeners) {
                listener(filename);
            }
        });
    }

    private handleFileChange(eventType: string, filename: string) {
        let listeners = this.files.get(filename)!;
        if(listeners) {
            for(let listener of listeners) {
                listener(filename);
            }
        }
    }

    public addFile(path: string): void {
        this.files.set(path, new Array());
        
        // Add a watcher that calls each listener of this file
        this.watchers.push(fs.watch(path, {persistent: false}, this.handleFileChange));
    }

    public addFiles(paths: Array<string>): void {
        for(let path of paths)  {
            this.addFile(path);
        }
    }

    public getFiles(): Array<string> {
        return Array.from(this.files.keys());
    }

    private doAddListener(path: string, callback: (filename: string)=>void) {
        this.files.get(path)!.push(callback);
    }

    public addListener(extension: string, callback: (filename: string)=>void) {
        Array.from(this.files.keys()).filter(f => f.endsWith(extension)).forEach(file => {
            this.doAddListener(file, callback);
        });
    }
}