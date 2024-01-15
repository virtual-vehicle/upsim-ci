const yaml = require('yaml');

let cdkElements, outputFile;
for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "-c" || process.argv[i] === "--cdkelements")
        cdkElements = process.argv[i+1];
    if (process.argv[i] === "-o" || process.argv[i] === "--output")
        outputFile = process.argv[i+1];
}
if (cdkElements === undefined)
    throw("cdk elements must be given, use -c or --cdkelements");
if (outputFile === undefined)
    throw("output file path must be given, use -o or --output");

cdkElements = JSON.parse(cdkElements);

let steps = [];

// add basic steps
steps.push({
    "name": "checkout repo",
    "uses": "actions/checkout@v4",
    "with": {
        "submodules": true
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

// add processing steps
for (let element of cdkElements.Processing) {
    let newSteps = translateProcessingElement(element);
    steps.push(...newSteps);
}

// add evidence steps
for (let element of cdkElements.Evidence) {
    let newSteps = translateEvidenceElement(element, outputFile);
    steps.push(...newSteps);
}

let yaml_struct = {
    "name": 'testing-pipeline',
    "on": {
        "workflow_run": {
            "workflows": ['create-pipeline'],
            "types": ['completed']
        }
    },
    "jobs": {
        "preprocessing_and_tests": {
            "runs-on": 'ubuntu-20.04',
            "steps": []
        }
    },
};

// step__x is a workaround to compensate for bugs in the yaml module (Bug: Wraps long strings to new lines)
for (let i = 0; i < steps.length; i++) {
    yaml_struct.jobs.preprocessing_and_tests.steps.push({...steps[i]});

    if (steps[i].run !== undefined) {
        yaml_struct.jobs.preprocessing_and_tests.steps[i].run = "step__" + String(i);
    }
}

// add summary step
yaml_struct.jobs.preprocessing_and_tests.steps.push({
    name: "test report",
    run: "cat " + outputFile + " >> $GITHUB_STEP_SUMMARY"
});

let yaml_string = yaml.stringify(yaml_struct);

// replace step__x with the run
for (let i = 0; i < steps.length; i++) {
    if (steps[i].run !== undefined) {
        yaml_string = yaml_string.replace('step__' + String(i), steps[i].run);
    }
}

process.stdout.write(yaml_string);

// -------------------- functions---------------------------------------------------------------------------------------

function translateProcessingElement(element) {
    let steps = [];

    for (let prerequisite of element.Prerequisites) {
        steps.push({
            name: "install prerequisites",
            run: prerequisite.attributes.method == "nodejs" ? "node " + prerequisite.attributes.source : prerequisite.attributes.source
        });
    }

    if (element.SimpleProcessing !== undefined) {
        // parse arguments
        let functionMethods = [];
        let functionArgs = [];

        for (let arg of element.Inputs.FunctionArgument) {
            functionMethods.push('"' + arg.attributes.method + '"');
            if (arg.attributes.method == "file") {
                functionArgs.push('"' + arg.attributes.source + '"');
            }
            else {
                functionArgs.push('"' + arg.attributes.content + '"')
            }
        }

        // compose step
        steps.push({
            name: element.SimpleProcessing.attributes.id,
            run: "node -e 'process.stdout.write(require(\"./util/wrapper/fcnWrapper.js\").wrapper(\"" + element.SimpleProcessing.attributes.packageUri + "\", \"" + element.SimpleProcessing.attributes.function + "\", [" + functionMethods.join(",") + "], [" + functionArgs.join(",") + "]))' > " + element.Outputs.Return.attributes.path
        });
    }

    if (element.ComplexProcessing !== undefined) {
        if (element.ComplexProcessing.attributes.method == "github-action") {
            // parse arguments
            let actionArgs = {};
            for (let input of element.Inputs.FunctionArgument) {
                actionArgs[input.attributes.name] = input.attributes.method == "inline" ? input.attributes.content : "tbd";
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
                if (arg.attributes.argument !== undefined)
                    clArgs.push(arg.attributes.argument) ;
            }

            steps.push({
                name: element.attributes.description.slice(0, 60) + "...",
                run: "node " + element.ComplexProcessing.attributes.source + " " + clArgs.join(" ") + " > " + element.Outputs.Output[0].attributes.path
            });
        }
    }

    return steps;
}

function translateEvidenceElement(element, outputPath) {
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
                    functionArgs.push('"' + arg.attributes.source + '"');
                }
                else {
                    functionArgs.push('"' + arg.attributes.content + '"')
                }
            }

            // compose step
            steps.push({
                name: test.attributes.id,
                run: "node -e 'process.stdout.write(JSON.stringify(require(\"./util/wrapper/fcnWrapper.js\").wrapper(\"" + metric.attributes.packageUri + "\", \"" + metric.attributes.function + "\", [" + functionMethods.join(",") + "], [" + functionArgs.join(",") + "])))' >> " + outputPath
            });
        }
    }

    return steps;
}