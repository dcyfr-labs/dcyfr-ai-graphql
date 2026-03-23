# Contributing to @dcyfr/ai-graphql

## Licensing & Contributions

By contributing to `@dcyfr/ai-graphql`, you agree that:

- Your contributions will be licensed under the project's MIT License
- You have the right to submit the contribution under this license
- You grant DCYFR Labs perpetual rights to use, modify, and distribute your contribution

### Trademark

Do not use "DCYFR" trademarks in ways that imply endorsement without permission. See [../TRADEMARK.md](../TRADEMARK.md) for usage guidelines.

**Questions?** Contact [licensing@dcyfr.ai](mailto:licensing@dcyfr.ai)

## Development Setup

```bash
npm install
npm run dev
```

## Code Style

- TypeScript strict mode
- ESLint for linting (`npm run lint`)
- Follow existing patterns for new types/resolvers

## Adding Features

1. Schema changes go in `src/schema/typeDefs/`
2. Implement resolvers in `src/resolvers/`
3. Business logic in `src/services/`
4. Write tests for all new functionality
5. Run `npm run typecheck` and `npm run test:run` before submitting

## Test Requirements

- All tests must pass: `npm run test:run`
- TypeScript must compile: `npm run typecheck`
