const fs = require('fs');
const path = require('path')

// node ./util/stmd/parse_to_yaml.js -f "./data/demonstration-test/extra/net.pmsf.ssp.stmd/SimulationTask.stmd" -o ./.github/workflows/

let isSinglePhase = false;
let value;
let outputFilePath;

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "-p") {
        value = JSON.parse(process.argv[i+1]);
        isSinglePhase = true;
    }
    if (process.argv[i] === "-s") { //summary, input as folder name
        value = "summary";       
        isSinglePhase  = false;
    }
    if (process.argv[i] === "-o") {
        outputFilePath = process.argv[i+1];
    }
}

if (!value || !outputFilePath)
    throw("Invalid input")

var valueOutput;

try {
    valueOutput = JSON.parse(fs.readFileSync(outputFilePath));
}catch(e) {
}

if (!valueOutput) {
    if (isSinglePhase) {
        valueOutput = [];
    }
}

if (isSinglePhase == true) {
    valueOutput.push(value);
    fs.writeFileSync(outputFilePath, JSON.stringify(valueOutput))
} else {
    // valueOutput = {...valueOutput, ...value}
    valueOutput = "### CDK Report :rocket: \n| Phase | Step | Test passed | Reached Level | Result | \n | ---- | ---- | ---- | ---- | ---- | \n"
    let allActionList = process.env.allActionList;
    console.log(allActionList)
    // console.log(JSON.stringify(process.env, null, 4))
    let actionList = allActionList.split(",");
    // const fileList = fs.readdirSync(folderPath)
    let reportByPhase = {};

    for (let a in actionList) {
        if (actionList[a]) {
            let phaseName = actionList[a].split("_")[2];
            if (!reportByPhase[phaseName]) {
                reportByPhase[phaseName] = {
                    "phaseName" : phaseName,
                    "reachedLevel" : 3
                }
            }
            let stepName = actionList[a].split("_")[3];
            let rs = JSON.parse(process.env[actionList[a]]);
            let passedCount = 0;

            let minLevel = 3;
            for (let e in rs) {
                if (rs[e]["result"] == true) {
                    passedCount ++;
                } else if (parseInt(rs[e]["level"]) <= minLevel) {
                    minLevel = parseInt(rs[e]["level"]) - 1;
                }
            }

            if (minLevel < reportByPhase[phaseName]["reachedLevel"]) {
                reportByPhase[phaseName]["reachedLevel"] = minLevel;
            }
            // https://github.com/levanthanh3005/upsim-ci-2/actions/workflows/No.0.RequirementsPhase.DefineModelRequirements.yaml
            let fileName = actionList[a].replaceAll("_",".");
            let fileURL = "https://github.com/levanthanh3005/upsim-ci-2/blob/main/.github/outputs/"+fileName+".json";

            valueOutput += "| "+phaseName+" | "+stepName+" | "+passedCount+"/"+ rs.length + "|" + minLevel +" | [view]("+fileURL+") | \n"

            fs.writeFileSync("./.github/outputs/"+fileName+".json", process.env[actionList[a]]);
        }
    }

    valueOutput += "#### Phase Report \n| Phase | Reached Level | \n | ---- | ---- | \n"
    for (let p in reportByPhase) {
        valueOutput += "|"+ reportByPhase[p]["phaseName"] + "|" + reportByPhase[p]["reachedLevel"] + "| \n"
    }

    fs.writeFileSync(outputFilePath, valueOutput)
    // node ./util/stmd/results.js -s ./.github/outputs -o summary.md
}

