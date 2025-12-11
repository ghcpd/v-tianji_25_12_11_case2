# Collaborative Code Review Platform

A complex frontend application for code review and collaboration, built with React, TypeScript, and modern web technologies.

## Architecture Overview

This project demonstrates multiple architectural patterns and design decisions that require team discussion and collaboration. The codebase intentionally includes:

- Multiple state management approaches (Context API, Zustand)
- Different component patterns (HOC, Render Props, Compound Components)
- Complex caching strategies (Memory, IndexedDB, localStorage)
- Performance optimization techniques (virtual scrolling, debouncing, request deduplication)
- Error handling strategies
- Type safety considerations

## Key Discussion Points

### State Management
- Context API vs Zustand: Both are implemented and can be toggled
- When to use each approach?
- How to handle synchronization between different stores?

### Caching Strategy
- Multi-layer caching (memory, IndexedDB, localStorage)
- Cache invalidation strategies
- TTL and expiration handling
- Memory management and LRU eviction

### Performance Optimization
- Virtual scrolling implementation
- Request deduplication
- Optimistic updates
- Performance monitoring

### Component Patterns
- HOC pattern for error boundaries
- Render Props for data fetching
- Compound Components for flexible UI
- When to use each pattern?

### Error Handling
- Centralized error handling
- Error recovery strategies
- User-facing error messages
- Error logging and monitoring

## Getting Started

```bash
npm install
npm run dev
```

## Project Structure

```
src/
├── components/
│   ├── compound/      # Compound component pattern
│   ├── hoc/          # Higher-order components
│   └── renderProps/  # Render props pattern
├── contexts/         # React Context API
├── hooks/            # Custom React hooks
├── services/         # Business logic and API
├── store/            # Zustand store
└── types/            # TypeScript definitions
```

## Technical Discussion

- See [Technical Discussion on Intermittent Behavior and Architectural Consistency](src/TECHNICAL_DISCUSSION_INTERMITTENT_BEHAVIOR.md) for a focused analysis of intermittent data, caching, and state concerns.

