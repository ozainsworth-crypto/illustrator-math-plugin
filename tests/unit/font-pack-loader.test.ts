/**
 * FontPackLoader 单元测试
 * 
 * 测试字体包扫描、加载、应用和恢复逻辑
 * 
 * 关联需求：需求 4（C3.10）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FontPackLoader, type FontPackManifest } from '../../src/lib/font-pack-loader';

describe('FontPackLoader', () => {
  let loader: FontPackLoader;
  let fetchMock: ReturnType<typeof vi.fn>;

  // 有效的 manifest 数据
  const validManifest: FontPackManifest = {
    name: 'Test Font',
    version: '1.0.0',
    family: 'TestFont',
    format: 'truetype',
    coverage: {
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      digits: '0123456789',
    },
    failures: ['Q', 'q'],
    createdAt: '2024-01-15T10:30:00Z',
    fontdataFile: 'fontdata.js',
  };

  // 有效的 fontdata 内容
  const validFontdataContent = `export const fontdata = {
    "A": { c: 65, w: 722, h: 683, d: 0, path: "M0 0L100 100" },
    "a": { c: 97, w: 500, h: 450, d: 10, path: "M0 0L50 50" },
    "1": { c: 49, w: 500, h: 683, d: 0, path: "M0 0L50 100" }
  };`;

  beforeEach(() => {
    loader = new FontPackLoader();
    
    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectAndLoadUserFontPack', () => {
    it('should successfully load a valid user font pack', async () => {
      // Mock successful manifest fetch
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-font-pack');
      expect(result?.manifest.name).toBe('Test Font');
      expect(result?.manifest.family).toBe('TestFont');
      expect(result?.fontdata).toBeDefined();
      expect(Object.keys(result?.fontdata || {})).toHaveLength(3);
    });

    it('should return null when manifest is not found', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
      expect(loader.hasUserFontPack()).toBe(false);
    });

    it('should return null when manifest format is invalid', async () => {
      const invalidManifest = {
        name: 'Test Font',
        // Missing required fields
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(invalidManifest),
      });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('manifest 格式无效')
      );
    });

    it('should return null when fontdata file is not found', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('无法加载用户字体包 fontdata')
      );
    });

    it('should return null when fontdata format is invalid', async () => {
      const invalidFontdataContent = 'export const fontdata = "not an object";';

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(invalidFontdataContent),
        });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('fontdata 格式无效')
      );
    });

    it('should return null when fontdata has no export statement', async () => {
      const invalidFontdataContent = 'const fontdata = { "A": { c: 65, w: 100, h: 100, d: 0, path: "M0,0" } };';

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(invalidFontdataContent),
        });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('fontdata 格式无效')
      );
    });

    it('should return null when fontdata is empty', async () => {
      const emptyFontdataContent = 'export const fontdata = {};';

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(emptyFontdataContent),
        });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('fontdata 格式无效')
      );
    });

    it('should return null when fontdata glyph structure is invalid', async () => {
      const invalidGlyphFontdataContent = `export const fontdata = {
        "A": { c: 65, w: 100 }
      };`;

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(invalidGlyphFontdataContent),
        });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('fontdata 格式无效')
      );
    });

    it('should handle fetch errors gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('加载用户字体包失败'),
        expect.any(Error)
      );
    });

    it('should add cache-busting timestamp to fetch requests', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();

      // Check that fetch was called with cache-busting parameters
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/fonts\/user-font-pack\/manifest\.json\?t=\d+/),
        { cache: 'no-cache' }
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/fonts\/user-font-pack\/fontdata\.js\?t=\d+/),
        { cache: 'no-cache' }
      );
    });

    it('should log detailed information when font pack is loaded', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('成功加载用户字体包')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Test Font')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('TestFont')
      );
    });
  });

  describe('applyUserFontPack', () => {
    it('should successfully apply user font pack when loaded', async () => {
      // Load font pack first
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();

      const result = loader.applyUserFontPack();

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('已应用用户字体包')
      );
    });

    it('should return false when no font pack is loaded', () => {
      const result = loader.applyUserFontPack();

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('无法应用用户字体包：字体包未加载')
      );
    });

    it('should make getCurrentFontPack return the font pack after applying', async () => {
      // Load font pack
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();

      // Before applying
      expect(loader.getCurrentFontPack()).toBeNull();

      // Apply
      loader.applyUserFontPack();

      // After applying
      const currentPack = loader.getCurrentFontPack();
      expect(currentPack).not.toBeNull();
      expect(currentPack?.manifest.name).toBe('Test Font');
    });
  });

  describe('restoreDefaultFont', () => {
    it('should restore default font', async () => {
      // Load and apply font pack
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();
      loader.applyUserFontPack();

      // Verify font pack is active
      expect(loader.getCurrentFontPack()).not.toBeNull();

      // Restore default
      loader.restoreDefaultFont();

      // Verify font pack is no longer active
      expect(loader.getCurrentFontPack()).toBeNull();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('已恢复默认字体')
      );
    });

    it('should work even when no font pack is loaded', () => {
      loader.restoreDefaultFont();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('已恢复默认字体')
      );
    });
  });

  describe('hasUserFontPack', () => {
    it('should return false when no font pack is loaded', () => {
      expect(loader.hasUserFontPack()).toBe(false);
    });

    it('should return true when font pack is loaded', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();

      expect(loader.hasUserFontPack()).toBe(true);
    });

    it('should return true even when font pack is not applied', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();
      // Don't apply

      expect(loader.hasUserFontPack()).toBe(true);
    });
  });

  describe('getUserFontPackStatus', () => {
    it('should return status with exists=false when no font pack is loaded', () => {
      const status = loader.getUserFontPackStatus();

      expect(status.exists).toBe(false);
      expect(status.active).toBe(false);
      expect(status.name).toBeNull();
      expect(status.updatedAt).toBeNull();
      expect(status.failureCount).toBe(0);
    });

    it('should return correct status when font pack is loaded but not applied', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();

      const status = loader.getUserFontPackStatus();

      expect(status.exists).toBe(true);
      expect(status.active).toBe(false);
      expect(status.name).toBe('Test Font (TestFont)');
      expect(status.updatedAt).toBe('2024-01-15T10:30:00Z');
      expect(status.failureCount).toBe(2); // Q and q
    });

    it('should return correct status when font pack is loaded and applied', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();
      loader.applyUserFontPack();

      const status = loader.getUserFontPackStatus();

      expect(status.exists).toBe(true);
      expect(status.active).toBe(true);
      expect(status.name).toBe('Test Font (TestFont)');
      expect(status.updatedAt).toBe('2024-01-15T10:30:00Z');
      expect(status.failureCount).toBe(2);
    });

    it('should return correct status after restoring default font', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();
      loader.applyUserFontPack();
      loader.restoreDefaultFont();

      const status = loader.getUserFontPackStatus();

      expect(status.exists).toBe(true);
      expect(status.active).toBe(false);
      expect(status.name).toBe('Test Font (TestFont)');
    });
  });

  describe('getCurrentFontPack', () => {
    it('should return null when no font pack is loaded', () => {
      expect(loader.getCurrentFontPack()).toBeNull();
    });

    it('should return null when font pack is loaded but not applied', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();

      expect(loader.getCurrentFontPack()).toBeNull();
    });

    it('should return font pack when applied', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();
      loader.applyUserFontPack();

      const pack = loader.getCurrentFontPack();

      expect(pack).not.toBeNull();
      expect(pack?.id).toBe('user-font-pack');
      expect(pack?.manifest.name).toBe('Test Font');
    });
  });

  describe('getCurrentFontdata', () => {
    it('should return null when no font pack is loaded', () => {
      expect(loader.getCurrentFontdata()).toBeNull();
    });

    it('should return null when font pack is loaded but not applied', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();

      expect(loader.getCurrentFontdata()).toBeNull();
    });

    it('should return fontdata when applied', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();
      loader.applyUserFontPack();

      const fontdata = loader.getCurrentFontdata();

      expect(fontdata).not.toBeNull();
      expect(fontdata).toHaveProperty('A');
      expect(fontdata).toHaveProperty('a');
      expect(fontdata).toHaveProperty('1');
      expect(fontdata?.A).toHaveProperty('c', 65);
      expect(fontdata?.A).toHaveProperty('w', 722);
      expect(fontdata?.A).toHaveProperty('path');
    });
  });

  describe('manifest validation', () => {
    it('should reject manifest without name', async () => {
      const invalidManifest = { ...validManifest };
      delete (invalidManifest as Partial<FontPackManifest>).name;

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(invalidManifest),
      });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
    });

    it('should reject manifest without version', async () => {
      const invalidManifest = { ...validManifest };
      delete (invalidManifest as Partial<FontPackManifest>).version;

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(invalidManifest),
      });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
    });

    it('should reject manifest without coverage', async () => {
      const invalidManifest = { ...validManifest };
      delete (invalidManifest as Partial<FontPackManifest>).coverage;

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(invalidManifest),
      });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
    });

    it('should reject manifest with invalid coverage structure', async () => {
      const invalidManifest = {
        ...validManifest,
        coverage: {
          uppercase: 'ABC',
          // Missing lowercase and digits
        },
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(invalidManifest),
      });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
    });

    it('should reject manifest without failures array', async () => {
      const invalidManifest = { ...validManifest };
      delete (invalidManifest as Partial<FontPackManifest>).failures;

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(invalidManifest),
      });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
    });

    it('should reject manifest without createdAt', async () => {
      const invalidManifest = { ...validManifest };
      delete (invalidManifest as Partial<FontPackManifest>).createdAt;

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(invalidManifest),
      });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
    });

    it('should accept manifest with optional contentHash', async () => {
      const manifestWithHash = {
        ...validManifest,
        contentHash: 'abc123',
      };

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(manifestWithHash),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).not.toBeNull();
      expect(result?.manifest.contentHash).toBe('abc123');
    });
  });

  describe('fontdata validation', () => {
    it('should reject fontdata with missing glyph properties', async () => {
      const invalidFontdataContent = `export const fontdata = {
        "A": { c: 65, w: 100 }
      };`;

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(invalidFontdataContent),
        });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
    });

    it('should reject fontdata with wrong property types', async () => {
      const invalidFontdataContent = `export const fontdata = {
        "A": { c: "65", w: 100, h: 100, d: 0, path: "M0,0" }
      };`;

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(invalidFontdataContent),
        });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).toBeNull();
    });

    it('should accept fontdata with multiple glyphs', async () => {
      const multiFontdataContent = `export const fontdata = {
        "A": { c: 65, w: 722, h: 683, d: 0, path: "M0 0L100 100" },
        "B": { c: 66, w: 667, h: 683, d: 0, path: "M0 0L100 100" },
        "C": { c: 67, w: 722, h: 683, d: 0, path: "M0 0L100 100" }
      };`;

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(multiFontdataContent),
        });

      const result = await loader.detectAndLoadUserFontPack();

      expect(result).not.toBeNull();
      expect(Object.keys(result?.fontdata || {})).toHaveLength(3);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow: load -> apply -> restore', async () => {
      // Load
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      const pack = await loader.detectAndLoadUserFontPack();
      expect(pack).not.toBeNull();
      expect(loader.hasUserFontPack()).toBe(true);

      // Apply
      const applied = loader.applyUserFontPack();
      expect(applied).toBe(true);
      expect(loader.getCurrentFontPack()).not.toBeNull();
      expect(loader.getUserFontPackStatus().active).toBe(true);

      // Restore
      loader.restoreDefaultFont();
      expect(loader.getCurrentFontPack()).toBeNull();
      expect(loader.getUserFontPackStatus().active).toBe(false);
      expect(loader.hasUserFontPack()).toBe(true); // Still loaded, just not active
    });

    it('should handle multiple apply/restore cycles', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      await loader.detectAndLoadUserFontPack();

      // Cycle 1
      loader.applyUserFontPack();
      expect(loader.getUserFontPackStatus().active).toBe(true);
      loader.restoreDefaultFont();
      expect(loader.getUserFontPackStatus().active).toBe(false);

      // Cycle 2
      loader.applyUserFontPack();
      expect(loader.getUserFontPackStatus().active).toBe(true);
      loader.restoreDefaultFont();
      expect(loader.getUserFontPackStatus().active).toBe(false);

      // Cycle 3
      loader.applyUserFontPack();
      expect(loader.getUserFontPackStatus().active).toBe(true);
    });

    it('should handle reload after initial load', async () => {
      // Initial load
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      const pack1 = await loader.detectAndLoadUserFontPack();
      expect(pack1?.manifest.name).toBe('Test Font');

      // Reload with updated manifest
      const updatedManifest = {
        ...validManifest,
        name: 'Updated Font',
        createdAt: '2024-01-15T11:00:00Z',
      };

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updatedManifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(validFontdataContent),
        });

      const pack2 = await loader.detectAndLoadUserFontPack();
      expect(pack2?.manifest.name).toBe('Updated Font');
      expect(pack2?.manifest.createdAt).toBe('2024-01-15T11:00:00Z');
    });
  });
});
