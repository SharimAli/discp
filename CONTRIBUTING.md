# Contributing to Discp

Thank you for your interest in improving Discp! We welcome contributions, bug reports, and suggestions from the community.

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/SharimAli/discp.git
   cd discp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build and test:
   ```bash
   npm run build
   npm run check
   ```

## Pull Request Guidelines

1. **Keep it Modular:** New Discord tools should be categorized into their appropriate domain module under `src/tools/`.
2. **Preserve Human Pacing:** Always preserve or include `humanPace(...)` on sensitive create/delete/modify actions to prevent account flagging.
3. **Type Safety:** Ensure all TypeScript checks pass (`npm run check`) with zero errors.
4. **Clean Commits:** Write clear, concise commit messages.
