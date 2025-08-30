# Claude Rules for Hexers Project

## Memory
This file serves as both the rules and memory for the Claude assistant working on this project.

## Project Type
- Turn-based web casual singleplayer game
- React TypeScript frontend application
- Single page application with canvas-based main functionality
- No cross-page state management (no Zustand, Redux, etc.)
- Uses Vite for bundling and development

## Code Style Guidelines
- All utility functions must be arrow functions
- Utility functions must be placed in `/src/utils/` folder
- All utility functions must have corresponding tests
- Use TypeScript strict mode
- Follow existing code patterns and conventions
- Numerical/string constants affecting app behavior live in `/src/config/`

## Canvas Requirements
- Main canvas resolution: 1920x1080
- Canvas must scale while preserving aspect ratio
- Canvas should be responsive to window resizing
- Uses requestAnimationFrame with 60 FPS cap
- FPS counter displayed in top-left corner
- Persistent, regular, and reliable refresh cycle
- New canvas logic should not request additional rerenders
- Canvas updates frame consistently in single render loop

## Game Display
- Main canvas renders collection of hexagons in grid/comb shape
- Approximately 20 rows of hexagon cells vertically
- Hexagons are horizontal-positioned with gaps (not touching)
- Thick, noticeable hexagon borders
- Hexagons serve as cells for playable immobile units
- Canvas background: starry space (pitch black with rare pixel stars)
- No animation for background stars
- Hover effects: cursor:pointer and dark purple border on hexagon hover

## Performance Guidelines
- TARGET_FPS config constant controls frame rate cap
- All rendering happens in single animation loop
- No additional render requests from game logic
- Consistent frame timing for smooth gameplay

## Build and Development
- Development: `yarn dev`
- Production build outputs to `/dist`
- Assets stored in `/public/assets`
- Tests use Vitest framework

## Testing Requirements
- All utility functions must have test coverage
- Run tests with `yarn test`
- Test files should use `.test.ts` extension

## What NOT to do
- Do not add cross-page state management
- Do not add Docker configuration
- Do not add CI/CD pipelines
- Do not add e2e testing
- Do not create additional render loops
- Keep the project simple and focused

## Theme System
- All colors must be defined in `/src/theme/index.ts` palette
- All typography settings must use theme typography presets
- When adding new UI elements, reference theme values, not hardcoded colors
- Theme structure:
  - `palette`: All color definitions
  - `typography`: Font sizes, weights, families, line heights
  - `spacing`: Standardized spacing values
- Canvas rendering must use theme values for consistency
- Extend theme file when new values needed, don't hardcode

## File Organization
```
/src
  /components   - React components
  /config       - Constants and configuration
  /theme        - Palette, typography, spacing definitions
  /utils        - Arrow function utilities
  /test         - Test configuration
/public
  /assets       - Graphics, sounds, fonts
/dist           - Production build output
.claude         - Claude rules and memory (this file)
```