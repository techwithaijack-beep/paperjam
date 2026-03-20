#!/usr/bin/env node
import { Command } from 'commander';
import { runDemo, runAnalyze } from '../src/index.js';

const program = new Command();
program
  .name('paperjam')
  .description('Chaos engineering for OCR: fuzz document images and generate a fragility report.')
  .version('0.1.0');

program
  .command('demo')
  .description('Run the built-in demo using the bundled sample invoice image.')
  .option('-o, --out <dir>', 'Output directory', 'out/demo')
  .action(async (options) => {
    await runDemo(options);
  });

program
  .command('analyze')
  .description('Analyze a custom image file with paperjam variants + OCR.')
  .requiredOption('-i, --input <path>', 'Path to image file')
  .option('-o, --out <dir>', 'Output directory', 'out/custom')
  .action(async (options) => {
    await runAnalyze(options);
  });

program.parseAsync(process.argv);
