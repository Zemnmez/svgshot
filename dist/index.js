"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const tmp = __importStar(require("tmp"));
const child_process_1 = require("child_process");
const svgo_1 = __importDefault(require("svgo"));
const fs_1 = require("fs");
const util_1 = require("util");
const svgoPlugins = [{ cleanupAttrs: true, }, { removeDoctype: true, }, { removeXMLProcInst: true, }, { removeComments: true, }, { removeMetadata: true, }, { removeTitle: true, }, { removeDesc: true, }, { removeUselessDefs: true, }, { removeEditorsNSData: true, }, { removeEmptyAttrs: true, }, { removeHiddenElems: true, }, { removeEmptyText: true, }, { removeEmptyContainers: true, }, { removeViewBox: false, }, { cleanupEnableBackground: true, }, { convertColors: true, }, { convertPathData: true, }, { convertTransform: true, }, { removeUnknownsAndDefaults: true, }, { removeNonInheritableGroupAttrs: true, }, { removeUselessStrokeAndFill: true, }, { removeUnusedNS: true, }, { cleanupIDs: true, }, { cleanupNumericValues: true, }, { moveElemsAttrsToGroup: true, }, { moveGroupAttrsToElems: true, }, { collapseGroups: true, }, { removeRasterImages: false, }, { mergePaths: true, }, { convertShapeToPath: true, }, { sortAttrs: true, }, { removeDimensions: true, }];
const program = require('commander');
program
    .command('svgshot <urls...>')
    .description('take svg screenshots of webpages')
    .option('-s, --scale <scale>', 'scale of the render. must be between 1 and 2', 1)
    .option('--no-background', 'do not render backgounds')
    .option('--width <width>', 'Width; using px, mm or in (as though printed)', '500px')
    .option('--height <height>', 'Height; using px, mm or in (as though printed)', '500px')
    .option('--media <media>', 'CSS @page media', 'screen');
program.parse(process.argv);
const { background, width, height, media, scale } = program.commands[0];
const args = program.args;
const isValidMedia = (s) => s == "screen" || s == "print";
if (!isValidMedia(media))
    throw new Error(`invalid media type ${media}; must be "screen" or "print"`);
console.log("reached main");
const main = async () => {
    const browser = await puppeteer_1.default.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // unfortunate, but needed to work with wsl...
    });
    const promises = args.map(async (url) => {
        console.log("loading page", url);
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });
        await page.emulateMediaType(media);
        const pdf = await page.pdf({
            scale: scale,
            printBackground: background,
            width: width,
            height: height,
            margin: { top: 0, right: 0, left: 0, bottom: 0 }
        });
        console.log("setting up inkscape stream");
        const [pdfFile, svgFile] = await Promise.all(['.pdf', '.svg'].map(async (extension) => {
            return await new Promise((ok, err) => {
                tmp.file({ postfix: extension }, (error, path) => {
                    if (error)
                        return err(error);
                    ok(path);
                });
            });
        }));
        await util_1.promisify(fs_1.writeFile)(pdfFile, pdf);
        await new Promise((ok, fail) => {
            console.log(process.env.PATH);
            const ink = child_process_1.spawn("inkscape", ["--without-gui", pdfFile, "--export-plain-svg", svgFile], {});
            ink.stdout.on('data', data => console.log(data));
            ink.on('close', ok);
            ink.stderr.on('data', d => console.log(d));
            ink.on('error', fail);
        });
        const svgo = new svgo_1.default({
            plugins: svgoPlugins
        });
        const title = (await page.title()).replace(/[^A-z_-]/g, "_");
        const fileName = title + ".svg";
        const svgContents = await util_1.promisify(fs_1.readFile)(pdfFile);
        const optimSvg = await svgo.optimize(svgContents.toString(), { path: pdfFile });
        console.log("writing", fileName);
        await util_1.promisify(fs_1.writeFile)(fileName, optimSvg);
    });
    await Promise.all(promises);
};
main().catch(e => { console.error(e); process.exit(1); }).then(() => process.exit(0));
