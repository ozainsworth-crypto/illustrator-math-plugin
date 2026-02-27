/**
 * FontPackLoader 轮询机制单元测试
 * 
 * 测试 manifest.json 轮询和自动更新功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FontPackLoader } from '../../src/lib/font-pack-loader';

describe('FontPackLoader - Polling Mechanism', () => {
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

  it('should start polling with default interval', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    
    loader.startPolling();
    
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
  });

  it('should start polling with custom interval', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    
    loader.startPolling(5000);
    
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
  });

  it('should stop polling when stopPolling is called', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    
    loader.startPolling();
    loader.stopPolling();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('should stop existing polling when starting new polling', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    
    loader.startPolling(2000);
    loader.startPolling(3000);
    
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('should check for updates periodically', async () => {
    // Mock manifest response
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
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
      }),
    });

    loader.startPolling(1000);

    // Advance timer by 1 second
    await vi.advanceTimersByTimeAsync(1000);

    // Should have called fetch to check for updates
    // 注意：实际调用会包含时间戳参数，所以我们检查 URL 的基础部分
    expect(fetchMock).toHaveBeenCalled();
    const calls = fetchMock.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    
    // 验证调用的 URL 包含正确的路径（忽略时间戳参数）
    const firstCall = calls[0];
    expect(firstCall[0]).toMatch(/\.\/fonts\/user-font-pack\/manifest\.json/);
    expect(firstCall[1]).toEqual({ cache: 'no-cache' });
  });

  it('should detect manifest changes and reload font pack', async () => {
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
      createdAt: '2024-01-01T01:00:00.000Z', // Updated time
    };

    const fontdataContent = 'export const fontdata = { "A": { c: 65, w: 100, h: 100, d: 0, path: "M0,0" } };';

    // First load - initial manifest
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

    // Start polling
    loader.startPolling(1000);

    // Mock updated manifest response
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

    // Advance timer to trigger polling check
    await vi.advanceTimersByTimeAsync(1000);

    // Should have detected the change and reloaded
    expect(fetchMock).toHaveBeenCalledTimes(5); // 2 initial + 3 for update check
  });

  it('should not reload if manifest createdAt has not changed', async () => {
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

    // Start polling
    loader.startPolling(1000);

    // Mock same manifest response
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manifest),
    });

    const initialFetchCount = fetchMock.mock.calls.length;

    // Advance timer to trigger polling check
    await vi.advanceTimersByTimeAsync(1000);

    // Should have checked but not reloaded (only 1 additional fetch for manifest check)
    expect(fetchMock).toHaveBeenCalledTimes(initialFetchCount + 1);
  });

  it('should trigger callback when font pack is updated', async () => {
    const callback = vi.fn();
    loader.onFontPackUpdated(callback);

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

    // Start polling
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

    // Advance timer
    await vi.advanceTimersByTimeAsync(1000);

    // Callback should have been triggered
    expect(callback).toHaveBeenCalled();
  });

  it('should handle manifest deletion during polling', async () => {
    const callback = vi.fn();
    loader.onFontPackUpdated(callback);

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
    expect(loader.hasUserFontPack()).toBe(true);

    // Start polling
    loader.startPolling(1000);

    // Mock manifest not found (deleted)
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
    });

    // Advance timer
    await vi.advanceTimersByTimeAsync(1000);

    // Font pack should be cleared
    expect(loader.hasUserFontPack()).toBe(false);
    expect(callback).toHaveBeenCalled();
  });

  it('should not crash on polling errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    loader.startPolling(1000);

    // Mock fetch error
    fetchMock.mockRejectedValue(new Error('Network error'));

    // Advance timer
    await vi.advanceTimersByTimeAsync(1000);

    // Should have logged error but not crashed
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
