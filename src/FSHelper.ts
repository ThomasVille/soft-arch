var Glob = require("glob").Glob

export default class FSHelper {

    /**
     * List all the files matching the globs except the exclude paths.
     */
    static listFiles(globs: Array<string>|string, exclude?: Array<string>|string): Promise<Array<string>> {
        let files: Array<string> = [];
        let remainingGlobs: number = globs.length;
        let excludePaths = exclude || [];

        globs = Array.isArray(globs) ? globs : [globs];
        excludePaths = Array.isArray(excludePaths) ? excludePaths : [excludePaths];
        if(globs.length === 0) {
            return Promise.resolve([]);
        }

        return new Promise((resolve, reject) => {
            for(let g of globs) {
                let walker = new Glob(g, {mark: true});

                walker.on('match', (match: string) => {
                    // Filter excluded paths
                    for(let ex of excludePaths) {
                        if(match.indexOf(ex) !== -1) {
                            return;
                        }
                    }
                    // Filter folders
                    if(match.charAt(match.length-1) !== '/') {
                        files.push(match);
                    }
                });
                walker.on('end', () => {
                    remainingGlobs--;

                    if(remainingGlobs === 0) {
                        resolve(files);
                    }
                });
            }
        });
    }
    /**
     * List all the folders matching the globs.
     */
    static listDirs(globs: Array<string>|string): Promise<Array<string>> {
        let files: Array<string> = [];
        let remainingGlobs: number = globs.length;
        
        globs = Array.isArray(globs) ? globs : [globs];
        
        if(globs.length === 0) {
            return Promise.resolve([]);
        }

        return new Promise((resolve, reject) => {
            for(let g of globs) {
                let walker = new Glob(g, {mark: true});

                walker.on('match', (match: string) => {
                    if(match.charAt(match.length-1) === '/') {
                        files.push(match);
                    }
                });
                walker.on('end', () => {
                    remainingGlobs--;

                    if(remainingGlobs === 0) {
                        resolve(files);
                    }
                });
            }
        });
    }
    /**
     * List all the files and folders matching the globs.
     */
    static listAll(globs: Array<string>|string): Promise<Array<string>> {
        let files: Array<string> = [];
        let remainingGlobs: number = globs.length;
        
        // Convert a single string into an array
        globs = Array.isArray(globs) ? globs : [globs];

        if(globs.length === 0) {
            return Promise.resolve([]);
        }

        return new Promise((resolve, reject) => {
            for(let g of globs) {
                let walker = new Glob(g);
                walker.on('match', (match: string) => {
                    files.push(match);
                });
                walker.on('end', () => {
                    remainingGlobs--;

                    if(remainingGlobs === 0) {
                        resolve(files);
                    }
                });
            }
        });
    }

    /**
     * List all the files and folders matching the globs.
     */
    static walkFiles(includeGlobs: Array<string>|string, excludeGlobs: Array<string>|string): Promise<Array<string>> {
        includeGlobs = Array.isArray(includeGlobs) ? includeGlobs : [includeGlobs];
        excludeGlobs = Array.isArray(excludeGlobs) ? excludeGlobs : [excludeGlobs];

        return FSHelper.listAll(excludeGlobs)
        .then((excludePaths: Array<string>) => {
            return FSHelper.listFiles(includeGlobs, excludePaths);
        });
    }
}