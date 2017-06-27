const fs = require('fs');

export class FileWatcher {
    files: Set<string> = new Set<string>();

    constructor() {

    }

    public addFile(path: string): void {
        this.files.add(path);
    }

    public addFiles(paths: Array<string>): void {
        for(let path of paths)  {
            this.addFile(path);
        }
    }

    public getFiles(): Array<string> {
        return Array.from(this.files);
    }

    public addChangeListener(extension: string, callback: (filename: string)=>void) {
        Array.from(this.files).filter(f => f.endsWith(extension)).forEach(file => {
            fs.watch(file, {persistent: false}, (eventType: string, filename: string) => {
                callback(filename);
            });
        });
    }
}