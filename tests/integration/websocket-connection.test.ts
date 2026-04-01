/**
 * WebSocket Connection Lifecycle Tests
 * 
 * Tests basic WebSocket connection establishment, maintenance, and termination
 * following the graphql-ws protocol.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/websocket-test-client.js';
import { createTestServer, TestServerInstance } from '../helpers/test-server.js';

describe('WebSocket Connection Lifecycle',() => {
  let testServer: TestServerInstance;
  let serverUrl: string;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableAuth: false, // No auth for basic connection tests
    });
    serverUrl = testServer.wsUrl;
  });

  afterAll(async () => {
    await testServer.cleanup();
  });

  it('establishes connection successfully', async () => {
    const client = await createTestClient({
      url: serverUrl,
      timeout: 5000,
    });

    expect(client.isConnected()).toBe(true);

    await client.disconnect();
    expect(client.isConnected()).toBe(false);
  });

  it('handles graceful disconnection', async () => {
    const client = await createTestClient({
      url: serverUrl,
    });

    expect(client.isConnected()).toBe(true);

    // Disconnect should not throw
    await expect(client.disconnect()).resolves.toBeUndefined();
    expect(client.isConnected()).toBe(false);
  });

  it('rejects connection with invalid URL', async () => {
    await expect(
      createTestClient({
        url: 'ws://127.0.0.1:99999/invalid',
        timeout: 1000,
      })
    ).rejects.toThrow();
  });
});
