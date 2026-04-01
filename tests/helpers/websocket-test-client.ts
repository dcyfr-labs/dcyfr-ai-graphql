/**
 * WebSocket Test Client Wrapper
 * 
 * Provides a test-friendly wrapper around graphql-ws client with:
 * - Promise-based connection management
 * - Automatic cleanup
 * - Test-friendly assertions
 * - Timeout handling
 */

import { createClient, Client, ClientOptions } from 'graphql-ws';
import { GraphQLFormattedError } from 'graphql';
import WebSocket from 'ws';

export interface TestClientOptions {
  url: string;
  connectionParams?: Record<string, unknown>;
  timeout?: number;
}

export interface SubscriptionResult<T = unknown> {
  data?: T | null;
  errors?: readonly GraphQLFormattedError[];
}

export class WebSocketTestClient {
  private client: Client | null = null;
  private url: string;
  private connectionParams?: Record<string, unknown>;
  private timeout: number;
  private activeSubscriptions: Set<() => void> = new Set();

  constructor(options: TestClientOptions) {
    this.url = options.url;
    this.connectionParams = options.connectionParams;
    this.timeout = options.timeout || 5000; // 5s default
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Connection timeout after ${this.timeout}ms`));
      }, this.timeout);

      this.client = createClient({
        url: this.url,
        webSocketImpl: WebSocket,
        connectionParams: this.connectionParams,
        retryAttempts: 0, // No retries in tests
        on: {
          connected: () => {
            clearTimeout(timeoutId);
            resolve();
          },
          error: (error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
        },
      });
    });
  }

  /**
   * Subscribe to a GraphQL subscription
   */
  async subscribe<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<{
    next: () => Promise<SubscriptionResult<T>>;
    error: () => Promise<Error>;
    complete: () => Promise<void>;
    unsubscribe: () => void;
  }> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const results: Array<SubscriptionResult<T>> = [];
    const errors: Array<Error> = [];
    let completed = false;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Subscription timeout after ${this.timeout}ms`));
      }, this.timeout);

      const unsubscribe = this.client!.subscribe<T>(
        {
          query,
          variables,
        },
        {
          next: (result) => {
            results.push(result);
          },
          error: (error) => {
            errors.push(error instanceof Error ? error : new Error(String(error)));
          },
          complete: () => {
            completed = true;
          },
        }
      );

      this.activeSubscriptions.add(unsubscribe);

      // Wait a bit for initial response
      setTimeout(() => {
        clearTimeout(timeoutId);
        resolve({
          next: async () => {
            if (results.length > 0) {
              return results.shift()!;
            }
            // Wait for next result
            return new Promise<SubscriptionResult<T>>((nextResolve, nextReject) => {
              const checkInterval = setInterval(() => {
                if (results.length > 0) {
                  clearInterval(checkInterval);
                  nextResolve(results.shift()!);
                }
                if (completed || errors.length > 0) {
                  clearInterval(checkInterval);
                  nextReject(new Error('Subscription completed or errored'));
                }
              }, 10);

              setTimeout(() => {
                clearInterval(checkInterval);
                nextReject(new Error('Timeout waiting for next result'));
              }, this.timeout);
            });
          },
          error: async () => {
            if (errors.length > 0) {
              return errors.shift()!;
            }
            return new Promise<Error>((errorResolve, errorReject) => {
              const checkInterval = setInterval(() => {
                if (errors.length > 0) {
                  clearInterval(checkInterval);
                  errorResolve(errors.shift()!);
                }
              }, 10);

              setTimeout(() => {
                clearInterval(checkInterval);
                errorReject(new Error('Timeout waiting for error'));
              }, this.timeout);
            });
          },
          complete: async () => {
            return new Promise<void>((completeResolve, completeReject) => {
              const checkInterval = setInterval(() => {
                if (completed) {
                  clearInterval(checkInterval);
                  completeResolve();
                }
              }, 10);

              setTimeout(() => {
                clearInterval(checkInterval);
                completeReject(new Error('Timeout waiting for completion'));
              }, this.timeout);
            });
          },
          unsubscribe: () => {
            this.activeSubscriptions.delete(unsubscribe);
            unsubscribe();
          },
        });
      }, 100); // Small delay to ensure subscription is registered
    });
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    // Unsubscribe from all active subscriptions
    this.activeSubscriptions.forEach((unsubscribe) => unsubscribe());
    this.activeSubscriptions.clear();

    if (this.client) {
      await this.client.dispose();
      this.client = null;
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.client !== null;
  }
}

/**
 * Helper function to create and connect a test client
 */
export async function createTestClient(
  options: TestClientOptions
): Promise<WebSocketTestClient> {
  const client = new WebSocketTestClient(options);
  await client.connect();
  return client;
}
