const fs = require('fs');
const path = require('path')

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
    valueOutput = "### CDK Report :rocket: \n| Phase | Step | Test passed | Reached Level | Result | \n | ---- | ---- | ---- | ---- | ---- | \n"
    let allActionList = process.env.allActionList;
    
    let actionList = allActionList.split(",");
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
            let rsFullObj = [];
            let minLevel = 3;
            for (let e in rs) {
                var rsobj = JSON.parse(rs[e]);
                if (rsobj["result"] == true) {
                    passedCount ++;
                } else if (parseInt(rsobj["level"]) <= minLevel) {
                    minLevel = parseInt(rsobj["level"]) - 1;
                }
                rsFullObj.push(rsobj);
            }

            if (minLevel < reportByPhase[phaseName]["reachedLevel"]) {
                reportByPhase[phaseName]["reachedLevel"] = minLevel;
            }
            let fileName = actionList[a].replaceAll("_",".");
            let fileURL = "https://github.com/"+process.env.GithubOwner+"/"+process.env.GithubRepoName+"/blob/"+process.env.GithubBranch+"/.github/outputs/"+fileName+".json";

            valueOutput += "| "+phaseName+" | "+stepName+" | "+passedCount+"/"+ rs.length + "|" + minLevel +" | [view]("+fileURL+") | \n"

            fs.writeFileSync("./.github/outputs/"+fileName+".json", JSON.stringify(rsFullObj, null, 4));
        }
    }

    valueOutput += "#### Phase Report \n| Phase | Reached Level | \n | ---- | ---- | \n"
    for (let p in reportByPhase) {
        valueOutput += "|"+ reportByPhase[p]["phaseName"] + "|" + reportByPhase[p]["reachedLevel"] + "| \n"
    }

    fs.writeFileSync(outputFilePath, valueOutput)
}

