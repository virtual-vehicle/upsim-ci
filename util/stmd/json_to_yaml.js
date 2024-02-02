const yaml = require('yaml');
const path = require('path')
const fs = require('fs');

function jsonToYaml(cdkElements, outputFile, basename, stmdFolderPath) {

    let steps = [];
    // add basic steps
    steps.push({
        "name": "checkout repo",
        "uses": "actions/checkout@v4",
        "with": {
            "submodules": true,
            "token": "${{ secrets.WRITE_WORKFLOW }}"
        }        
    });
    steps.push({
        "name": "Install compatible node version",
        "uses": "actions/setup-node@v3",
        "with": {
            "node-version": 16
        }          
    })
    steps.push({
        "name": "install CDK modules",
        "working-directory": "Credibility-Assessment-Framework/Credibility-Development-Kit",
        "run": "find . -maxdepth 4 -name package.json -exec sh -c 'for file do dir=${file%/*}; npm install --prefix $dir $dir; done' sh {} +"
    });

    steps.push({
        "name": "set STMD Folder path",
        "run" : "echo 'STMDFOLDERPATH="+stmdFolderPath+"' >> $GITHUB_ENV && echo $STMDFOLDERPATH"
    });

    // add processing steps
    for (let element of cdkElements.Processing) {
        let newSteps = translateProcessingElement(element, stmdFolderPath);
        steps.push(...newSteps);
    }

    // add evidence steps
    for (let element of cdkElements.Evidence) {
        let newSteps = translateEvidenceElement(element, outputFile, stmdFolderPath);
        steps.push(...newSteps);
    }

    let yaml_struct = {
        "name": basename,
        "on" : {
            "workflow_call" : {
                "outputs" : {
                    "summary" : {
                        "value": "${{jobs."+basename+".outputs.summary}}"
                    }
                },
                "secrets" : {
                    "WRITE_WORKFLOW" : {
                        "required": true
                    }
                }
            }
        },
        "jobs": {
        },
    };

    yaml_struct["jobs"][basename] = {
        "runs-on": 'ubuntu-20.04',
        "outputs": {
            "summary": "${{steps.outputStep.outputs.summary}}"
        },
        "steps": []
    }

    // step__x is a workaround to compensate for bugs in the yaml module (Bug: Wraps long strings to new lines)
    for (let i = 0; i < steps.length; i++) {
        yaml_struct.jobs[basename].steps.push({...steps[i]});

        if (steps[i].run !== undefined) {
            yaml_struct.jobs[basename].steps[i].run = "step__" + String(i);
        }
    }

    // add summary step
    yaml_struct.jobs[basename].steps.push({
        name: "show report",
        run: "cat " + outputFile
    });

    yaml_struct.jobs[basename].steps.push({
        name: "send to outputs",
        id: "outputStep",
        run: "echo \"summary=$(cat "+outputFile+")\" >> $GITHUB_OUTPUT"
    });

    let yaml_string = yaml.stringify(yaml_struct);

    // replace step__x with the run
    for (let i = 0; i < steps.length; i++) {
        if (steps[i].run !== undefined) {
            yaml_string = yaml_string.replace('step__' + String(i), steps[i].run);
        }
    }
    return yaml_string;
}

function allToYaml(actionList) {
    var allJson ={
        "name": "all",
        // "on": {
        //     "push": null
        // },
        "on": {
            "workflow_run": {
                "workflows": ['create-workflows'],
                "types": ['completed']
            }
        },
        "jobs": {
            "all": {
                "runs-on": "ubuntu-20.04",
                "needs": [
                ],
                "steps": [
                    {
                        "name": "checkout simulation data",
                        "uses": "actions/checkout@v4",
                        "with": {
                            "submodules": true,
                            "token": "${{ secrets.WRITE_WORKFLOW }}"
                        }
                    },
                    {
                        "name": "install prerequisites",
                        "run": "cd util/stmd\nnpm install yaml\ncd ../..\nnpm install --prefix ./Credibility-Assessment-Framework/Credibility-Development-Kit/util/stmd-crud ./Credibility-Assessment-Framework/Credibility-Development-Kit/util/stmd-crud\n"
                    },
                    {
                        "name": "make output folder",
                        "run": "mkdir -p ./.github/outputs"
                    }
                ]
            }
        }
    }

    var step1 = {
        "env" : {
            "GithubBranch": "${{github.ref_name}}",
            "GithubRepoName": "${{github.event.repository.name}}",
            "GithubOwner": "${{github.repository_owner}}"
        },
        "run" : "node ./util/stmd/results.js -s -o summary.md && cat summary.md >> $GITHUB_STEP_SUMMARY"
    }
    var allActionList = "";
    for (var e in actionList) {
        if (typeof actionList[e] === "string") {
            var fileName = actionList[e].replaceAll("_",".");
            allJson["jobs"][actionList[e]] = {
                "uses": process.env.GithubOwner+"/"+process.env.GithubRepoName+"/.github/workflows/"+fileName+".yaml@"+process.env.GithubBranch,
                "secrets" : {
                    "WRITE_WORKFLOW" : "${{secrets.WRITE_WORKFLOW}}"
                }
            }
            allJson["jobs"]["all"]["needs"].push(actionList[e]);
            
            step1["env"][actionList[e]] = "${{needs."+actionList[e]+".outputs.summary}}"
            allActionList += actionList[e] + ",";
            // allJson["jobs"]["all"]["steps"].push({
            //     "env": {
            //         "summary"
            //     },
            //     "run": "rs=\"${{needs."+actionList[e]+".outputs.summary}}\" && echo $rs > ./output/"+fileName+".txt",
            // })
        }
    }
    step1["env"]["allActionList"] = allActionList;

    allJson["jobs"]["all"]["steps"].push(step1);

    allJson["jobs"]["all"]["steps"].push({
        "name": "push results",
        "run": "git config --global user.name \"Add results\"\ngit config --global user.email \"setlabs@users.noreply.github.com\"\n\ngit add ./.github/outputs\ngit commit -m \"Add results [actions skip]\"\ngit push\n"
    });

    let yaml_string = yaml.stringify(allJson);
    return yaml_string;
}

// process.stdout.write(yaml_string);

// -------------------- functions---------------------------------------------------------------------------------------

function translateProcessingElement(element, stmdFolderPath) {
    let steps = [];

    for (let prerequisite of element.Prerequisites) {
        var absolutePathSource = path.resolve(stmdFolderPath, prerequisite.attributes.source);
        steps.push({
            name: "install prerequisites",
            run: prerequisite.attributes.method == "nodejs" ? "node " + absolutePathSource : "chmod +x " +absolutePathSource+" && "+absolutePathSource
        });
    }
    
    if (element.SimpleProcessing !== undefined) {
        // parse arguments
        let functionMethods = [];
        let functionArgs = [];
        for (let arg of element.Inputs.FunctionArgument) {
            functionMethods.push('"' + arg.attributes.method + '"');
            if (arg.attributes.method == "file") {
                functionArgs.push('"' + arg.attributes.content + '"');
            } else if (arg.attributes.method == "path") {
                functionArgs.push('"' + path.resolve(stmdFolderPath,arg.attributes.content) + '"');
            } else {
                functionArgs.push('"' + arg.attributes.content + '"')
            }
        }
        var outputPath = path.resolve(stmdFolderPath, element.Outputs.Return.attributes.path);
        var outputFolderPath = path.dirname(outputPath);

        // if (!fs.existsSync(outputFolderPath)){
        //     fs.mkdirSync(outputFolderPath, { recursive: true });
        // }
        // compose step
        steps.push({
            name: element.SimpleProcessing.attributes.id,
            run: "rs=$(node -e 'process.stdout.write(require(\"./util/wrapper/fcnWrapper.js\").wrapper(\"" + element.SimpleProcessing.attributes.packageUri + "\", \"" + element.SimpleProcessing.attributes.function + "\", [" + functionMethods.join(",") + "], [" + functionArgs.join(",") + "]))') && echo $rs && mkdir -p "+outputFolderPath+" && echo $rs > " + outputPath
        });
    }

    if (element.ComplexProcessing !== undefined) {
        if (element.ComplexProcessing.attributes.method == "github-action") {
            // parse arguments
            let actionArgs = {};
            for (let input of element.Inputs.FunctionArgument) {
                actionArgs[input.attributes.name] = 
                    input.attributes.method == "inline" 
                    ? input.attributes.content 
                    : input.attributes.method == "path"
                     ? path.resolve(stmdFolderPath, input.attributes.content)
                     : input.attributes.content;
            }

            // compose step
            let step = {
                name: element.ComplexProcessing.attributes.id,
                uses: element.ComplexProcessing.attributes.source
            };

            // add "with" only if arguments are given
            if (element.Inputs.FunctionArgument.length > 0) {
                step["with"] = actionArgs;
            }

            steps.push(step);
        }

        if (element.ComplexProcessing.attributes.method == "nodejs") {
            // parse arguments
            let clArgs = [];

            for (let arg of element.Inputs.CommandLineArgument) {
                clArgs.push(arg.attributes.flag);
                if (arg.attributes.argument !== undefined) {
                    if (arg.attributes.type == "path") {
                        var argPathLs = arg.attributes.argument.split(" ");
                        for (var argi in argPathLs) {
                            if (typeof argPathLs[argi] === "string") {
                                var argPath = path.resolve(stmdFolderPath, argPathLs[argi]);
                                var argFolderPath = path.dirname(argPath);
                                
                                if (!fs.existsSync(argFolderPath)){
                                    fs.mkdirSync(argFolderPath, { recursive: true });
                                }
                                
                                clArgs.push(argPath) ;
                            }
                        }
                    } else {
                        clArgs.push(arg.attributes.argument); 
                    }
                }
                //     clArgs.push(arg.attributes.argument) ;
                // if (arg.attributes.path !== undefined)
                //     clArgs.push(path.resolve(stmdFolderPath, arg.attributes.path)) ;
            }

            var outputPath;
            try {
                var outputPath = path.resolve(stmdFolderPath,element.Outputs.Output[0].attributes.path)
            }catch(e)  {
                outputPath = "";
            }

            if (outputPath) {
                var outputFolderPath = path.dirname(outputPath);
        
                // if (!fs.existsSync(outputFolderPath)){
                //     fs.mkdirSync(outputFolderPath, { recursive: true });
                // }

                steps.push({
                    name: element.attributes.description.slice(0, 60) + "...",
                    run: "rs=$(node " + path.resolve(stmdFolderPath, element.ComplexProcessing.attributes.source) + " " + clArgs.join(" ") + ") && echo $rs && mkdir -p "+outputFolderPath+" &&  echo $rs > " + outputPath
                });
            } else {
                steps.push({
                    name: element.attributes.description.slice(0, 60) + "...",
                    run: "node " + path.resolve(stmdFolderPath, element.ComplexProcessing.attributes.source) + " " + clArgs.join(" ") + ""
                });
            }
        }
    }

    return steps;
}

function translateEvidenceElement(element, outputPath, stmdFolderPath) {
    let steps = [];

    // install CDK module
    steps.push({
        name: "install CDK module",
        run: "npm install --prefix " + element.Metric[0].attributes.packageUri + " " + element.Metric[0].attributes.packageUri
    });

    for (let metric of element.Metric) {
        for (let test of metric.Test) {
            // parse arguments
            let functionMethods = [];
            let functionArgs = [];

            for (let arg of test.FunctionArgument) {
                functionMethods.push('"' + arg.attributes.method + '"');
                if (arg.attributes.method == "file") {
                    functionArgs.push('"' + arg.attributes.content + '"');
                } else  if (arg.attributes.method == "path") {
                    functionArgs.push('"' + path.resolve(stmdFolderPath, arg.attributes.content) + '"');
                } else {
                    functionArgs.push('"' + arg.attributes.content + '"')
                }
            }

            // compose step
            var metadata = {
                level : element.attributes.level,
                id : test.attributes.id
            }

            if (test.Return) {
                var returnPath = path.resolve(stmdFolderPath, test.Return.path);

                steps.push({
                    name: test.attributes.id,
                    run: "rs=$(node -e 'process.stdout.write(JSON.stringify(require(\"./util/wrapper/fcnWrapper.js\").wrapper(\"" + metric.attributes.packageUri + "\", \"" + metric.attributes.function + "\", [" + functionMethods.join(",") + "], [" + functionArgs.join(",") + "], "+JSON.stringify(metadata)+")))') && echo $rs && echo $rs > "+returnPath+" &&  node ./util/stmd/results.js -p \"$rs\" -o "+outputPath
                });
            } else {
                steps.push({
                    name: test.attributes.id,
                    run: "rs=$(node -e 'process.stdout.write(JSON.stringify(require(\"./util/wrapper/fcnWrapper.js\").wrapper(\"" + metric.attributes.packageUri + "\", \"" + metric.attributes.function + "\", [" + functionMethods.join(",") + "], [" + functionArgs.join(",") + "], "+JSON.stringify(metadata)+")))') && echo $rs &&  node ./util/stmd/results.js -p \"$rs\" -o "+outputPath
                });
            }
        }
    }

    return steps;
}


module.exports = {
    jsonToYaml,
    allToYaml
}