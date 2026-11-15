Dirghayu TypeScript fixes

This patch contains only the source/config/test files changed to resolve the reported TypeScript errors.

How to apply on Windows:
1. Make a backup copy of C:\dev\dirghayu first.
2. Extract this ZIP directly into C:\dev\dirghayu.
3. When Windows asks whether to replace files, choose Replace the files in the destination.
4. Open PowerShell in C:\dev\dirghayu and run:
   npm.cmd run typecheck
   npm.cmd test

Validation performed here:
- TypeScript: PASS (tsc --noEmit; zero errors)
- Vitest: could not be run in this Linux environment because the uploaded node_modules were installed on Windows and the Linux Rollup native optional dependency was unavailable. Run the tests on your Windows machine using your existing Windows node_modules.

No .env files, credentials, or node_modules are included in this patch.
