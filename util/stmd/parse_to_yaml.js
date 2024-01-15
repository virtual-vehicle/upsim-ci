const { StmdCrud } = require('../../Credibility-Assessment-Framework/Credibility-Development-Kit/util/stmd-crud');
const {jsonToYaml, allToYaml} = require('./json_to_yaml.js')
const fs = require('fs');
const path = require('path')

// node ./util/stmd/parse_to_yaml.js -f "./data/demonstration-test/extra/net.pmsf.ssp.stmd/SimulationTask.stmd" -o ./.github/workflows/

let stmdString;
let stmdFolderPath;
let outputFolder;

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "-s" || process.argv[i] === "--stmd") {
        stmdString = process.argv[i+1];
    }
    if (process.argv[i] === "-f") {
        stmdString = fs.readFileSync(process.argv[i+1]);
        stmdFolderPath=path.resolve(path.dirname(process.argv[i+1]));
    }
    if (process.argv[i] === "-o") {
        outputFolder = process.argv[i+1];
    }
}

if (stmdString === undefined)
    throw("STMD string must be given, use -s or --stmd")

let crud = new StmdCrud(stmdString);

var lsRationale = crud.findAllParticleLocation("stc:Rationale")

var count = 0;

var workflowNameList = [];

for (let r of lsRationale) {
    // if (count < 2 ) {
        let fileName = r[1].split(":")[1]+"."+r[2].split(":")[1];
        let workflowName = "No_"+count+"_"+fileName.replace(".","_");
        workflowNameList.push(workflowName);
        let yamlContent = jsonToYaml(crud.getCdkElement(r), "No."+count+"."+fileName+".cdkResult.json", workflowName, stmdFolderPath)
        fs.writeFileSync(outputFolder + "/No."+count+"."+ fileName+".yaml", yamlContent);
    // }
    count = count + 1;
}

let allYamlContent = allToYaml(workflowNameList)
fs.writeFileSync(outputFolder + "/all.yaml", allYamlContent);

