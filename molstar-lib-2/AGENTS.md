# AGENTS.md - Development Guidelines for fsapt-visualization

## Build/Lint/Test Commands

### JavaScript/TypeScript (Vite + React)
- **Dev**: `npm run dev` - Vite dev server with HMR
- **Build**: `npm run build` - Production build
- **Lint**: `npm run lint` - ESLint TS/TSX
- **JSMol**: `npm run jsmol` - Copy JSMol assets
- **Preview**: `npm run preview` - Local serve build

### Python (Flask)
- **Run**: `python app.py` - API on port 5000
- **Tests**: None; add pytest

### Testing
- **Single test**: Not available; implement
- **API**: curl endpoints

## Code Style Guidelines

### TypeScript/React
- **Imports**: React > external > local
- **Formatting**: 2-space, <100 chars
- **Types**: Interfaces for props
- **Naming**: camelCase vars, PascalCase components
- **Components**: Functional + hooks
- **Errors**: try-catch, descriptive msgs

### Python
- **Imports**: std > 3rd > local
- **Formatting**: PEP8, 4-space
- **Naming**: snake_case funcs, PascalCase classes
- **Errors**: try-except + JSON
- **Hints**: Type annotations

### General
- **Comments**: Docstrings only for complex
- **Security**: Validate inputs, no secrets
- **Perf**: Async ops, React memo
