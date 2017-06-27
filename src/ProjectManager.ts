import {IModule} from './Module';
import {AppConfig} from './AppConfig';
const path = require('path');
const fs = require('fs');
import FSHelper from './FSHelper';


/**
 * Used to load a project
 * 
 * @class ProjectLoader
 */
export class ProjectManager {
  appConfig: AppConfig;
  projectConfig: ProjectConfig;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
  }

  /**
   * Load a project
   * 
   * @param {string?} directory 
   * 
   * @memberof ProjectLoader
   */
  loadProject(directory?: string): Promise<ProjectConfig> {
    directory = directory || this.appConfig.defaultProjectPath;
    let configFilename = path.join(directory, 'softarch.json');
    return new Promise((resolve, reject) => {
      fs.readFile(configFilename, 'utf8', (err: string, data: string) => {
        if (err) {
          console.log(`Error while opening project file : ${err}`);
          reject(`No config file at ${configFilename}`);
          return;
        }

        console.log('Opening project');
        let projectConfig = JSON.parse(data);
        
        this.projectConfig = {
          exclude: projectConfig.exclude || this.appConfig.defaultProjectExclude,
          include: projectConfig.include || this.appConfig.defaultProjectInclude,
          name: projectConfig.name || 'No name',
          modules: projectConfig.modules || [],
          filenames: [],
          links: projectConfig.links || []
        }
        
        FSHelper.walkFiles(this.projectConfig.include, this.projectConfig.exclude).then(files => {
            this.projectConfig.filenames = files;
            resolve(this.projectConfig);
        });

        console.log(`Project's name : ${this.projectConfig.name}`);
        console.log(`Project's modules : ${this.projectConfig.modules}`);
        console.log(`Project's include : ${this.projectConfig.include}`);
        console.log(`Project's exclude : ${this.projectConfig.exclude}`);
      });
    });
  }
}

export interface Project {
  name: string;
  modules: Array<IModule>;
}

export interface LinkStart {
    module: string;
    output: string;
}
export interface LinkEnd {
    module: string;
    input: string;
}

export interface LinkConfig {
    from: LinkStart;
    to: LinkEnd;
}

export interface ProjectConfig {
  name: string;
  modules: Array<string>;
  links: Array<LinkConfig>;
  include: Array<string>;
  exclude: Array<string>;
  filenames: Array<string>;
}