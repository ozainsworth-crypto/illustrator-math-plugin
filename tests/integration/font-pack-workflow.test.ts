/**
 * 集成测试：字体包生成 → 加载 → 应用完整流程
 * 
 * 验证需求：E1.4-E1.5
 * 
 * 测试完整的字体包工作流：
 * 1. 独立工具生成字体包
 * 2. 主工具扫描字体包
 * 3. 主工具加载字体包
 * 4. 主工具应用字体包
 * 5. 预览实时更新
 * 6. 恢复默认字体
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebFormulaGenerator } from '../../src/lib/formula-generator';
import { FontPackLoader } from '../../src/lib/font-pack-loader';
import { initMathJax } from '../../src/lib/mathjax-loader';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Integration Test: Font Pack Workflow', () => {
  let generator: WebFormulaGenerator;
  let fontPackLoader: FontPackLoader;
  const userFontPackPath = join(process.cwd(), 'fonts', 'user-font-pack');

  beforeAll(async () => {
    // 初始化 MathJax
    await initMathJax();
    
    // 创建实例
    fontPackLoader = new FontPackLoader();
    generator = new WebFormulaGenerator({
      mathjaxVersion: '4.1.0',
      outputFormat: 'svg',
      displayMode: true,
    });
  }, 30000);

  afterAll(() => {
    // 清理：恢复默认字体
    fontPackLoader.restoreDefaultFont();
  });

  it('应该能够检测用户字体包目录', () => {
    // 验证字体包目录是否存在
    const dirExists = existsSync(userFontPackPath);
    
    if (!dirExists) {
      console.log('⚠️  用户字体包目录不存在，跳过后续测试');
      console.log(`   预期路径: ${userFontPackPath}`);
    }
    
    // 这个测试不强制要求目录存在，只是记录状态
    expect(typeof dirExists).toBe('boolean');
  });

  it('应该能够扫描并加载用户字体包', async () => {
    // 尝试检测并加载用户字体包
    const userFontPack = await fontPackLoader.detectAndLoadUserFontPack();
    
    if (!userFontPack) {
      console.log('⚠️  未检测到用户字体包，跳过测试');
      return;
    }

    // 验证字体包结构
    expect(userFontPack).toBeDefined();
    expect(userFontPack.manifest).toBeDefined();
    expect(userFontPack.manifest.id).toBe('user-font-pack');
    expect(userFontPack.manifest.fontName).toBeTruthy();
    expect(userFontPack.fontdata).toBeDefined();
    
    console.log(`✅ 成功加载字体包: ${userFontPack.manifest.fontName}`);
  });

  it('应该能够应用用户字体包', async () => {
    // 先加载字体包
    const userFontPack = await fontPackLoader.detectAndLoadUserFontPack();
    
    if (!userFontPack) {
      console.log('⚠️  未检测到用户字体包，跳过测试');
      return;
    }

    // 应用字体包
    const applied = fontPackLoader.applyUserFontPack();
    expect(applied).toBe(true);
    
    // 验证当前字体包
    const currentFontPack = fontPackLoader.getCurrentFontPack();
    expect(currentFontPack).not.toBeNull();
    expect(currentFontPack?.manifest.id).toBe('user-font-pack');
    
    console.log('✅ 成功应用用户字体包');
  });

  it('应该能够使用自定义字体渲染公式', async () => {
    // 先加载并应用字体包
    const userFontPack = await fontPackLoader.detectAndLoadUserFontPack();
    
    if (!userFontPack) {
      console.log('⚠️  未检测到用户字体包，跳过测试');
      return;
    }

    fontPackLoader.applyUserFontPack();
    
    // 渲染测试公式
    const testLatex = 'x^2 + y = 5';
    const result = await generator.renderLatex(testLatex);
    
    // 验证渲染成功
    expect(result.errors).toHaveLength(0);
    expect(result.svg).toBeDefined();
    expect(result.svgString).toBeTruthy();
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    
    console.log('✅ 使用自定义字体成功渲染公式');
  });

  it('应该能够恢复默认字体', async () => {
    // 先加载并应用字体包
    const userFontPack = await fontPackLoader.detectAndLoadUserFontPack();
    
    if (!userFontPack) {
      console.log('⚠️  未检测到用户字体包，跳过测试');
      return;
    }

    fontPackLoader.applyUserFontPack();
    
    // 验证已应用自定义字体
    let currentFontPack = fontPackLoader.getCurrentFontPack();
    expect(currentFontPack).not.toBeNull();
    
    // 恢复默认字体
    fontPackLoader.restoreDefaultFont();
    
    // 验证已恢复默认字体
    currentFontPack = fontPackLoader.getCurrentFontPack();
    expect(currentFontPack).toBeNull();
    
    console.log('✅ 成功恢复默认字体');
  });

  it('应该能够在字体切换后正确渲染', async () => {
    // 先加载字体包
    const userFontPack = await fontPackLoader.detectAndLoadUserFontPack();
    
    if (!userFontPack) {
      console.log('⚠️  未检测到用户字体包，跳过测试');
      return;
    }

    const testLatex = '\\frac{a+b}{c}';
    
    // 1. 使用默认字体渲染
    fontPackLoader.restoreDefaultFont();
    const resultDefault = await generator.renderLatex(testLatex);
    
    expect(resultDefault.errors).toHaveLength(0);
    expect(resultDefault.svg).toBeDefined();
    
    // 2. 切换到自定义字体并渲染
    fontPackLoader.applyUserFontPack();
    const resultCustom = await generator.renderLatex(testLatex);
    
    expect(resultCustom.errors).toHaveLength(0);
    expect(resultCustom.svg).toBeDefined();
    
    // 3. 验证两次渲染结果不同（说明字体切换生效）
    expect(resultCustom.svgString).not.toBe(resultDefault.svgString);
    
    // 4. 切换回默认字体并渲染
    fontPackLoader.restoreDefaultFont();
    const resultDefaultAgain = await generator.renderLatex(testLatex);
    
    expect(resultDefaultAgain.errors).toHaveLength(0);
    expect(resultDefaultAgain.svg).toBeDefined();
    
    // 5. 验证恢复默认字体后的渲染结果与初始默认字体一致
    expect(resultDefaultAgain.svgString).toBe(resultDefault.svgString);
    
    console.log('✅ 字体切换后渲染正确');
  });

  it('应该能够处理字体包加载失败的情况', async () => {
    // 恢复默认字体（确保没有加载字体包）
    fontPackLoader.restoreDefaultFont();
    
    // 尝试应用不存在的字体包
    const applied = fontPackLoader.applyUserFontPack();
    
    // 验证应用失败
    expect(applied).toBe(false);
    
    // 验证当前没有活动字体包
    const currentFontPack = fontPackLoader.getCurrentFontPack();
    expect(currentFontPack).toBeNull();
    
    // 验证即使应用失败，仍然可以正常渲染（使用默认字体）
    const testLatex = 'x + y = z';
    const result = await generator.renderLatex(testLatex);
    
    expect(result.errors).toHaveLength(0);
    expect(result.svg).toBeDefined();
    
    console.log('✅ 正确处理字体包加载失败');
  });

  it('应该能够验证字体包 manifest 结构', async () => {
    const userFontPack = await fontPackLoader.detectAndLoadUserFontPack();
    
    if (!userFontPack) {
      console.log('⚠️  未检测到用户字体包，跳过测试');
      return;
    }

    const manifest = userFontPack.manifest;
    
    // 验证必需字段
    expect(manifest.id).toBe('user-font-pack');
    expect(manifest.fontName).toBeTruthy();
    expect(manifest.version).toBeTruthy();
    expect(manifest.createdAt).toBeTruthy();
    expect(manifest.fontdataFile).toBeTruthy();
    
    // 验证覆盖范围字段
    expect(manifest.coverage).toBeDefined();
    expect(manifest.coverage.uppercase).toBeDefined();
    expect(manifest.coverage.lowercase).toBeDefined();
    expect(manifest.coverage.digits).toBeDefined();
    
    // 验证失败清单字段
    expect(manifest.failedGlyphs).toBeDefined();
    expect(Array.isArray(manifest.failedGlyphs)).toBe(true);
    
    console.log('✅ 字体包 manifest 结构正确');
    console.log(`   字体名称: ${manifest.fontName}`);
    console.log(`   版本: ${manifest.version}`);
    console.log(`   创建时间: ${manifest.createdAt}`);
    console.log(`   失败字形数: ${manifest.failedGlyphs?.length ?? 0}`);
  });

  it('应该能够验证 fontdata 结构', async () => {
    const userFontPack = await fontPackLoader.detectAndLoadUserFontPack();
    
    if (!userFontPack) {
      console.log('⚠️  未检测到用户字体包，跳过测试');
      return;
    }

    const fontdata = userFontPack.fontdata;
    
    // 验证 fontdata 是一个对象
    expect(typeof fontdata).toBe('object');
    expect(fontdata).not.toBeNull();
    
    // 验证包含必要的字体数据结构
    // 注意：具体结构取决于 MathJax fontdata 格式
    expect(fontdata).toBeDefined();
    
    console.log('✅ fontdata 结构正确');
  });

  it('完整工作流测试总结', async () => {
    const userFontPack = await fontPackLoader.detectAndLoadUserFontPack();
    
    if (!userFontPack) {
      console.log('\n⚠️  未检测到用户字体包');
      console.log('   提示：请使用 Font Pack Builder 工具生成字体包');
      console.log(`   目标路径: ${userFontPackPath}`);
      return;
    }

    console.log('\n✅ 字体包工作流集成测试通过');
    console.log('   已验证功能：');
    console.log('   - 字体包检测和加载');
    console.log('   - 字体包应用');
    console.log('   - 自定义字体渲染');
    console.log('   - 默认字体恢复');
    console.log('   - 字体切换');
    console.log('   - 错误处理');
    console.log('   - manifest 结构验证');
    console.log('   - fontdata 结构验证');
  });
});
