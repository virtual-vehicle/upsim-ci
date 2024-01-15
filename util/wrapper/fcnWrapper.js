const fs = require('fs');
const path = require('path')

exports.wrapper = (packageUri, functionToRun, argTypes, args, metadata) => {
    const moduleToImport = require("../../" + packageUri);

    let functionArguments = [];
    var stmdFolderPath = process.env["STMDFOLDERPATH"];

    for(let i = 0; i < args.length; i++) {
        if (argTypes[i] == "file")
            functionArguments.push(fs.readFileSync(path.resolve(stmdFolderPath, String(args[i])), "utf-8"));
        else
            functionArguments.push(String(args[i]));
    }    

    let rs;
    try {
        rs = moduleToImport[functionToRun](...functionArguments);
    } catch (e) {
        rs = {
            "result":false,
            "log": e.toString()
        }
    }

    if (metadata) {
        rs = {...rs, ...metadata}
    }
    return rs;
}