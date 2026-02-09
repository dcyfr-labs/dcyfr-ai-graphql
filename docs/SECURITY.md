# Security Policy — @dcyfr/ai-graphql

**GraphQL Security Best Practices for Production APIs**

Version: 1.0.0  
Last Updated: February 8, 2026

---

## 🔒 Security Overview

GraphQL APIs require special security considerations beyond traditional REST APIs. This template implements industry best practices for:

- Query Depth & Complexity Limiting
- Authentication & Authorization
- Rate Limiting & DoS Protection
- Input Validation & Sanitization
- Secure Subscriptions
- Data Exposure Prevention

---

## 🎯 OWASP Top 10 for GraphQL

### 1. Broken Object Level Authorization

**Risk:** Users can access data they shouldn't (e.g., other users' posts).

**Mitigation:**

```typescript
// ❌ WRONG - No authorization check
export const postResolvers = {
  Query: {
    post: async (_parent, { id }, context) => {
      return context.services.post.findById(id); // Anyone can read any post!
    }
  }
};

// ✅ CORRECT - Field-level authorization
export const postResolvers = {
  Post: {
    content: (post, _args, context) => {
      // Only show content if published OR user is author/admin
      if (post.published) return post.content;
      
      const user = context.user;
      if (!user) return null;
      if (user.role === 'ADMIN' || user.id === post.authorId) {
        return post.content;
      }
      
      return null; // Hidden for unauthorized users
    }
  }
};
```

**Template Implementation:**
- `requireAuth(user)` - Enforces authentication
- `requireAdmin(user)` - Enforces admin role
- Field-level resolvers check ownership before returning data

---

### 2. Broken Authentication

**Risk:** Weak JWT secrets, no expiration, insecure storage.

**Mitigation:**

```bash
# ✅ CORRECT - Strong JWT configuration
JWT_SECRET=kh3wf98hf9w8hefh9w8ehf98wehf9w8hef  # 32+ random characters
JWT_EXPIRES_IN=7d                              # Expire tokens after 7 days
```

```typescript
// ✅ Password hashing with bcrypt
import { hashPassword, verifyPassword } from '@dcyfr/ai-graphql/lib/utils/auth';

const passwordHash = hashPassword('userPassword123'); // bcrypt with salt rounds
const isValid = verifyPassword('userPassword123', passwordHash);
```

**Best Practices:**
- Use strong, random JWT secrets (>= 32 characters)
- Set reasonable token expiration (1-7 days)
- Store tokens securely in HttpOnly cookies (not localStorage)
- Implement token refresh mechanism
- Hash passwords with bcrypt (≥10 rounds)

---

### 3. Excessive Data Exposure

**Risk:** Returning sensitive fields like `passwordHash`, internal IDs, metadata.

**Mitigation:**

```typescript
// ❌ WRONG - Exposing password hash
const user = db.findUserById(id);
return user; // Returns { id, email, passwordHash }

// ✅ CORRECT - Strip sensitive fields
const user = db.findUserById(id);
const { passwordHash, ...safeUser } = user;
return safeUser; // Returns { id, email, name }
```

**Template Implementation:**
- All user queries strip `passwordHash` before returning
- Database layer excludes sensitive fields by default
- Field resolvers check permissions before exposing data

---

### 4. Lack of Resources & Rate Limiting

**Risk:** Denial of Service through expensive queries, infinite batching.

**Mitigation:**

```typescript
// ✅ Rate limiting
import { createRateLimiter } from '@dcyfr/ai-graphql/middleware';

const limiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 100       // 100 requests/minute
});

if (!limiter.check(req.ip)) {
  throw new Error('Rate limit exceeded');
}
```

```graphql
# ❌ DANGEROUS - Unbounded depth
query DeepQuery {
  user(id: "1") {
    posts {
      edges {
        node {
          author {
            posts {
              edges {
                node {
                  author {
                    # ... infinite nesting
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Query Complexity Limits:**

```typescript
// ✅ Limit query depth (use graphql-depth-limit)
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  schema,
  validationRules: [depthLimit(5)] // Max 5 levels deep
});
```

**Template Configuration:**
- Rate limiter: 100 requests/minute by default
- Recommended: Add query depth limits (5-7 levels)
- Recommended: Add query complexity analysis

---

### 5. Broken Function Level Authorization

**Risk:** Unauthenticated users can call admin-only mutations.

**Mitigation:**

```typescript
// ❌ WRONG - No permission check
export const resolvers = {
  Mutation: {
    deleteUser: async (_parent, { id }, context) => {
      await context.services.user.delete(id); // Anyone can delete!
      return true;
    }
  }
};

// ✅ CORRECT - Require admin role
export const resolvers = {
  Mutation: {
    deleteUser: async (_parent, { id }, context) => {
      const admin = requireAdmin(context.user); // Throws if not admin
      await context.services.user.delete(id);
      return true;
    }
  }
};
```

**Template Helpers:**

```typescript
import { requireAuth, requireAdmin } from '@dcyfr/ai-graphql/middleware';

// Require authentication
const user = requireAuth(context.user);
// Throws "Authentication required" if user is null

// Require admin role
const admin = requireAdmin(context.user);
// Throws "Admin access required" if user.role !== 'ADMIN'
```

---

### 6. Introspection Enabled in Production

**Risk:** Attackers can discover full schema structure and plan attacks.

**Mitigation:**

```typescript
// ✅ Disable introspection in production
const server = new ApolloServer({
  schema,
  introspection: process.env.NODE_ENV !== 'production',
  playground: process.env.NODE_ENV !== 'production'
});
```

**Best Practices:**
- Disable introspection in production
- Disable GraphQL Playground/Sandbox in production
- Use allowlist for known operations in production

---

### 7. Injection Attacks

**Risk:** SQL injection, NoSQL injection through GraphQL inputs.

**Mitigation:**

```typescript
// ❌ WRONG - Direct string concatenation
const query = `SELECT * FROM users WHERE email = '${input.email}'`; // SQL injection!

// ✅ CORRECT - Parameterized queries
const query = 'SELECT * FROM users WHERE email = ?';
const users = await db.query(query, [input.email]);

// ✅ Input validation with Zod
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128)
});

const validated = createUserSchema.parse(input); // Throws if invalid
```

**Template Implementation:**
- All mutation inputs validated with Zod schemas
- Database uses parameterized queries (prepared statements)
- Input sanitization for special characters

---

### 8. Server-Side Request Forgery (SSRF)

**Risk:** GraphQL fetches attacker-controlled URLs.

**Mitigation:**

```typescript
// ❌ WRONG - Fetching user-provided URLs
mutation {
  fetchData(url: "http://localhost:6379/admin") {
    content
  }
}

// ✅ CORRECT - Allowlist approved domains
const ALLOWED_DOMAINS = ['api.example.com', 'cdn.example.com'];

function validateUrl(url: string): boolean {
  const parsed = new URL(url);
  return ALLOWED_DOMAINS.includes(parsed.hostname);
}

if (!validateUrl(input.url)) {
  throw new Error('URL not allowed');
}
```

**Best Practices:**
- Never fetch user-provided URLs without validation
- Use domain allowlists for external fetches
- Block internal IP ranges (127.0.0.1, 10.0.0.0/8, etc.)

---

### 9. Batching Attacks

**Risk:** Attackers send 1,000 operations in a single request.

**Mitigation:**

```typescript
// ✅ Limit batch size
const server = new ApolloServer({
  schema,
  plugins: [
    {
      async requestDidStart() {
        return {
          async didResolveOperation({ request }) {
            const operationCount = request.query.split('{').length - 1;
            if (operationCount > 10) {
              throw new Error('Too many operations in batch');
            }
          }
        };
      }
    }
  ]
});
```

**Recommended Limits:**
- Max 10 operations per batched request
- Max 1,000 items per mutation array input
- Timeout requests after 30 seconds

---

### 10. Improper Error Handling

**Risk:** Leaking stack traces, database errors, internal paths.

**Mitigation:**

```typescript
// ❌ WRONG - Exposing internal errors
throw new Error(`Database connection failed: ${dbError.stack}`);

// ✅ CORRECT - Generic user-facing errors
if (dbError) {
  console.error('Database error:', dbError); // Log internally
  throw new Error('An internal error occurred'); // Generic message
}

// ✅ Custom error formatting
const server = new ApolloServer({
  schema,
  formatError: (error) => {
    // Log full error internally
    console.error('GraphQL Error:', error);
    
    // Return sanitized error to client
    if (process.env.NODE_ENV === 'production') {
      return {
        message: error.message,
        // Hide stack trace and extensions in production
      };
    }
    
    return error; // Full error in development
  }
});
```

---

## 🛡️ Additional Security Measures

### CORS Configuration

```typescript
import cors from 'cors';

// ✅ Production CORS - Specific origins only
app.use(cors({
  origin: ['https://yourapp.com', 'https://www.yourapp.com'],
  credentials: true
}));

// ❌ Development CORS (NOT for production)
app.use(cors({ origin: '*' })); // Allows all origins!
```

### HTTPS/TLS

```bash
# ✅ Always use HTTPS in production
https://api.example.com/graphql

# ❌ Never use HTTP in production
http://api.example.com/graphql  # Unencrypted!
```

### Content Security Policy

```typescript
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

### Secure Subscriptions

```typescript
// ✅ Authenticate WebSocket connections
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

useServer({
  schema,
  context: async (ctx) => {
    // Extract token from connection params
    const token = ctx.connectionParams?.authorization;
    const user = extractUser({ authorization: token }, config);
    
    if (!user) {
      throw new Error('Unauthorized subscription');
    }
    
    return { user };
  },
  onSubscribe: async (ctx, msg) => {
    // Additional authorization per subscription
    if (msg.payload.query.includes('adminChannel')) {
      requireAdmin(ctx.user);
    }
  }
}, wsServer);
```

---

## 📊 Security Checklist

### Before Deployment

- [ ] **JWT Secret:** 32+ random characters, not committed to Git
- [ ] **Password Hashing:** bcrypt with ≥10 rounds
- [ ] **Rate Limiting:** Enabled (100 req/min recommended)
- [ ] **Query Depth Limit:** Max 5-7 levels
- [ ] **Introspection:** Disabled in production
- [ ] **HTTPS/TLS:** Enforced for all traffic
- [ ] **CORS:** Restricted to specific origins
- [ ] **Input Validation:** Zod schemas for all mutations
- [ ] **Error Messages:** Sanitized (no stack traces in production)
- [ ] **Authentication:** requireAuth/requireAdmin on sensitive resolvers
- [ ] **Field Permissions:** Sensitive fields check ownership
- [ ] **Subscription Auth:** WebSocket connections authenticated
- [ ] **Logging:** Security events logged (failed logins, auth errors)
- [ ] **Dependencies:** No known vulnerabilities (`npm audit`)

### Monitoring

- [ ] Failed authentication attempts
- [ ] Rate limit violations
- [ ] Unusual query patterns (very deep, very complex)
- [ ] Error rates by operation
- [ ] Slow queries (>1 second)

---

## 🚨 Reporting Security Issues

**DO NOT** open public GitHub issues for security vulnerabilities.

**Email:** security@dcyfr.ai  
**PGP Key:** https://dcyfr.ai/.well-known/security.txt

We will respond within 48 hours and aim to patch critical issues within 7 days.

---

## 📚 Security Resources

- **OWASP GraphQL Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html
- **GraphQL Security Guide:** https://www.graphql-ruby.org/queries/security.html
- **Apollo Security Best Practices:** https://www.apollographql.com/docs/apollo-server/security/

---

**Total Word Count:** 1,847 words  
**Last Updated:** February 8, 2026  
**License:** MIT
