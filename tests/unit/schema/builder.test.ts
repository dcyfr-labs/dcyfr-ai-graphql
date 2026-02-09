/**
 * Schema builder tests
 */

import { describe, it, expect } from 'vitest';
import { buildSchema } from '../../../src/schema/index.js';
import { GraphQLSchema } from 'graphql';

describe('buildSchema', () => {
  it('should build a valid GraphQL schema', () => {
    const schema = buildSchema();
    expect(schema).toBeInstanceOf(GraphQLSchema);
  });

  it('should have Query type', () => {
    const schema = buildSchema();
    const queryType = schema.getQueryType();
    expect(queryType).toBeDefined();
    expect(queryType?.name).toBe('Query');
  });

  it('should have Mutation type', () => {
    const schema = buildSchema();
    const mutationType = schema.getMutationType();
    expect(mutationType).toBeDefined();
    expect(mutationType?.name).toBe('Mutation');
  });

  it('should have Subscription type', () => {
    const schema = buildSchema();
    const subscriptionType = schema.getSubscriptionType();
    expect(subscriptionType).toBeDefined();
    expect(subscriptionType?.name).toBe('Subscription');
  });

  it('should include custom DateTime scalar', () => {
    const schema = buildSchema();
    const dateTimeType = schema.getType('DateTime');
    expect(dateTimeType).toBeDefined();
    expect(dateTimeType?.name).toBe('DateTime');
  });

  it('should include custom JSON scalar', () => {
    const schema = buildSchema();
    const jsonType = schema.getType('JSON');
    expect(jsonType).toBeDefined();
    expect(jsonType?.name).toBe('JSON');
  });

  it('should include User type', () => {
    const schema = buildSchema();
    const userType = schema.getType('User');
    expect(userType).toBeDefined();
    expect(userType?.name).toBe('User');
  });

  it('should include Post type', () => {
    const schema = buildSchema();
    const postType = schema.getType('Post');
    expect(postType).toBeDefined();
    expect(postType?.name).toBe('Post');
  });

  it('should include Comment type', () => {
    const schema = buildSchema();
    const commentType = schema.getType('Comment');
    expect(commentType).toBeDefined();
    expect(commentType?.name).toBe('Comment');
  });
});
