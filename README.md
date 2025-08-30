# Hexers

A React TypeScript turn-based hexagon grid game with scalable canvas.

## Features

- React 18 with TypeScript
- Vite for fast development and building
- Scalable 1920x1080 canvas with 60 FPS cap
- Hexagon grid system with hover effects
- Perlin, Simplex, and Voronoi noise generators
- Comprehensive testing with Vitest
- ESLint for code quality

## Cursor IDE Setup

Enable format on save:
1. Open Settings (`Cmd+,` on Mac / `Ctrl+,` on Windows)
2. Search for "format on save"
3. Check "Editor: Format On Save"
4. Set default formatter to ESLint

## Getting Started

### Prerequisites

- Node.js 18+ 
- Yarn package manager

### Installation

```bash
yarn install
```

### Development

```bash
yarn dev
```

The application will be available at http://localhost:3000

### Building for Production

```bash
yarn build
```

The production build will be generated in the `dist` folder.

### Testing

Run tests:
```bash
yarn test
```

Watch mode:
```bash
yarn test:watch
```

Coverage report:
```bash
yarn test:coverage
```

### Linting

```bash
yarn lint
```

### Type Checking

```bash
yarn typecheck
```

## Project Structure

```
hexers/
├── public/
│   └── assets/        # Static assets (images, sounds, fonts)
├── src/
│   ├── components/    # React components
│   ├── utils/         # Utility functions
│   └── test/          # Test configuration
├── dist/              # Production build output
└── .claude/           # Claude AI configuration
```

## License

MIT