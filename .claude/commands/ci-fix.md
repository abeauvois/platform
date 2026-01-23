# /ci-fix

Run CI checks and fix errors iteratively until all checks pass.

## Steps

1. Run `bun run ci:local` (typecheck → lint → build → unit tests)
2. If all checks pass, report success and stop
3. If errors occur:
   - Analyze the error output to identify the root cause
   - Fix the errors in the source code
   - Run `bun run ci:local` again
4. Repeat steps 2-3 until all checks pass (max 10 iterations)
5. Summarize all fixes made

## Error Priority

- Fix TypeScript errors first (they often cause downstream failures)
- Then fix lint errors
- Then fix build errors
- Finally fix test failures

## Guidelines

- Make minimal changes to fix errors
- Don't refactor unrelated code
- If a fix requires architectural decisions, ask before proceeding
- If stuck after 3 attempts on the same error, ask for guidance
