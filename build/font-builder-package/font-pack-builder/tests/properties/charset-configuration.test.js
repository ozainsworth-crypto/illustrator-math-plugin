/**
 * Property-Based Tests: Charset Configuration
 * 
 * Tests for charset configuration loading and format support.
 * 
 * Property 1: Charset Configuration Loading
 * Property 14: Charset Configuration Format Support
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { CharsetManager } from '../../src/charset-manager.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Feature: font-pack-builder-extended-math, Property 1: Charset Configuration Loading', () => {
  it('should successfully parse any valid charset configuration file', async () => {
    // This property tests that for any valid charset configuration file,
    // the CharsetManager can successfully load and parse it
    
    await fc.assert(
      fc.asyncProperty(
        // Generate valid charset configuration structure
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          version: fc.string({ minLength: 1, maxLength: 20 }),
          categories: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 30 }),
            fc.record({
              characters: fc.array(fc.string({ minLength: 1, maxLength: 1 }), { minLength: 1, maxLength: 10 }),
              codepoints: fc.array(
                fc.oneof(
                  // Hex format
                  fc.integer({ min: 0x0020, max: 0xFFFF }).map(n => `0x${n.toString(16).toUpperCase().padStart(4, '0')}`),
                  // Decimal format
                  fc.integer({ min: 32, max: 65535 }).map(n => n.toString())
                ),
                { minLength: 1, maxLength: 10 }
              ),
              keepOriginalAdvance: fc.boolean(),
              enablePathCentering: fc.boolean()
            }).chain(category => {
              // Ensure characters and codepoints have same length
              const length = Math.min(category.characters.length, category.codepoints.length);
              return fc.constant({
                characters: category.characters.slice(0, length),
                codepoints: category.codepoints.slice(0, length),
                keepOriginalAdvance: category.keepOriginalAdvance,
                enablePathCentering: category.enablePathCentering
              });
            }),
            { minKeys: 1, maxKeys: 5 }
          ),
          homoglyphs: fc.array(
            fc.record({
              group: fc.string({ minLength: 1, maxLength: 30 }),
              codepoints: fc.array(
                fc.integer({ min: 0x0020, max: 0xFFFF }).map(n => `0x${n.toString(16).toUpperCase().padStart(4, '0')}`),
                { minLength: 2, maxLength: 5 }
              ),
              preferredSource: fc.array(
                fc.integer({ min: 0x0020, max: 0xFFFF }).map(n => `0x${n.toString(16).toUpperCase().padStart(4, '0')}`),
                { minLength: 1, maxLength: 5 }
              ),
              description: fc.string({ maxLength: 100 })
            }),
            { maxLength: 3 }
          ),
          normalizedMappings: fc.array(
            fc.record({
              from: fc.integer({ min: 0x0020, max: 0xFFFF }).map(n => `0x${n.toString(16).toUpperCase().padStart(4, '0')}`),
              to: fc.integer({ min: 0x0020, max: 0xFFFF }).map(n => `0x${n.toString(16).toUpperCase().padStart(4, '0')}`),
              description: fc.string({ maxLength: 100 })
            }),
            { maxLength: 3 }
          )
        }),
        async (config) => {
          // Create a temporary charset file
          const tempDir = path.join(__dirname, '../../charsets');
          const tempFile = path.join(tempDir, `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
          
          try {
            // Write config to file
            await fs.writeFile(tempFile, JSON.stringify(config, null, 2), 'utf-8');
            
            // Try to load it with CharsetManager
            const manager = new CharsetManager({ baseOnly: true });
            const loadedConfig = await manager.loadCharsetFile(path.basename(tempFile));
            
            // Verify successful loading
            expect(loadedConfig).toBeDefined();
            expect(loadedConfig.name).toBe(config.name);
            expect(loadedConfig.version).toBe(config.version);
            expect(loadedConfig.categories).toBeDefined();
            expect(Object.keys(loadedConfig.categories).length).toBeGreaterThan(0);
            
            // Verify all categories are present
            for (const categoryName of Object.keys(config.categories)) {
              expect(loadedConfig.categories[categoryName]).toBeDefined();
            }
          } finally {
            // Clean up temp file
            try {
              await fs.unlink(tempFile);
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: global.PROPERTY_TEST_RUNS }
    );
  });

  it('should successfully parse Unicode codepoints in both hex and decimal formats', async () => {
    // This property tests that codepoint parsing works for both formats
    
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0x0020, max: 0xFFFF }),
        async (codepoint) => {
          const hexFormat = `0x${codepoint.toString(16).toUpperCase()}`;
          const decimalFormat = codepoint.toString(10);
          
          // Create configs with both formats
          const configHex = {
            name: 'test-hex',
            version: '1.0.0',
            categories: {
              test: {
                characters: [String.fromCodePoint(codepoint)],
                codepoints: [hexFormat],
                keepOriginalAdvance: false,
                enablePathCentering: false
              }
            }
          };
          
          const configDecimal = {
            name: 'test-decimal',
            version: '1.0.0',
            categories: {
              test: {
                characters: [String.fromCodePoint(codepoint)],
                codepoints: [decimalFormat],
                keepOriginalAdvance: false,
                enablePathCentering: false
              }
            }
          };
          
          const tempDir = path.join(__dirname, '../../charsets');
          const tempFileHex = path.join(tempDir, `test-hex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
          const tempFileDec = path.join(tempDir, `test-dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
          
          try {
            // Write both configs
            await fs.writeFile(tempFileHex, JSON.stringify(configHex, null, 2), 'utf-8');
            await fs.writeFile(tempFileDec, JSON.stringify(configDecimal, null, 2), 'utf-8');
            
            // Load both
            const manager = new CharsetManager({ baseOnly: true });
            const loadedHex = await manager.loadCharsetFile(path.basename(tempFileHex));
            const loadedDec = await manager.loadCharsetFile(path.basename(tempFileDec));
            
            // Both should parse to the same codepoint
            const parsedHex = manager.parseCodepoint(loadedHex.categories.test.codepoints[0]);
            const parsedDec = manager.parseCodepoint(loadedDec.categories.test.codepoints[0]);
            
            expect(parsedHex).toBe(codepoint);
            expect(parsedDec).toBe(codepoint);
            expect(parsedHex).toBe(parsedDec);
          } finally {
            // Clean up
            try {
              await fs.unlink(tempFileHex);
              await fs.unlink(tempFileDec);
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: global.PROPERTY_TEST_RUNS }
    );
  });
});

describe('Feature: font-pack-builder-extended-math, Property 14: Charset Configuration Format Support', () => {
  it('should successfully parse any charset configuration with valid JSON structure and codepoints arrays', async () => {
    // This property tests that any charset configuration with valid JSON structure
    // containing categories with codepoints arrays can be successfully parsed
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          version: fc.string({ minLength: 1, maxLength: 20 }),
          categories: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 30 }),
            fc.record({
              codepoints: fc.array(
                fc.oneof(
                  fc.integer({ min: 0x0020, max: 0xFFFF }).map(n => `0x${n.toString(16).toUpperCase().padStart(4, '0')}`),
                  fc.integer({ min: 32, max: 65535 }).map(n => n.toString())
                ),
                { minLength: 1, maxLength: 20 }
              ),
              characters: fc.array(fc.string({ minLength: 1, maxLength: 1 }), { minLength: 1, maxLength: 20 }),
              keepOriginalAdvance: fc.boolean(),
              enablePathCentering: fc.boolean()
            }).chain(category => {
              // Ensure arrays have same length
              const length = Math.min(category.characters.length, category.codepoints.length);
              return fc.constant({
                characters: category.characters.slice(0, length),
                codepoints: category.codepoints.slice(0, length),
                keepOriginalAdvance: category.keepOriginalAdvance,
                enablePathCentering: category.enablePathCentering
              });
            }),
            { minKeys: 1, maxKeys: 10 }
          )
        }),
        async (config) => {
          const tempDir = path.join(__dirname, '../../charsets');
          const tempFile = path.join(tempDir, `test-format-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
          
          try {
            // Write config to file
            await fs.writeFile(tempFile, JSON.stringify(config, null, 2), 'utf-8');
            
            // Load with CharsetManager
            const manager = new CharsetManager({ baseOnly: true });
            const loaded = await manager.loadCharsetFile(path.basename(tempFile));
            
            // Verify structure
            expect(loaded).toBeDefined();
            expect(loaded.name).toBe(config.name);
            expect(loaded.categories).toBeDefined();
            expect(typeof loaded.categories).toBe('object');
            
            // Verify all categories have codepoints arrays
            for (const [categoryName, category] of Object.entries(loaded.categories)) {
              expect(category.codepoints).toBeDefined();
              expect(Array.isArray(category.codepoints)).toBe(true);
              expect(category.codepoints.length).toBeGreaterThan(0);
              
              // Verify each codepoint can be parsed
              for (const codepointStr of category.codepoints) {
                const parsed = manager.parseCodepoint(codepointStr);
                expect(typeof parsed).toBe('number');
                expect(parsed).toBeGreaterThanOrEqual(0);
                expect(parsed).toBeLessThanOrEqual(0x10FFFF);
              }
            }
          } finally {
            // Clean up
            try {
              await fs.unlink(tempFile);
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: global.PROPERTY_TEST_RUNS }
    );
  });

  it('should handle categories with different configuration options', async () => {
    // This property tests that categories can have different keepOriginalAdvance
    // and enablePathCentering settings
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => !['__proto__', 'constructor', 'prototype'].includes(s)),
            keepOriginalAdvance: fc.boolean(),
            enablePathCentering: fc.boolean(),
            codepoint: fc.integer({ min: 0x0020, max: 0xFFFF })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (categories) => {
          // Build config from categories
          const config = {
            name: 'test-options',
            version: '1.0.0',
            categories: {}
          };
          
          for (const cat of categories) {
            config.categories[cat.name] = {
              characters: [String.fromCodePoint(cat.codepoint)],
              codepoints: [`0x${cat.codepoint.toString(16).toUpperCase()}`],
              keepOriginalAdvance: cat.keepOriginalAdvance,
              enablePathCentering: cat.enablePathCentering
            };
          }
          
          const tempDir = path.join(__dirname, '../../charsets');
          const tempFile = path.join(tempDir, `test-opts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
          
          try {
            await fs.writeFile(tempFile, JSON.stringify(config, null, 2), 'utf-8');
            
            const manager = new CharsetManager({ baseOnly: true });
            const loaded = await manager.loadCharsetFile(path.basename(tempFile));
            
            // Verify each category preserved its options
            for (const cat of categories) {
              const loadedCat = loaded.categories[cat.name];
              expect(loadedCat).toBeDefined();
              expect(loadedCat.keepOriginalAdvance).toBe(cat.keepOriginalAdvance);
              expect(loadedCat.enablePathCentering).toBe(cat.enablePathCentering);
            }
          } finally {
            try {
              await fs.unlink(tempFile);
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: global.PROPERTY_TEST_RUNS }
    );
  });

  it('should support optional homoglyphs and normalizedMappings fields', async () => {
    // This property tests that homoglyphs and normalizedMappings are optional
    // and can be present or absent
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          version: fc.string({ minLength: 1, maxLength: 20 }),
          categories: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 30 }),
            fc.record({
              characters: fc.array(fc.string({ minLength: 1, maxLength: 1 }), { minLength: 1, maxLength: 5 }),
              codepoints: fc.array(
                fc.integer({ min: 0x0020, max: 0xFFFF }).map(n => `0x${n.toString(16).toUpperCase().padStart(4, '0')}`),
                { minLength: 1, maxLength: 5 }
              ),
              keepOriginalAdvance: fc.boolean(),
              enablePathCentering: fc.boolean()
            }).chain(cat => {
              const length = Math.min(cat.characters.length, cat.codepoints.length);
              return fc.constant({
                characters: cat.characters.slice(0, length),
                codepoints: cat.codepoints.slice(0, length),
                keepOriginalAdvance: cat.keepOriginalAdvance,
                enablePathCentering: cat.enablePathCentering
              });
            }),
            { minKeys: 1, maxKeys: 3 }
          ),
          includeHomoglyphs: fc.boolean(),
          includeNormalizedMappings: fc.boolean()
        }),
        async (testCase) => {
          const config = {
            name: testCase.name,
            version: testCase.version,
            categories: testCase.categories
          };
          
          // Conditionally add optional fields
          if (testCase.includeHomoglyphs) {
            config.homoglyphs = [
              {
                group: 'test-group',
                codepoints: ['0x002D', '0x2212'],
                preferredSource: ['0x2212', '0x002D'],
                description: 'Test homoglyph group'
              }
            ];
          }
          
          if (testCase.includeNormalizedMappings) {
            config.normalizedMappings = [
              {
                from: '0xFF1C',
                to: '0x003C',
                description: 'Test mapping'
              }
            ];
          }
          
          const tempDir = path.join(__dirname, '../../charsets');
          const tempFile = path.join(tempDir, `test-optional-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
          
          try {
            await fs.writeFile(tempFile, JSON.stringify(config, null, 2), 'utf-8');
            
            const manager = new CharsetManager({ baseOnly: true });
            const loaded = await manager.loadCharsetFile(path.basename(tempFile));
            
            // Verify loading succeeded
            expect(loaded).toBeDefined();
            expect(loaded.name).toBe(config.name);
            
            // Verify optional fields
            if (testCase.includeHomoglyphs) {
              expect(loaded.homoglyphs).toBeDefined();
              expect(Array.isArray(loaded.homoglyphs)).toBe(true);
            }
            
            if (testCase.includeNormalizedMappings) {
              expect(loaded.normalizedMappings).toBeDefined();
              expect(Array.isArray(loaded.normalizedMappings)).toBe(true);
            }
          } finally {
            try {
              await fs.unlink(tempFile);
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: global.PROPERTY_TEST_RUNS }
    );
  });
});
