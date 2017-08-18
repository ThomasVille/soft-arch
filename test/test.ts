var assert = require('assert');
const fs = require('fs');
import ModuleManager from '../src/ModuleManager';
import {AppConfig} from '../src/AppConfig';
import {Link, ModuleGraph} from '../src/ModuleGraph';
import {ModuleBuilder, IModule, ModuleConfig, FunctionModule, ModuleOutput} from '../src/Module';
import {ProjectConfig, ProjectManager} from '../src/ProjectManager';
import {printModuleOutputs} from '../src/ExecutionEngine';

import FSHelper from '../src/FSHelper';
var expect = require('chai').expect;
import * as _ from "lodash";


let appConfig: AppConfig = {
  defaultProjectPath: './test/fake_project',
  defaultProjectInclude: '*',
  defaultProjectExclude: 'node_modules',
  defaultModuleFolder: './test/'
};

describe('ModuleManager', function() {
    describe('loadModule', function() {

        it('should load the module', function() {
            let moduleManager = new ModuleManager(appConfig);

            assert.ok(moduleManager.loadModule('parser'));

            let modules = moduleManager.getAllModules();

            assert.strictEqual(modules.length, 1);
            assert.strictEqual(modules[0], 'parser');
        });

        it('should not load the module', function() {
            let moduleManager = new ModuleManager(appConfig);

            moduleManager.loadModule('no-module-here');
        });
    });
    
    describe('loadModules', function() {
    
        it('should load the modules', function() {
            let moduleManager = new ModuleManager(appConfig);
            
            moduleManager.loadModules(['parser', 'analyzer']);
            assert.deepStrictEqual(moduleManager.getAllModules(), ['parser', 'analyzer']);
        });

        it('should ignore modules that do not exist', function() {
            let moduleManager = new ModuleManager(appConfig);
            
            moduleManager.loadModules(['parser', 'bullshit']);
            assert.deepStrictEqual(moduleManager.getAllModules(), ['parser']);
        });
    });
});



describe('FSHelper', function() {
    describe('listFiles', function() {
        it('should expand *', function(done) {
            FSHelper.listFiles(['test/fake_project/*'])
            .then(files => {
                expect(files).to.have.deep.members(['test/fake_project/ApiManager.ts', 'test/fake_project/index.ts', 'test/fake_project/main.cpp', 'test/fake_project/softarch.json', 'test/fake_project/package.json']);
                done();
            })
            .catch(err => {
                done(err);
            });
        });
        it('should expand **', function(done) {
            FSHelper.listFiles(['test/fake_project/**'])
            .then(files => {
                expect(files).to.have.deep.members(['test/fake_project/ApiManager.ts', 'test/fake_project/index.ts', 'test/fake_project/main.cpp', 'test/fake_project/package.json', 'test/fake_project/softarch.json', 'test/fake_project/assets/model.3d']);
                done();
            })
            .catch(err => {
                done(err);
            });
        });
        it('should return empty array on wrong path', function(done) {
            FSHelper.listFiles(['test/non-existent-directory'])
            .then(files => {
                expect(files).to.have.deep.members([]);
                done();
            })
            .catch(err => {
                done(err);
            });
        });
        it('should return empty array on empty array input', function(done) {
            FSHelper.listFiles([])
            .then(files => {
                expect(files).to.have.deep.members([]);
                done();
            })
            .catch(err => {
                done(err);
            });
        });
    });

    describe('listDirs', function() {
        it('should expand *', function(done) {
            FSHelper.listDirs(['test/fake_project/*'])
            .then(files => {
                expect(files).to.have.deep.members(['test/fake_project/assets/']);
                done();
            })
            .catch(err => {
                done(err);
            });
        });
        it('should expand **', function(done) {
            FSHelper.listDirs(['test/fake_project/**'])
            .then(files => {
                expect(files).to.have.deep.members(['test/fake_project/', 'test/fake_project/assets/']);
                done();
            })
            .catch(err => {
                done(err);
            });
        });
        it('should return empty array on wrong path', function(done) {
            FSHelper.listDirs(['test/non-existent-directory'])
            .then(files => {
                expect(files).to.have.deep.members([]);
                done();
            })
            .catch(err => {
                done(err);
            });
        });
        it('should return empty array on empty array input', function(done) {
            FSHelper.listDirs([])
            .then(files => {
                expect(files).to.have.deep.members([]);
                done();
            })
            .catch(err => {
                done(err);
            });
        });
    });

    describe('walkFiles', function() {
        it('should include all the files and ignore empty exclude array', function(done) {
            FSHelper.walkFiles(['test/fake_project/main.cpp', 'test/fake_project/assets'], [])
            .then(files => {
                expect(files).to.have.deep.members(['test/fake_project/main.cpp']);
                done();
            })
            .catch(err => {
                done(err);
            });
        });
        it('should include and exclude correctly the files', function(done) {
            FSHelper.walkFiles(['test/fake_project/**'], ['test/fake_project/assets'])
            .then(files => {
                expect(files).to.have.deep.members(['test/fake_project/ApiManager.ts', 'test/fake_project/index.ts', 'test/fake_project/main.cpp', 'test/fake_project/package.json', 'test/fake_project/softarch.json']);
                done();
            })
            .catch(err => {
                done(err);
            });
        });
        it('should ignore wrong include globs and return empty array', function(done) {
            FSHelper.walkFiles(['test/non-existent-directory'], ['kmsldqj'])
            .then(files => {
                expect(files).to.have.deep.members([]);
                done();
            })
            .catch(err => {
                done(err);
            });
        });
        it('should ignore wrong exclude globs', function(done) {
            FSHelper.walkFiles(['test/fake_project/main.cpp'], ['kmsldqj'])
        .then(files => {
            expect(files).to.have.deep.members(['test/fake_project/main.cpp']);
            done();
        })
        .catch(err => {
            done(err);
        });
    });
  });
});

describe('ModuleGraph', function() {
    describe('build', function() {
        it('should build a module graph with 2 modules and 1 link', function(done) {
            let projectConfig: ProjectConfig;
            let moduleManager = new ModuleManager(appConfig);
            let projectLoader = new ProjectManager(appConfig);

            projectLoader.loadProject().then((res: ProjectConfig) => {
                projectConfig = res;
                moduleManager.loadModules(projectConfig.modules);
                let moduleGraph = new ModuleGraph(moduleManager.modules, projectConfig.links);

                expect(moduleGraph.links).to.be.an('array').that.is.not.empty;

                let analyzer = moduleGraph.modules.find(m => m.name === 'analyzer');
                let parser = moduleGraph.modules.find(m => m.name === 'parser');

                expect(analyzer).to.be.an('object', 'analyzer module is missing');
                expect(parser).to.be.an('object', 'parser module is missing');
                if(!analyzer || !parser) return;

                let link = analyzer.inputs[0].link;
                expect(link).to.be.an('object', 'link between the modules missing');
                if(!link) return;
                
                expect(link.from.module).to.equal(parser);
                done();
            });
        });        
    });
});

describe('FunctionModule', function() {
    describe('computeOutputs', function() {
        let numberCruncherConfig: ModuleConfig;

        before(function() {
            // Describes two outputs : sum & product
            numberCruncherConfig = {
                name: 'number-cruncher',
                file: '',
                inputs: [],
                outputs: [
                    {
                        "name": "sum",
                        "format": "number"
                    },
                    {
                        "name": "product",
                        "format": "number"
                    }
                ]
            };
        });

        it('should compute outputs and produce a correct set of outputs', function(done) {
            let operation = (inputs: any) => {
                let outputs = {
                    sum: 42,
                    product: 2017
                };

                return outputs;
            };

            let module: FunctionModule = ModuleBuilder.buildFunctionModule(numberCruncherConfig, operation);
            module.computeOutputs().then(outputs => {
                let sum = outputs.find(o => o.name === 'sum');
                let product = outputs.find(o => o.name === 'product');

                expect(sum).to.be.an('object', '"sum" is not an output despite being defined in the module description and produced by the operation');
                expect(product).to.be.an('object', '"sum" is not an output despite being defined in the module description and produced by the operation');
                if(sum === undefined || product === undefined) return;

                expect(sum.value).to.be.a('number', '"sum" is not a number as defined in the module description');
                expect(product.value).to.be.a('number', '"product" is not a number as defined in the module description');
                done();
            })
            .catch(err => done(err));

        });
        
        it("should throw when operation doesn't produce all the described outputs", function(done) {
            // Produce two outputs with one different from the description : division & product
            let operation = (inputs: any) => {
                let outputs = {
                    division: 42,
                    product: 2017
                };

                return outputs;
            };

            let module: FunctionModule = ModuleBuilder.buildFunctionModule(numberCruncherConfig, operation);
            expect(module.computeOutputs).to.throw();
            done();
        });
    });
});