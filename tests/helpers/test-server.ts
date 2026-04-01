/**
 * Test Server Factory
 * 
 * Creates Apollo Server instances for integration testing with:
 * - Configurable authentication  
 * - WebSocket subscription support
 * - Test-friendly lifecycle management
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { buildSchema } from '../../src/schema/index.js';
import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';

export interface TestServerConfig {
  port?: number;
  enableAuth?: boolean;
  authToken?: string;
}

export interface TestServerInstance {
  url: string;
  wsUrl: string;
  server: ApolloServer;
  httpServer: http.Server;
  cleanup: () => Promise<void>;
}

/**
 * Create a test Apollo Server with WebSocket support
 */
export async function createTestServer(
  config: TestServerConfig = {}
): Promise<TestServerInstance> {
  const port = config.port || 0; // Use random port if not specified
  const app = express();
  const httpServer = http.createServer(app);

  const schema = buildSchema();

  // WebSocket server for subscriptions  
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Authentication context function
  const contextFunction = async ({ req }: { req?: express.Request }) => {
    if (!config.enableAuth) {
      return { authenticated: true, user: { id: 'test-user' } };
    }

    const token = req?.headers.authorization?.replace('Bearer ', '');
    
    if (config.authToken && token === config.authToken) {
      return { authenticated: true, user: { id: 'test-user', token } };
    }

    return { authenticated: false, user: null };
  };

  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
    ],
  });

  await server.start();

  // Express middleware for HTTP GraphQL endpoint
  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server, {
      context: contextFunction,
    })
  );

  // Start HTTP server
  await new Promise<void>((resolve) => {
    httpServer.listen(port, () => {
      resolve();
    });
  });

  const address = httpServer.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  const url = `http://127.0.0.1:${actualPort}/graphql`;
  const wsUrl = `ws://127.0.0.1:${actualPort}/graphql`;

  return {
    url,
    wsUrl,
    server,
    httpServer,
    cleanup: async () => {
      await server.stop();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      wsServer.close();
    },
  };
}

/**
 * Helper to create test server with authentication enabled
 */
export async function createAuthTestServer(authToken: string): Promise<TestServerInstance> {
  return createTestServer({
    enableAuth: true,
    authToken,
  });
}

/**
 * Helper to create test server without authentication
 */
export async function createUnauthTestServer(): Promise<TestServerInstance> {
  return createTestServer({
    enableAuth: false,
  });
}
