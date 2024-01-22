const fs = require("fs");

let parameterPaths = [];
let parameters = [];

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "-p" || process.argv[i] === "--parameters") {
        for (let j = i+1; j < process.argv.length; j++)
            parameterPaths.push(process.argv[j]);
    }
}

if(parameterPaths.length == 0)
    throw("at least 1 ScalarParameter must be given, use -p or --parameters to indicate its path");

for (let parameterPath of parameterPaths) {
    let parameterString = fs.readFileSync(parameterPath, "utf-8");
    parameters.push(JSON.stringify(JSON.parse(parameterString))); // JSON.stringify(JSON.parse()) prevents integrating '\n's
}

process.stdout.write(JSON.stringify(parameters));