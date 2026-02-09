# API Reference — @dcyfr/ai-graphql

**Production GraphQL API template with Apollo Server 4, type-safe resolvers, and real-time subscriptions.**

Version: 1.0.0  
Last Updated: February 8, 2026

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [GraphQL Schema](#graphql-schema)
4. [Type Definitions](#type-definitions)
5. [Resolvers](#resolvers)
6. [Custom Scalars](#custom-scalars)
7. [Authentication & Authorization](#authentication--authorization)
8. [DataLoaders (N+1 Prevention)](#dataloaders-n1-prevention)
9. [Subscriptions](#subscriptions)
10. [Rate Limiting](#rate-limiting)
11. [Services Layer](#services-layer)
12. [Configuration](#configuration)

---

## Installation

```bash
npm install @dcyfr/ai-graphql
# or
pnpm install @dcyfr/ai-graphql
# or
yarn add @dcyfr/ai-graphql
```

### Requirements

- **Node.js:** 20.x or higher
- **TypeScript:** 5.7+ (recommended)
- **Apollo Server:** 4.11+ (included)

---

##Quick Start

### Development Server

```typescript
import { startServer } from '@dcyfr/ai-graphql';
import { loadConfig } from '@dcyfr/ai-graphql/config';

const config = loadConfig();
await startServer(config);

// Server available at http://localhost:4000/graphql
// Apollo Sandbox at http://localhost:4000/graphql
```

### Example Query

```graphql
query GetUser {
  user(id: "1") {
    id
    name
    email
    posts {
      edges {
        node {
          id
          title
        }
      }
    }
  }
}
```

---

## GraphQL Schema

### Schema Structure

```
src/schema/
├── typeDefs/           # GraphQL SDL definitions
│   ├── user.graphql    # User types and queries
│   ├── post.graphql    # Post types and mutations
│   ├── comment.graphql # Comment types
│   └── index.ts        # Merged type definitions
├── scalars/            # Custom scalar implementations
│   ├── datetime.ts     # DateTime scalar (ISO-8601)
│   └── json.ts         # JSON scalar (arbitrary data)
└── index.ts            # Executable schema builder
```

### Building Schema

```typescript
import { buildSchema } from '@dcyfr/ai-graphql/schema';

const schema = buildSchema();
// Returns executable GraphQL schema with types + resolvers merged
```

---

## Type Definitions

### User Types

```graphql
type User {
  id: ID!
  email: String!
  name: String!
  bio: String
  role: UserRole!
  posts(first: Int, after: String): PostConnection!
  comments: [Comment!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum UserRole {
  USER
  ADMIN
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
```

### Post Types

```graphql
type Post {
  id: ID!
  title: String!
  content: String!
  published: Boolean!
  author: User!
  comments: [Comment!]!
  metadata: JSON
  createdAt: DateTime!
  updatedAt: DateTime!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PostEdge {
  node: Post!
  cursor: String!
}
```

### Pagination Types (Relay Spec)

```graphql
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

---

## Resolvers

### Query Resolvers

#### User Queries

```typescript
import { userResolvers } from '@dcyfr/ai-graphql/resolvers';

// Query.user(id: ID!): User | null
const user = await context.services.user.findById(id);

// Query.users(first: Int, after: String): UserConnection
const connection = await context.services.user.list(first, after);

// Query.me: User (requires authentication)
const currentUser = requireAuth(context.user);
```

**Example:**

```graphql
query GetUsers {
  users(first: 10) {
    edges {
      node {
        id
        name
        email
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

#### Post Queries

```typescript
import { postResolvers } from '@dcyfr/ai-graphql/resolvers';

// Query.post(id: ID!): Post | null
const post = await context.services.post.findById(id);

// Query.posts(first: Int, after: String, authorId: ID): PostConnection
const posts = await context.services.post.list({ first, after, authorId });
```

**Example:**

```graphql
query GetUserPosts {
  posts(authorId: "user-123", first: 5) {
    edges {
      node {
        id
        title
        content
        author {
          name
        }
        comments {
          id
          content
        }
      }
    }
  }
}
```

### Mutation Resolvers

#### Authentication Mutations

```typescript
import { authResolvers } from '@dcyfr/ai-graphql/resolvers';

// Mutation.register(input: RegisterInput!): AuthPayload!
const result = await context.services.user.register({
  email: 'user@example.com',
  name: 'John Doe',
  password: 'securePassword123'
});
// Returns: { token: string, user: User }

// Mutation.login(input: LoginInput!): AuthPayload!
const auth = await context.services.user.login({
  email: 'user@example.com',
  password: 'securePassword123'
});
```

**Example:**

```graphql
mutation RegisterUser {
  register(input: {
    email: "alice@example.com"
    name: "Alice Johnson"
    password: "SecurePass123!"
  }) {
    token
    user {
      id
      email
      name
      role
    }
  }
}

mutation LoginUser {
  login(input: {
    email: "alice@example.com"
    password: "SecurePass123!"
  }) {
    token
    user {
      id
      name
    }
  }
}
```

#### Post Mutations

```typescript
// Mutation.createPost(input: CreatePostInput!): Post!
const post = await context.services.post.create({
  title: 'GraphQL Best Practices',
  content: 'Content here...',
  published: true
});

// Mutation.updatePost(id: ID!, input: UpdatePostInput!): Post!
const updated = await context.services.post.update(id, {
  title: 'Updated Title'
});

// Mutation.deletePost(id: ID!): Boolean!
const deleted = await context.services.post.delete(id);
```

**Example:**

```graphql
mutation CreatePost {
  createPost(input: {
    title: "Getting Started with GraphQL"
    content: "GraphQL is a query language..."
    published: true
  }) {
    id
    title
    author {
      name
    }
    createdAt
  }
}
```

---

## Custom Scalars

### DateTime Scalar

ISO-8601 date-time string scalar with validation.

```typescript
import { DateTimeScalar } from '@dcyfr/ai-graphql/schema/scalars';

// Serialization (Date → string)
DateTimeScalar.serialize(new Date('2024-01-15T10:30:00.000Z'));
// → "2024-01-15T10:30:00.000Z"

// Parsing (string → Date)
DateTimeScalar.parseValue('2024-01-15T10:30:00.000Z');
// → Date object

// GraphQL Usage
const user = {
  id: '1',
  createdAt: new Date(), // Serialized to ISO string in response
  updatedAt: new Date()
};
```

**Schema Definition:**

```graphql
scalar DateTime

type User {
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### JSON Scalar

Arbitrary JSON value scalar for flexible metadata.

```typescript
import { JSONScalar } from '@dcyfr/ai-graphql/schema/scalars';

// Any valid JSON value
const metadata = {
  tags: ['graphql', 'api'],
  views: 1250,
  featured: true
};

// GraphQL Usage
const post = {
  id: '1',
  title: 'Post',
  metadata: metadata // Passed through as-is
};
```

**Schema Definition:**

```graphql
scalar JSON

type Post {
  metadata: JSON
}
```

---

## Authentication & Authorization

### JWT Authentication

```typescript
import { extractUser, requireAuth, requireAdmin } from '@dcyfr/ai-graphql/middleware';
import { createToken } from '@dcyfr/ai-graphql/lib/utils/auth';

// Create JWT token
const user = { id: '1', email: 'user@example.com', name: 'User', role: 'USER' };
const token = createToken(user, config.auth.jwtSecret, '7d');

// Extract user from request headers
const headers = { authorization: `Bearer ${token}` };
const authenticatedUser = extractUser(headers, config);

// Require authentication in resolver
const currentUser = requireAuth(context.user);
// Throws "Authentication required" if not logged in

// Require admin role
const admin = requireAdmin(context.user);
// Throws "Admin access required" if not admin
```

### Protected Resolver Example

```typescript
import { requireAuth } from '@dcyfr/ai-graphql/middleware';

export const postResolvers = {
  Mutation: {
    createPost: async (_parent, { input }, context) => {
      // Require authentication
      const user = requireAuth(context.user);
      
      // Create post for authenticated user
      return context.services.post.create({
        ...input,
        authorId: user.id
      });
    }
  }
};
```

### Context Type

```typescript
import type { GraphQLContext } from '@dcyfr/ai-graphql/lib/types';

interface GraphQLContext {
  user: AuthUser | null;
  services: {
    user: UserService;
    post: PostService;
    comment: CommentService;
  };
  loaders: {
    user: DataLoader<string, User | null>;
    post: DataLoader<string, Post | null>;
  };
}
```

---

## DataLoaders (N+1 Prevention)

### Creating DataLoaders

```typescript
import { createDataLoader } from '@dcyfr/ai-graphql/dataloaders';

// User DataLoader
const userLoader = createDataLoader<string, User | null>(async (ids) => {
  const users = await db.findUsersByIds(ids);
  return ids.map(id => users.find(u => u.id === id) || null);
});

// Load single user (batched)
const user = await userLoader.load('user-123');

// Load multiple users (batched)
const users = await userLoader.loadMany(['user-1', 'user-2', 'user-3']);

// Clear cache
userLoader.clear('user-123');
userLoader.clearAll();
```

### Resolver with DataLoader

```typescript
export const postResolvers = {
  Post: {
    // N+1 problem: Fetching author for each post
    author: async (post, _args, context) => {
      // DataLoader batches all author fetches automatically
      return context.loaders.user.load(post.authorId);
    }
  }
};

// Without DataLoader:
// SELECT * FROM users WHERE id = 1
// SELECT * FROM users WHERE id = 1  (duplicate!)
// SELECT * FROM users WHERE id = 2
// Total: 3 queries for 3 posts

// With DataLoader:
// SELECT * FROM users WHERE id IN (1, 2)
// Total: 1 query for 3 posts
```

### DataLoader API

```typescript
interface DataLoader<K, V> {
  load(key: K): Promise<V>;
  loadMany(keys: K[]): Promise<(V | Error)[]>;
  clear(key: K): void;
  clearAll(): void;
}
```

---

## Subscriptions

### WebSocket Server Setup

```typescript
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql'
});

useServer({ schema, context: createContext }, wsServer);
```

### Subscription Resolvers

```typescript
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

export const subscriptionResolvers = {
  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterator(['POST_CREATED'])
    },
    
    commentAdded: {
      subscribe: (_parent, { postId }) => {
        // Server-side filtering
        return pubsub.asyncIterator([`COMMENT_ADDED_${postId}`]);
      }
    }
  }
};

// Publish event
await pubsub.publish('POST_CREATED', { postCreated: newPost });
await pubsub.publish(`COMMENT_ADDED_${postId}`, { commentAdded: newComment });
```

### Client Subscription Example

```graphql
subscription OnPostCreated {
  postCreated {
    id
    title
    author {
      name
    }
    createdAt
  }
}

subscription OnCommentAdded($postId: ID!) {
  commentAdded(postId: $postId) {
    id
    content
    author {
      name
    }
    createdAt
  }
}
```

---

## Rate Limiting

### Rate Limiter API

```typescript
import { createRateLimiter, RateLimiter } from '@dcyfr/ai-graphql/middleware';

// Create rate limiter
const limiter = createRateLimiter({
  windowMs: 60 * 1000,   // 1 minute window
  maxRequests: 100        // 100 requests per window
});

// Check rate limit
const allowed = limiter.check('192.168.1.1'); // Returns boolean

// Check remaining requests
const remaining = limiter.remaining('192.168.1.1'); // Returns number

// Manual cleanup (automatic cleanup every 5 minutes)
limiter.cleanup();
```

### Configuration

```typescript
interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
}
```

### Usage in Resolvers

```typescript
import { createRateLimiter } from '@dcyfr/ai-graphql/middleware';

const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 });

export const resolvers = {
  Mutation: {
    createPost: async (_parent, { input }, context) => {
      const ip = context.req.ip;
      
      if (!limiter.check(ip)) {
        throw new Error('Rate limit exceeded. Try again later.');
      }
      
      return context.services.post.create(input);
    }
  }
};
```

---

## Services Layer

### UserService

```typescript
import { UserService } from '@dcyfr/ai-graphql/services';

const service = new UserService(config);

// Find by ID
const user = await service.findById('user-123');

// Find by email
const user = await service.findByEmail('alice@example.com');

// List users (pagination)
const { users, hasMore } = await service.list(20, 'cursor-xyz');

// Register new user
const { token, user } = await service.register({
  email: 'bob@example.com',
  name: 'Bob Smith',
  password: 'SecurePass123'
});

// Login
const { token, user } = await service.login({
  email: 'bob@example.com',
  password: 'SecurePass123'
});
```

### PostService

```typescript
import { PostService } from '@dcyfr/ai-graphql/services';

const service = new PostService();

// Find by ID
const post = await service.findById('post-456');

// List posts (with filters)
const { posts, hasMore } = await service.list({
  first: 10,
  after: 'cursor',
  authorId: 'user-123',
  published: true
});

// Create post
const post = await service.create({
  title: 'New Post',
  content: 'Content...',
  authorId: 'user-123',
  published: true
});

// Update post
const updated = await service.update('post-456', {
  title: 'Updated Title'
});

// Delete post
const deleted = await service.delete('post-456');
```

---

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=4000
NODE_ENV=production

# JWT Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Loading Configuration

```typescript
import { loadConfig } from '@dcyfr/ai-graphql/config';

const config = loadConfig();

interface Config {
  port: number;
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}
```

---

## Advanced Patterns

### Custom Context

```typescript
import { buildSchema } from '@dcyfr/ai-graphql/schema';
import { extractUser } from '@dcyfr/ai-graphql/middleware';
import { createDataLoader } from '@dcyfr/ai-graphql/dataloaders';

async function createContext({ req }): Promise<GraphQLContext> {
  const user = extractUser(req.headers.authorization, config);
  
  return {
    user,
    services: {
      user: new UserService(config),
      post: new PostService(),
      comment: new CommentService()
    },
    loaders: {
      user: createDataLoader(batchLoadUsers),
      post: createDataLoader(batchLoadPosts)
    },
    req
  };
}
```

### Field-Level Permissions

```typescript
export const postResolvers = {
  Post: {
    // Only author or admin can see unpublished posts
    content: (post, _args, context) => {
      if (post.published) return post.content;
      
      const user = context.user;
      if (!user) return null;
      if (user.role === 'ADMIN' || user.id === post.authorId) {
        return post.content;
      }
      
      return null;
    }
  }
};
```

---

## Best Practices

1. **Use DataLoaders** — Prevent N+1 queries for all relationship fields
2. **Validate Inputs** — Use Zod schemas/validation for all mutations
3. **Cursor Pagination** — Implement Relay-style connections for scalability
4. **Rate Limiting** — Protect expensive mutations and queries
5. **Field Permissions** — Lock down sensitive fields with auth checks
6. **Error Handling** — Return user-friendly errors, log security issues
7. **Schema Organization** — Modularize type definitions by domain
8. **Testing** — Unit test services, integration test resolvers

---

## Troubleshooting

### Common Issues

**WebSocket Connection Failed:**
- Ensure `/graphql` path matches between server and client
- Check CORS configuration allows WebSocket upgrades
- Verify firewall allows WebSocket traffic (port 4000)

**Authentication Errors:**
- Check JWT secret matches between services
- Verify token hasn't expired (check `JWT_EXPIRES_IN`)
- Ensure `Authorization: Bearer <token>` header format

**N+1 Query Performance:**
- Add DataLoaders for all foreign key relationships
- Use `@dataloader` monitoring to detect patterns
- Check database query logs during development

---

## Support

- **Documentation:** https://dcyfr.ai/docs/ai-graphql
- **GitHub:** https://github.com/dcyfr/dcyfr-ai-graphql
- **Email:** hello@dcyfr.ai

---

**Total Word Count:** 2,856 words  
**Last Updated:** February 8, 2026  
**License:** MIT
