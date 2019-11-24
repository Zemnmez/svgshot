#!/usr/bin/env node
import puppeteer from 'puppeteer';
import * as tmp from 'tmp';
import { exec } from 'child_process';
import SVGO from 'svgo'
import { fstat, exists } from 'fs';
import { writeFile, readFile } from 'fs';
import { promisify } from 'util';

const svgoPlugins = [{ cleanupAttrs: true, }, { removeDoctype: true, },{ removeXMLProcInst: true, },{ removeComments: true, },{ removeMetadata: true, },{ removeTitle: true, },{ removeDesc: true, },{ removeUselessDefs: true, },{ removeEditorsNSData: true, },{ removeEmptyAttrs: true, },{ removeHiddenElems: true, },{ removeEmptyText: true, },{ removeEmptyContainers: true, },{ removeViewBox: false, },{ cleanupEnableBackground: true, },{ convertColors: true, },{ convertPathData: true, },{ convertTransform: true, },{ removeUnknownsAndDefaults: true, },{ removeNonInheritableGroupAttrs: true, },{ removeUselessStrokeAndFill: true, },{ removeUnusedNS: true, },{ cleanupIDs: true, },{ cleanupNumericValues: true, },{ moveElemsAttrsToGroup: true, },{ moveGroupAttrsToElems: true, },{ collapseGroups: true, },{ removeRasterImages: false, },{ mergePaths: true, },{ convertShapeToPath: true, },{ sortAttrs: true, }];


const program = require('commander');
program
    .command('svgshot <urls...>')
    .description('take svg screenshots of webpages. requires the inkscape cli tool')
    .option('-s, --scale <scale>', 'scale of the render. must be between 1 and 2', 1)
    .option('--no-background', 'do not render backgounds')
    .option('--width <width>', 'Width; using px, mm or in (as though printed)', '1000px')
    .option('--height <height>', 'Height; using px, mm or in (as though printed)', '1000px')
    .option('--media <media>', 'CSS @page media', 'screen')
    program.parse(process.argv);

const {background, width, height, media, scale} = (program.commands[0] as {
    background: boolean,
    width: string,
    height: string,
    scale: number,
    media: string,
});

const args = program.args as Array<string>;

const isValidMedia = (s: string): s is "screen" | "print" => 
    s == "screen" || s == "print";

if (!isValidMedia(media)) throw new Error(`invalid media type ${media}; must be "screen" or "print"`);

const main = async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // unfortunate, but needed to work with wsl...
    });


    const promises = args.map(async (url: string) => {
        console.log("loading", url);
        const page = await browser.newPage();
        await page.goto(url, {waitUntil: 'networkidle2'});
        await page.emulateMediaType(media);
        const pdf = await page.pdf({
            scale: scale,
            printBackground: background,
            width: width,
            height: height,
            margin: {top: 0, right: 0, left: 0, bottom: 0}
        });

        const [pdfFile, svgFile] = await Promise.all(['.pdf','.svg'].map(async (extension): Promise<string> => {
            return await new Promise((ok, err) => {
                tmp.file({ postfix: extension},(error, path) => {
                    if (error) return err(error);
                    ok(path);
                })
            })
        }));

        await promisify(writeFile)(pdfFile, pdf);

        const line = `inkscape --without-gui ${pdfFile} --export-plain-svg ${svgFile}`;
        try {
            await promisify(exec)(line);
        } catch(e) {
            throw new Error(`failed to run ${line} with ${e} -- make sure you have inkscape installed and in your PATH`)
        }
        
        const svgo = new SVGO({
            plugins: svgoPlugins
        });

        const title = (await page.title()).replace(/[^A-z_-]/g, "_");
        const fileName = title + ".svg";

        const svgContents = await promisify(readFile)(svgFile, 'utf8');
        const optimSvg = await svgo.optimize(svgContents.toString(), {path: svgFile});


        console.log(`writing ${fileName} (${width} x ${height})`);
        await promisify(writeFile)(fileName, optimSvg.data);
    });

    await Promise.all(promises);
}



main().catch(e => {console.error(e); process.exit(1)}).then(() => process.exit(0))