#!/usr/bin/env node
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
const svgoPlugins = [{ cleanupAttrs: true, }, { removeDoctype: true, }, { removeXMLProcInst: true, }, { removeComments: true, }, { removeMetadata: true, }, { removeTitle: true, }, { removeDesc: true, }, { removeUselessDefs: true, }, { removeEditorsNSData: true, }, { removeEmptyAttrs: true, }, { removeHiddenElems: true, }, { removeEmptyText: true, }, { removeEmptyContainers: true, }, { removeViewBox: false, }, { cleanupEnableBackground: true, }, { convertColors: true, }, { convertPathData: true, }, { convertTransform: true, }, { removeUnknownsAndDefaults: true, }, { removeNonInheritableGroupAttrs: true, }, { removeUselessStrokeAndFill: true, }, { removeUnusedNS: true, }, { cleanupIDs: true, }, { cleanupNumericValues: true, }, { moveElemsAttrsToGroup: true, }, { moveGroupAttrsToElems: true, }, { collapseGroups: true, }, { removeRasterImages: false, }, { mergePaths: true, }, { convertShapeToPath: true, }, { sortAttrs: true, }];
const program = require('commander');
program
    .name("svgshot")
    .usage("<urls...>")
    .description('take svg screenshots of webpages. requires the inkscape cli tool')
    .option('-s, --scale <scale>', 'scale of the render. must be between 1 and 2', 1)
    .option('--no-background', 'do not render backgounds')
    .option('--width <width>', 'Width; using px, mm or in (as though printed)', '1000px')
    .option('--height <height>', 'Height; using px, mm or in (as though printed)', '1000px')
    .option('--media <media>', 'CSS @page media', 'screen')
    .option('--timeout <milliseconds>', 'Maximum time to wait for page to become idle before taking screenshot', 10000)
    .option('--throttle <n>', 'Maximum number of pages to load at once. set to `1` for sequential operation', 10)
    .option('--block', "make text invisible for presentation (it's still in the file though)", false)
    .option('--headful', "run in a visible chromium instance (useful for debugging). also implicitly retains the chromium instance", false);
program.parse(process.argv);
const { background, width, height, media, scale, timeout, throttle: throttleN, block, headful } = program;
const args = program.args;
const isValidMedia = (s) => s == "screen" || s == "print";
if (!isValidMedia(media))
    throw new Error(`invalid media type ${media}; must be "screen" or "print"`);
const map = async function* (f, iter) {
    let n = 0;
    for await (let value of iter)
        yield (await f)(value, n++);
};
const chunk = (size) => (iter) => (async function* () {
    let bucket = [];
    for await (let value of iter) {
        bucket.push(value);
        if (bucket.length == await size) {
            yield bucket;
            bucket = [];
        }
    }
})();
const EventuallyIterable = async function* (I) {
    for await (let value of I)
        yield await value;
};
/** perform a promise iterator lazily in chunks */
const chunkedPromise = (N) => (I) => map(v => Promise.all(v), chunk(N)(I));
;
const flat = async function* (I) {
    for await (let chunk of I)
        for await (let member of chunk)
            yield member;
};
/** lazily completes the given async iterable in chunks of given size */
const throttle = N => I => flat(EventuallyIterable(chunkedPromise(N)(I)));
const main = async () => {
    const browser = await puppeteer_1.default.launch({
        headless: !headful,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] // unfortunate, but needed to work with wsl...
    });
    const captures = map(async (url, i) => {
        console.warn("loading", url);
        const loading = setInterval(() => {
            console.warn("still loading", url);
        }, timeout / 2);
        const page = await browser.newPage();
        try {
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout
            });
        }
        catch (e) {
            // if the network doesn't go idle, we still take the screenshot
        }
        clearInterval(loading);
        if (block) {
            const loading = setInterval(() => {
                console.warn("waiting for injected style...", url);
            }, timeout / 2);
            await page.evaluate(() => {
                const s = document.createElement("style");
                s.innerHTML = `* { color: transparent !important }`;
                document.head.appendChild(s);
                /*
                const d = window.document;
                const y = d.createTreeWalker(d.body, 4);
                for(;y.nextNode();y.currentNode.textContent=y.currentNode!.textContent!.replace(/\S/g, '…'));
                */
            });
            clearInterval(loading);
        }
        await page.emulateMediaType(media);
        const pdf = await page.pdf({
            scale: scale,
            printBackground: background,
            width: width,
            height: height,
            margin: { top: 0, right: 0, left: 0, bottom: 0 }
        });
        const [pdfFile, svgFile] = await Promise.all(['.pdf', '.svg'].map(async (extension) => {
            return new Promise((ok, err) => {
                tmp.file({ postfix: extension }, (error, path) => {
                    if (error)
                        return err(error);
                    return ok(path);
                });
            });
        }));
        await util_1.promisify(fs_1.writeFile)(pdfFile, pdf);
        const line = `inkscape --without-gui ${pdfFile} --export-plain-svg ${svgFile}`;
        try {
            await util_1.promisify(child_process_1.exec)(line);
        }
        catch (e) {
            throw new Error(`failed to run ${line} with ${e} -- make sure you have inkscape installed and in your PATH`);
        }
        const svgo = new svgo_1.default({
            plugins: svgoPlugins
        });
        const title = ((await page.title()).trim() || page.url()).replace(/[^A-z_-]/g, "_");
        const fileName = title + ".svg";
        const svgContents = await util_1.promisify(fs_1.readFile)(svgFile, 'utf8');
        const optimSvg = await svgo.optimize(svgContents.toString(), { path: svgFile });
        console.warn(`writing ${i + 1}/${args.length} ${fileName} (${width} x ${height})`);
        await util_1.promisify(fs_1.writeFile)(fileName, optimSvg.data);
    }, args);
    for await (let _ of throttle(throttleN)(captures))
        ;
    if (!headful)
        await browser.close();
};
main().catch(e => { console.error(e); process.exit(1); }).then(() => process.exit(0));
