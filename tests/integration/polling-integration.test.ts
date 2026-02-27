/**
 * 轮询机制集成测试
 * 
 * 测试轮询机制在主应用中的集成和自动刷新功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FontPackLoader } from '../../src/lib/font-pack-loader';

describe('Polling Integration', () => {
  let loader: FontPackLoader;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loader = new FontPackLoader();
    
    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    loader.stopPolling();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should start polling on application startup', async () => {
    const manifest = {
      name: 'Test Font',
      version: '1.0.0',
      family: 'TestFont',
      format: 'truetype',
      coverage: {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        digits: '0123456789',
      },
      failures: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      fontdataFile: 'fontdata.js',
    };

    const fontdataContent = 'export const fontdata = { "A": { c: 65, w: 100, h: 100, d: 0, path: "M0,0" } };';

    // Mock initial load
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(manifest),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(fontdataContent),
      });

    // Simulate application startup
    await loader.detectAndLoadUserFontPack();
    loader.startPolling();

    expect(loader.hasUserFontPack()).toBe(true);
  });

  it('should trigger callback and refresh preview when font pack is updated', async () => {
    const updateCallback = vi.fn();
    loader.onFontPackUpdated(updateCallback);

    const initialManifest = {
      name: 'Test Font',
      version: '1.0.0',
      family: 'TestFont',
      format: 'truetype',
      coverage: {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        digits: '0123456789',
      },
      failures: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      fontdataFile: 'fontdata.js',
    };

    const updatedManifest = {
      ...initialManifest,
      createdAt: '2024-01-01T01:00:00.000Z',
    };

    const fontdataContent = 'export const fontdata = { "A": { c: 65, w: 100, h: 100, d: 0, path: "M0,0" } };';

    // Initial load
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialManifest),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(fontdataContent),
      });

    await loader.detectAndLoadUserFontPack();
    loader.applyUserFontPack();
    loader.startPolling(1000);

    // Mock updated manifest
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedManifest),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedManifest),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(fontdataContent),
      });

    // Advance timer to trigger polling
    await vi.advanceTimersByTimeAsync(1000);

    // Callback should have been triggered
    expect(updateCallback).toHaveBeenCalled();
  });

  it('should maintain active font state after update', async () => {
    const initialManifest = {
      name: 'Test Font',
      version: '1.0.0',
      family: 'TestFont',
      format: 'truetype',
      coverage: {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        digits: '0123456789',
      },
      failures: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      fontdataFile: 'fontdata.js',
    };

    const updatedManifest = {
      ...initialManifest,
      name: 'Updated Font',
      createdAt: '2024-01-01T01:00:00.000Z',
    };

    const fontdataContent = 'export const fontdata = { "A": { c: 65, w: 100, h: 100, d: 0, path: "M0,0" } };';

    // Initial load
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialManifest),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(fontdataContent),
      });

    await loader.detectAndLoadUserFontPack();
    loader.applyUserFontPack();
    
    // Verify initial state
    expect(loader.getCurrentFontPack()).not.toBeNull();
    expect(loader.getUserFontPackStatus().active).toBe(true);

    loader.startPolling(1000);

    // Mock updated manifest
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedManifest),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedManifest),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(fontdataContent),
      });

    // Advance timer to trigger update
    await vi.advanceTimersByTimeAsync(1000);

    // Font should still be active with updated name
    expect(loader.getCurrentFontPack()).not.toBeNull();
    expect(loader.getUserFontPackStatus().active).toBe(true);
    expect(loader.getUserFontPackStatus().name).toContain('Updated Font');
  });

  it('should stop polling on application shutdown', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    loader.startPolling();
    
    // Simulate application shutdown
    loader.stopPolling();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('should handle font pack deletion during polling', async () => {
    const updateCallback = vi.fn();
    loader.onFontPackUpdated(updateCallback);

    const manifest = {
      name: 'Test Font',
      version: '1.0.0',
      family: 'TestFont',
      format: 'truetype',
      coverage: {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        digits: '0123456789',
      },
      failures: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      fontdataFile: 'fontdata.js',
    };

    const fontdataContent = 'export const fontdata = { "A": { c: 65, w: 100, h: 100, d: 0, path: "M0,0" } };';

    // Initial load
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(manifest),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(fontdataContent),
      });

    await loader.detectAndLoadUserFontPack();
    loader.applyUserFontPack();
    expect(loader.hasUserFontPack()).toBe(true);

    loader.startPolling(1000);

    // Mock manifest not found (deleted)
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
    });

    // Advance timer
    await vi.advanceTimersByTimeAsync(1000);

    // Font pack should be cleared and callback triggered
    expect(loader.hasUserFontPack()).toBe(false);
    expect(loader.getUserFontPackStatus().active).toBe(false);
    expect(updateCallback).toHaveBeenCalled();
  });
});
