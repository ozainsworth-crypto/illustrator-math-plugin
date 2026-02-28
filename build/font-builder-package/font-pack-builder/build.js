#!/usr/bin/env node

/**
 * Font Pack Builder - 主入口
 * 
 * 将用户 TTF/OTF 字体转换为 MathJax 兼容的字体包
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { FontPackBuilder } from './src/font-pack-builder.js';

const program = new Command();

program
  .name('font-pack-builder')
  .description('将 TTF/OTF 字体转换为 MathJax 兼容的字体包')
  .version('1.0.0')
  .requiredOption('-i, --input <path>', '输入字体文件路径（TTF/OTF）')
  .requiredOption('-o, --output <path>', '输出目录路径')
  .requiredOption('-n, --name <name>', '字体包名称')
  .option('-b, --base-fontdata <path>', 'MathJax 基础 fontdata 模板路径（可选）')
  .option('--enable-optional', '启用 extended-math-optional 字符集', false)
  .option('--enable-advanced', '启用 extended-math-advanced 字符集', false)
  .option('--enable-text-symbols', '启用 extended-text-symbols 字符集', false)
  .option('--base-only', '仅使用 base 字符集（禁用所有扩展）', false)
  .option('--enable-path-centering', '启用运算符 path 居中修正（默认关闭）', false)
  .parse(process.argv);

const options = program.opts();

async function main() {
  console.log(chalk.blue.bold('\n🔧 Font Pack Builder\n'));
  console.log(chalk.gray('输入字体:'), options.input);
  console.log(chalk.gray('输出目录:'), options.output);
  console.log(chalk.gray('字体包名称:'), options.name);
  console.log(chalk.gray('字符集模式:'), options.baseOnly ? 'base-only' : 'base + extended-math-default');
  if (options.enableOptional) console.log(chalk.gray('  + extended-math-optional'));
  if (options.enableAdvanced) console.log(chalk.gray('  + extended-math-advanced'));
  if (options.enableTextSymbols) console.log(chalk.gray('  + extended-text-symbols'));
  console.log(chalk.gray('Path 居中:'), options.enablePathCentering ? '启用' : '禁用');
  console.log();

  try {
    const builder = new FontPackBuilder({
      inputFont: options.input,
      outputDir: options.output,
      fontName: options.name,
      baseFontdata: options.baseFontdata,
      enableOptional: options.enableOptional,
      enableAdvanced: options.enableAdvanced,
      enableTextSymbols: options.enableTextSymbols,
      baseOnly: options.baseOnly,
      enablePathCentering: options.enablePathCentering
    });

    console.log(chalk.yellow('⏳ 开始构建字体包...\n'));
    
    const manifest = await builder.build();

    console.log(chalk.green.bold('\n✅ 字体包构建成功！\n'));
    console.log(chalk.gray('字体包名称:'), manifest.name);
    console.log(chalk.gray('字体族:'), manifest.family);
    console.log(chalk.gray('格式:'), manifest.format);
    console.log(chalk.gray('覆盖范围:'));
    console.log(chalk.gray('  - 大写字母:'), manifest.coverage.uppercase.length, '个');
    console.log(chalk.gray('  - 小写字母:'), manifest.coverage.lowercase.length, '个');
    console.log(chalk.gray('  - 数字:'), manifest.coverage.digits.length, '个');
    
    if (manifest.failures && manifest.failures.length > 0) {
      console.log(chalk.yellow('\n⚠️  失败的字符:'), manifest.failures.join(', '));
    }
    
    console.log(chalk.gray('\n输出位置:'), options.output);
    console.log();

  } catch (error) {
    console.error(chalk.red.bold('\n❌ 构建失败:\n'));
    console.error(chalk.red(error.message));
    if (error.stack) {
      console.error(chalk.gray('\n堆栈跟踪:'));
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

main();
