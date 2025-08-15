/**
 * Loki End-to-End Integration Tests
 * ロガーシステム全体とLokiの統合テスト
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { runWithLoggerContext, defaultLoggerContextConfig } from '@/lib/logger/context';
import { 
  initializeLokiTransport, 
  shutdownLokiTransport,
} from '@/lib/logger/loki-transport';

import type { LokiPushPayload } from '@/lib/logger/loki-client';

// Mock server for end-to-end tests
const MOCK_LOKI_URL = 'http://localhost:3100';
let capturedPayloads: LokiPushPayload[] = [];

const server = setupServer(
  http.post(`${MOCK_LOKI_URL}/loki/api/v1/push`, async ({ request }) => {
    const body = await request.json();
    capturedPayloads.push(body as LokiPushPayload);
    return HttpResponse.json({}, { status: 204 });
  }),
  http.get(`${MOCK_LOKI_URL}/ready`, () => {
    return HttpResponse.json({ status: 'ready' }, { status: 200 });
  })
);

describe('Loki End-to-End Integration Tests', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
    capturedPayloads = [];
    server.resetHandlers();
  });

  afterEach(async () => {
    await shutdownLokiTransport();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Complete Logger System Integration', () => {
    test('should integrate Loki transport with direct logger usage', async () => {
      // Initialize Loki transport directly
      const transport = await initializeLokiTransport({
        url: MOCK_LOKI_URL,
        batchSize: 1,
        defaultLabels: {
          service: 'e2e-test',
          version: '1.0.0',
        },
      });

      // Use transport directly instead of global logger integration
      await transport.sendLog('info', 'E2E test message from transport');
      await transport.sendLog('warn', 'Warning message with transport');
      await transport.sendLog('error', 'Error message from transport');

      await vi.runAllTimersAsync();

      // Verify logs were captured
      expect(capturedPayloads.length).toBeGreaterThan(0);
      
      // Verify log structure
      const payload = capturedPayloads[0];
      expect(payload.streams).toBeDefined();
      expect(payload.streams[0].stream).toMatchObject({
        service: 'e2e-test',
        version: '1.0.0',
        level: expect.any(String),
      });
    });

    test('should handle context propagation in transport', async () => {
      const transport = await initializeLokiTransport({
        url: MOCK_LOKI_URL,
        batchSize: 1,
        defaultLabels: { service: 'context-e2e' },
      });

      // Test context propagation through transport
      runWithLoggerContext(
        defaultLoggerContextConfig,
        {
          requestId: 'req-e2e-123',
          traceId: 'trace-e2e-456',
          userId: 'user-e2e-789',
          sessionId: 'session-e2e-abc',
        },
        () => {
          // sendLog will capture context automatically
          transport.sendLog('info', 'Message with full context');
        }
      );

      await vi.runAllTimersAsync();

      // Verify context propagation
      expect(capturedPayloads.length).toBeGreaterThan(0);
      
      const streams = capturedPayloads.flatMap(p => p.streams);
      const contextStream = streams.find(s => s.stream.request_id === 'req-e2e-123');
      
      expect(contextStream).toBeDefined();
      expect(contextStream?.stream).toMatchObject({
        request_id: 'req-e2e-123',
        trace_id: 'trace-e2e-456',
        user_id: 'user-e2e-789',
        session_id: 'session-e2e-abc',
      });
    });

    test('should handle simple transport operations', async () => {
      const transport = await initializeLokiTransport({
        url: MOCK_LOKI_URL,
        batchSize: 1,
        defaultLabels: { service: 'simple-e2e' },
      });

      // Test simple operations
      await transport.sendLog('info', 'Simple operation started');
      await transport.sendLog('warn', 'Warning during operation');
      await transport.sendLog('info', 'Simple operation completed');

      await vi.runAllTimersAsync();

      // Verify logs were captured
      expect(capturedPayloads.length).toBeGreaterThan(0);
      
      // Verify all logs were sent
      const totalLogs = capturedPayloads
        .flatMap(p => p.streams)
        .reduce((sum, s) => sum + s.values.length, 0);
      expect(totalLogs).toBe(3);
    });

    test('should handle different log levels correctly', async () => {
      const transport = await initializeLokiTransport({
        url: MOCK_LOKI_URL,
        batchSize: 1,
        minLevel: 'debug', // Accept all levels
        defaultLabels: { service: 'level-test' },
      });

      // Test different log levels
      await transport.sendLog('debug', 'Debug message');
      await transport.sendLog('info', 'Info message');  
      await transport.sendLog('warn', 'Warning message');
      await transport.sendLog('error', 'Error message');

      await vi.runAllTimersAsync();

      // Verify logs were captured
      expect(capturedPayloads.length).toBeGreaterThan(0);
      
      const allLevels = capturedPayloads
        .flatMap(p => p.streams)
        .map(s => s.stream.level);

      expect(allLevels).toContain('debug');
      expect(allLevels).toContain('info');
      expect(allLevels).toContain('warn');
      expect(allLevels).toContain('error');
    });

  });

  describe('Error Scenarios Integration', () => {
    test('should handle transport failures gracefully', async () => {
      // Setup server to fail
      server.use(
        http.post(`${MOCK_LOKI_URL}/loki/api/v1/push`, () => {
          return HttpResponse.error();
        })
      );

      const transport = await initializeLokiTransport({
        url: MOCK_LOKI_URL,
        batchSize: 1,
        maxRetries: 1,
        onError: vi.fn(), // Mock error handler
      });

      // Transport should handle failures gracefully
      await transport.sendLog('info', 'This message will fail to send');
      await transport.sendLog('error', 'Error message with Loki down');

      await vi.runAllTimersAsync();

      // Verify transport tracked failures
      const stats = transport.getStats();
      expect(stats.failedLogs).toBeGreaterThan(0);
      expect(stats.lastError).toBeDefined();
    });
  });
});