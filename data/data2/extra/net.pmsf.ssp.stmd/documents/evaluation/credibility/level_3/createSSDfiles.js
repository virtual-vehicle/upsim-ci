const fs = require("fs");
const path = require("path");


const ssvCrud = require(path.resolve(process.cwd(), "./Credibility-Assessment-Framework/Credibility-Development-Kit/util/ssv-crud"));
const ssvInline = require(path.resolve(__dirname,"./ssv_ssd_integrator/ssv_to_ssd_inline"));

const ssvAssignments = new Map();
ssvAssignments.set('R', path.resolve(__dirname,'./resources_local/parameters/electrics.ssv'));
ssvAssignments.set('c_mot', path.resolve(__dirname,'./resources_local/parameters/electrics.ssv'));
ssvAssignments.set('J', path.resolve(__dirname,'./resources_local/parameters/mechanics.ssv'));
ssvAssignments.set('d', path.resolve(__dirname,'./resources_local/parameters/mechanics.ssv'));

let samplesPath, outputFolder;

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "-s" || process.argv[i] === "--samples")
        samplesPath = process.argv[i+1];
    if (process.argv[i] === "-o" || process.argv[i] === "--output") {
        outputFolder = process.argv[i+1];
        
        if (!fs.existsSync(outputFolder)){
            fs.mkdirSync(outputFolder, { recursive: true });
        }
        // console.log("Check folder existed:", fs.existsSync(outputFolder))
    }
}

const samplesString = fs.readFileSync(samplesPath, 'utf-8');
const parameterSamples = JSON.parse(samplesString);

let iTrial = 0;

for (let trialSet of parameterSamples.values) {
    iTrial++;
    let iRun = 0;

    for (let valuesSet of trialSet) {
        iRun++;

        for (let i = 0; i < valuesSet.length; i++) {
            let parameterName = parameterSamples.names[i];
            let ssvPath = ssvAssignments.get(parameterName);
            let ssvString = fs.readFileSync(ssvPath, 'utf-8');
            let newSsdString = ssvCrud.changeParameter(ssvString, parameterName, valuesSet[i]);
            fs.writeFileSync(ssvPath, newSsdString);
        }
        var ssvOutPath = path.join(outputFolder, "dc_motor_system_trial_" + iTrial + "_run_" + iRun + ".ssd");

        ssvInline.integrateSsvIntoSsd(path.resolve(__dirname,"./resources_local/system/dc_motor_system.ssd"), ssvOutPath);
    }
}