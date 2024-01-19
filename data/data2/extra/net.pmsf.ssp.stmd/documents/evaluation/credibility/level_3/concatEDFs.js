const fs = require('fs');
const path = require("path");

let outputFile;

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "-o" || process.argv[i] === "--output") {
        outputFile = process.argv[i+1];
    }
}

let edfs = [];

for (let trial = 1; trial <= 10; trial++) {
    let edfString = fs.readFileSync(path.resolve(__dirname,"./data/uq_res/edf_"+trial+".json"))
    edfs.push(JSON.parse(edfString));
}

fs.writeFileSync(outputFile, JSON.stringify(edfs));