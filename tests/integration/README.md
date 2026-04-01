# WebSocket Integration Tests

This directory contains integration tests for GraphQL WebSocket subscriptions using the `graphql-ws` protocol.

## Structure

```
tests/
├── helpers/
│   ├── websocket-test-client.ts   # WebSocket client wrapper for tests
│   └── test-server.ts              # Apollo Server factory for tests
└── integration/
    ├── websocket-connection.test.ts   # Connection lifecycle tests
    ├── websocket-subscriptions.test.ts # Subscription operations tests
    ├── websocket-auth.test.ts          # Authentication tests
    ├── websocket-errors.test.ts        # Error handling tests
    └── websocket-protocol.test.ts      # Protocol compliance tests
```

## Helper Utilities

### WebSocketTestClient

Provides a test-friendly wrapper around the `graphql-ws` client:

```typescript
import { createTestClient } from '../helpers/websocket-test-client';

// Create and connect
const client = await createTestClient({
  url: 'ws://127.0.0.1:4000/graphql',
  connectionParams: { authToken: 'test-token' },
  timeout: 5000,
});

// Subscribe to events
const subscription = await client.subscribe(`
  subscription {
    messageAdded {
      id
      content
    }
  }
`);

// Get next result
const result = await subscription.next();
expect(result.data).toBeDefined();

// Cleanup
subscription.unsubscribe();
await client.disconnect();
```

### Test Server Factory

Creates isolated Apollo Server instances for testing:

```typescript
import { createTestServer } from '../helpers/test-server';

// Create test server
const testServer = await createTestServer({
  enableAuth: false,
  port: 0, // Random port
});

// Use in tests
const client = await createTestClient({
  url: testServer.wsUrl,
});

// Cleanup
await testServer.cleanup();
```

## Running Tests

```bash
# Run all integration tests
npm run test:run

# Run specific test file
npm run test:run tests/integration/websocket-connection.test.ts

# Watch mode
npm run test:watch
```

## Test Patterns

### Connection Lifecycle

Test connection establishment, maintenance, and termination:

```typescript
it('establishes connection successfully', async () => {
  const client = await createTestClient({ url: serverUrl });
  expect(client.isConnected()).toBe(true);
  await client.disconnect();
});
```

### Subscription Operations

Test subscription creation and event delivery:

```typescript
it('receives subscription events', async () => {
  const client = await createTestClient({ url: serverUrl });
  
  const subscription = await client.subscribe(`
    subscription { test { id } }
  `);
  
  const result = await subscription.next();
  expect(result.data).toBeDefined();
});
```

### Authentication

Test authentication and authorization:

```typescript
it('rejects unauthenticated subscriptions', async () => {
  const server = await createTestServer({ enableAuth: true, authToken: 'secret' });
  
  await expect(
    createTestClient({ url: server.wsUrl }) // No token
  ).rejects.toThrow('Authentication required');
});
```

### Error Handling

Test error cases and edge conditions:

```typescript
it('handles malformed queries', async () => {
  const subscription = await client.subscribe('{ invalid syntax }');
  const error = await subscription.error();
  expect(error.message).toContain('syntax');
});
```

## CI Integration

These tests run automatically on every pull request:

- Test execution timeout: 30 seconds
- Tests run in parallel per file
- Each test file uses an isolated server instance
- Failures block PR merge

## Writing New Tests

1. Choose the appropriate test category file
2. Use the provided helper utilities
3. Ensure tests are isolated (no shared state)
4. Add cleanup in `afterAll` hooks
5. Use descriptive test names
6. Document complex test scenarios

## Troubleshooting

**Connection timeouts:**
- Increase timeout in `createTestClient({ timeout: 10000 })`
- Check server is started before connecting

**Port conflicts:**
- Use `port: 0` to get random available port
- Each test file should create its own server instance

**Type errors:**
- Import types from graphql-ws: `import { Client } from 'graphql-ws'`
- Use proper TypeScript generics for subscription results
