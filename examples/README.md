# Examples

This directory contains runnable examples for `@dcyfr/ai-graphql`.

## Files

- `basic-queries/client.ts` — GraphQL query and pagination patterns.
- `auth-flow/client.ts` — Registration/login/authenticated request flow.
- `subscriptions/client.ts` — Real-time subscription usage.
- `resolvers.ts` — Resolver architecture patterns.
- `custom-directives.ts` — Directive usage (`@auth`, `@rateLimit`, `@cache`).

## Prerequisites

- Install dependencies: `npm install`

## Run examples

From package root:

- `tsx examples/basic-queries/client.ts`
- `tsx examples/auth-flow/client.ts`
- `tsx examples/subscriptions/client.ts`
- `tsx examples/resolvers.ts`
- `tsx examples/custom-directives.ts`

## Type-check examples

- `npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2022 --strict --esModuleInterop true --skipLibCheck true examples/resolvers.ts`
