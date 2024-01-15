const { StmdCrud } = require('../../Credibility-Assessment-Framework/Credibility-Development-Kit/util/stmd-crud');

let stmdString;

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "-s" || process.argv[i] === "--stmd")
        stmdString = process.argv[i+1];
}

if (stmdString === undefined)
    throw("STMD string must be given, use -s or --stmd")

let crud = new StmdCrud(stmdString);

process.stdout.write(JSON.stringify(crud.getCdkElement(["stmd:SimulationTaskMetaData", "stmd:ImplementationPhase", "stmd:ImplementModel", "stc:Rationale"])));