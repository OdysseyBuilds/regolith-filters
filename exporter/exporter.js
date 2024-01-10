const archiver = require('archiver');
const fs = require('fs');

const validPackTypes = ['BP', 'RP'];
const validPackTargetTypes = ['mcaddon', 'addon'];
const validWorldTargetTypes = ['mcworld', 'world', 'mctemplate', 'template'];
const validTargetTypes = ['mcaddon', 'addon', 'mcworld', 'world', 'mctemplate', 'template'];

let settings = process.argv[2];
let outputPath = '../../build';
let name;
let target;
let exclude = [];

let config;
let bpPath;
let rpPath;
let wtPath;


function init() {
    settings = JSON.parse(settings);

    // Give "exclude" proprer exclusions if they exist and format them
    exclude = settings.exclude || exclude;
    exclude = exclude.map(exclusion => exclusion.toUpperCase()).filter(exclusion => validPackTypes.includes(exclusion));

    // Return if "config.json" does not exist in proper directory
    try {
        config = JSON.parse(fs.readFileSync("../../config.json"));
    } catch (error) {
        console.warn('No valid config.json file detected.');
        return;
    }

    // Return if "name" does not exist in "settings" or "config.json"
    if (!settings.name && !config.name) {
        console.warn('No name defined in settings or config.json.');
        return;
    }
    name = settings.name || config.name;

    // Keeps name in settings if defined
    if (!settings.name) {
        name = stringToTitle(name);
    };

    target = settings.target.toLowerCase();
    // Return if "target" does not exist in "settings"
    if (!target && !validTargetTypes.includes(target)) {
        console.warn('No valid export target defined.');
        return;
    }

    wtPath = config.packs.worldTemplate;
    // Return if user tries to export a world and "worldTemplate" path does not exist in "packs"
    if (validWorldTargetTypes.includes(target) && !validateConfigFilepath(wtPath)) {
        console.warn('No valid worldTemplate path defined.');
        return;
    }

    bpPath = config.packs.behaviorPack;
    // Add behavior pack to exclusion list if not defined
    if (!bpPath && !exclude.includes('BP')) exclude.push('BP');
    // Return if "behaviorPack" path does not exist in "packs"
    if (!bpPath && !exclude.includes('BP') && !validateConfigFilepath(bpPath)) {
        console.warn('No valid behaviorPack path defined.');
        return;
    }

    rpPath = config.packs.resourcePack;
    // Add resource pack to exclusion list if not defined
    if (!rpPath && !exclude.includes('RP')) exclude.push('RP');
    // Return if "resourcePack" path does not exist in "packs"
    if (!rpPath && !exclude.includes('RP') && !validateConfigFilepath(rpPath)) {
        console.warn('No valid resourcePack path defined.');
        return;
    }

    // Return if there are no packs to export
    if (exclude.includes('BP') && exclude.includes('RP') && validPackTargetTypes.includes(target)) {
        console.warn('No packs to export.');
        return;
    }

    // Create output path if it does not exist
    if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });

    switch (target) {
        case 'mcaddon': case 'addon': exportAddon(exclude); break;
        case 'mcworld': case 'world': exportWorld(false, exclude); break;
        case 'mctemplate': case 'template': exportWorld(true, exclude); break;
        default: console.warn('No valid export target defined.'); break;
    }
}

/**
 * Tests if given filepath is valid
 * @param {string} filepath The location of folder
 * @returns {boolean}
 */
function validateConfigFilepath(filepath) {
    // Return false if filepath does not exist in "packs"
    if (!filepath || typeof filepath !== 'string') return false;

    // Convert filepath to a string
    filepath = filepath.replace(/\//g, '\\');

    // Correct directory
    if (filepath.startsWith('.\\')) filepath = '..\\.' + filepath;
    if (filepath.endsWith('\\')) filepath = filepath.slice(0, -1);

    // Return false if filepath does not exist
    return fs.existsSync(filepath);
}

/**
 * Converts any string to a title
 * @param {string} inputString The string to be converted
 * @returns {string}
 * @example
 * const titleString = stringToTitle('my-map_title');
 * console.log(titleString); // Output: My Map Title
 */
function stringToTitle(inputString) {
    // Split input string into words using hyphens, underscores, and spaces as separators
    const words = inputString.split(/[-_ ]+/);

    // Capitalize first letter of each word and join them with spaces
    const result = words.map(word => word.charAt(0) + word.slice(1)).join(' ');

    return result;
}

/**
 * Exports an .mcaddon file
 * @param {string[]} isTemplate - If export is a template
 */
function exportAddon(exclude = []) {
    // Create an output file stream for exporting pack file
    const outputAddon = fs.createWriteStream(`../../build/${name}.mcaddon`, 'utf-8');
    const archiveAddon = archiver('zip', { zlib: { level: 9 } });

    // Filter and add selected packs to archive
    validPackTypes.filter(packtype => !exclude.some(exclusion => exclusion === packtype)).forEach(pack => {
        // For each pack not in exclude list, add it to archive
        archiveAddon.directory(pack, `${name} ${pack}`);
    });

    // Handle errors during archive process
    archiveAddon.on('error', err => console.error(err));

    // Pipe archive to output .mcaddon file and finalize
    archiveAddon.pipe(outputAddon);
    archiveAddon.finalize();
}

/**
 * Exports an .mcworld or .mctemplate file
 * @param {boolean} isTemplate - If export is a template
 * @param {string[]} exclude - An array of packs to exclude
 */
function exportWorld(isTemplate = false, exclude = []) {// Create an output file stream for exporting world file
    const output = fs.createWriteStream(outputPath + `/${name}.` + (isTemplate ? 'mctemplate' : 'mcworld'), 'utf-8');
    const worldArchive = archiver('zip', { zlib: { level: 9 } });

    // Filter and add selected packs to archive
    validPackTypes.filter(packtype => !exclude.some(exclusion => exclusion === packtype)).forEach(pack => {
        // For each pack not in exclude list, add it to archive
        switch (pack) {
            case 'BP':
                // Read manifest files for behavior pack (bp)
                const bp = JSON.parse(fs.readFileSync(`../../${bpPath}/manifest.json`));

                // Create header for behavior pack
                const headerBP = [{ "pack_id": bp.header.uuid, "version": bp.header.version }];

                // Write header to JSON file
                fs.writeFileSync('world_behavior_packs.json', JSON.stringify(headerBP));

                // Add directory to archive
                worldArchive.directory(`../../${bpPath}/`, `behavior_packs/${name} BP`);
                break;
            case 'RP':
                // Read manifest files for resource pack (rp)
                const rp = JSON.parse(fs.readFileSync(`../../${rpPath}/manifest.json`));

                // Create header for resource pack
                const headerRP = [{ "pack_id": rp.header.uuid, "version": rp.header.version }];

                // Write header to JSON file
                fs.writeFileSync('world_resource_packs.json', JSON.stringify(headerRP));

                // Add directory to archive
                worldArchive.directory(`../../${rpPath}/`, `resource_packs/${name} RP`);
                break;
            default:
                break;
        }
    });

    // Add directories and files to archive
    worldArchive.directory(`../../${wtPath}/db/`, 'db/');
    worldArchive.file(`../../${wtPath}/level.dat`, { name: 'level.dat' });
    worldArchive.file(`../../${wtPath}/levelname.txt`, { name: 'levelname.txt' });
    worldArchive.file(`../../${wtPath}/world_icon.jpeg`, { name: 'world_icon.jpeg' });
    worldArchive.file('world_resource_packs.json', { name: 'world_resource_packs.json' });
    worldArchive.file('world_behavior_packs.json', { name: 'world_behavior_packs.json' });

    // Add template files to archive if requested
    if (isTemplate) {
        worldArchive.directory(`../../${wtPath}/texts/`, 'texts/');
        worldArchive.file(`../../${wtPath}/manifest.json`, { name: 'manifest.json' });
    }

    // Handle errors during archive process
    worldArchive.on('error', err => console.error(err));

    // Pipe archive to output file stream and finalize archive
    worldArchive.pipe(output);
    worldArchive.finalize();
}

init();