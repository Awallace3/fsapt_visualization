# AGENTS.md - Development Guidelines for fsapt-visualization

## Build/Lint/Test Commands

### JavaScript/TypeScript
- **Build UI**: `npm run build-ui` - Builds React UI with esbuild
- **Build CSS**: `npm run css` - Compiles SCSS to CSS
- **Watch mode**: `npm run watch` - Development build with file watching

### Python
- **Run Flask server**: `python app.py` - Starts API server on port 5000
- **No test framework configured** - Tests not yet implemented

### Testing
- **Single test**: Not available - implement testing framework first
- **API testing**: Use curl or UI health check when implemented

## Code Style Guidelines

### TypeScript/React
- **Imports**: React first, then package, then local imports
- **Formatting**: 2-space indentation, lines <100 chars
- **Types**: Define interfaces for props and data structures
- **Naming**: camelCase variables/functions, PascalCase components
- **Components**: Functional with hooks, const styles objects
- **Error Handling**: try-catch with descriptive messages

### Python
- **Imports**: Standard library, third-party, then local
- **Formatting**: PEP 8, 4-space indentation
- **Naming**: snake_case variables/functions, PascalCase classes
- **Error Handling**: try-except with logging, JSON responses
- **Type Hints**: Include annotations for parameters/returns

### General
- **Comments**: Docstrings for complex functions only
- **Security**: Never log sensitive data, validate inputs
- **Performance**: Handle async operations to avoid blocking
