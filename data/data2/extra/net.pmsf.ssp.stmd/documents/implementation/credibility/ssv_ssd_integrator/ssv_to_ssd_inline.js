const { XMLParser, XMLBuilder } = require("fast-xml-parser");
const fs = require("fs");
const path = require("path");

const ATTRIBUTES_TO_REMOVE_FROM_PARAMETERSET = [
    "xmlns:ssc",
    "xmlns:ssv",
    "xmlns:xsi",
    "xsi:schemaLocation",
    "generationDateAndTime",
    "author",
    "fileversion",
    "copyright",
    "license",
    "generatingTool",
    "generationDateAndTime"
];

let ssdFileIn;

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "-i" || process.argv[i] === "--input")
        ssdFileIn = process.argv[i+1];
}

if (ssdFileIn === undefined)
    throw("ssd input file must be given, use -i or --input")

const ssdString = fs.readFileSync(ssdFileIn, "utf-8");
let parsedSsd = parseSSD(ssdString);

for (let i = 0; i < parsedSsd["ssd:SystemStructureDescription"]["ssd:System"][0]["ssd:Elements"]["ssd:Component"].length; i++) {
    let ssdComponent = parsedSsd["ssd:SystemStructureDescription"]["ssd:System"][0]["ssd:Elements"]["ssd:Component"][i];

    if (ssdComponent["ssd:ParameterBindings"]["ssd:ParameterBinding"]["@_source"] === undefined) continue;

    // check if relative path is used or absolute path
    let ssvFile;
    if (ssdComponent["ssd:ParameterBindings"]["ssd:ParameterBinding"]["@_source"][0] === ".") {
        // relative path
        let ssvRoot;
        if (ssdComponent["ssd:ParameterBindings"]["ssd:ParameterBinding"]["@_sourceBase"] === "component")
            ssvRoot = path.dirname(ssdComponent["@_source"]); 
        else
            ssvRoot = path.dirname(ssdFileIn);

        ssvFile = path.join(ssvRoot, ssdComponent["ssd:ParameterBindings"]["ssd:ParameterBinding"]["@_source"]);
    }
    else {
        // absolute path
        ssvFile = ssdComponent["ssd:ParameterBindings"]["ssd:ParameterBinding"]["@_source"];
    }

    let ssvString = fs.readFileSync(ssvFile, "utf-8");
    let parsedSsv = parseSSV(ssvString);
    let parameterSet = parsedSsv["ssv:ParameterSet"];

    // remove namespace information and other redundant attributes from parameter set
    for (let attribute of ATTRIBUTES_TO_REMOVE_FROM_PARAMETERSET)
        parameterSet["@_"+attribute] = undefined;    

    // delete external parameter binding
    ssdComponent["ssd:ParameterBindings"]["ssd:ParameterBinding"]["@_source"] = undefined;

    // include parameters inline
    ssdComponent["ssd:ParameterBindings"]["ssd:ParameterBinding"]["ssd:ParameterValues"] = {"ssv:ParameterSet": undefined};
    ssdComponent["ssd:ParameterBindings"]["ssd:ParameterBinding"]["ssd:ParameterValues"]["ssv:ParameterSet"] = parameterSet;
}

const newSsdString = writeSSD(parsedSsd);
process.stdout.write(newSsdString);

/**
 * 
 * @param {object} ssdObject 
 * @returns {string}
 */
function writeSSD(ssdObject) {
    const options = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        suppressUnpairedNode: false,
        unpairedTags: [
            "ssd:ParameterBinding",
            "ssd:Connection",
            "ssd:DefaultExperiment",
            "ssv:Real",
            "ssv:Integer",
            "ssv:Boolean",
            "ssv:String",
            "ssv:Enumeration",
            "ssv:Binary",
            "ssc:Real",
            "ssc:Integer",
            "ssc:Boolean",
            "ssc:String",
            "ssc:Enumeration",
            "ssc:Binary",
            "ssc:BaseUnit",
            "ssc:Annotation"]
    };
    const writer = new XMLBuilder(options);

    return writer.build(ssdObject);
}

/**
* @param {string} ssdString
* @return {object}
*/
function parseSSD(ssdString) {
    const parserOptions = {
        ignoreAttributes : false,
        attributeNamePrefix: "@_",
        isArray: (tagName, tagValue) => {
            if(tagName == 'ssd:Connector' || 
                tagName == 'ssd:Connection' || 
                tagName == 'ssd:Component' || 
                tagName == 'ssd:SignalDictionaryReference' || 
                tagName == 'ssd:System') return true;
            else return false;
        }
    };
    const xmlParser = new XMLParser(parserOptions);

    return xmlParser.parse(ssdString);
}

/**
 * @param {string} ssvString 
 * @returns {object}
 */
function parseSSV(ssvString) {
    const options = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        isArray: (tagName, _) => {
            if(tagName == 'ssv:Parameter' ||
                tagName == 'ssc:Item' ||
                tagName == 'ssc:Unit' ||
                tagName == 'ssc:Annotation') return true;
            else return false;
        }
    };
    const parser = new XMLParser(options);

    return parser.parse(ssvString);
}