# Frontend

Static prototype assets live under public/, while React-ready source code belongs in src/.

## Suggested workflow
- Migrate each HTML screen from public/pages into React components in src/pages.
- Share layout pieces (header, footer, floating icons) through src/components.
- Centralize styling in src/styles (e.g., CSS Modules or styled-components).
- Use src/routes to define React Router route declarations mapped to backend endpoints.

When ready, wire API calls to the Python backend using etch/xios, keeping route paths consistent with backend /api/... definitions.
