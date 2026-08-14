import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Edge Functions are Deno: URL imports, a different global set, and they are
  // deliberately outside tsconfig. Type-aware linting cannot parse them, and
  // pretending otherwise produces four parse errors that mean nothing.
  globalIgnores(['dist', 'coverage', 'public/litert-wasm', 'supabase/functions/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      // `strictTypeChecked` over `recommended` — MASTERPLAN S0.9 claimed
      // "TypeScript strict rules" in March while the config had exactly one
      // custom rule on top of `recommended`. This makes that claim true.
      // It requires type information, which is why `projectService` is set below
      // and why linting is measurably slower than it was.
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Supabase's generated types are loose enough that a template-literal
      // interpolation of a typed-but-unknown value is routine and safe here.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true, allowNullish: true },
      ],
      // Style, not correctness — and it fights the ordinary React idiom
      // `onClick={() => setOpen(true)}`, which is clear as written. Turning it
      // off is a deliberate choice, not an oversight: the rules kept below are
      // the ones that catch bugs.
      '@typescript-eslint/no-confusing-void-expression': 'off',
      // ── Rules disabled at the untyped API boundary, with reasons ──
      //
      // Supabase results arrive as `any` and are CAST (`data as Row[]`), not
      // inferred. Type-aware rules assume the declared type is the truth; at
      // this boundary it is a promise the server has not made. So:
      //
      // no-unnecessary-condition would have us delete the `?.` and `??` guards
      // that are protecting against exactly the nulls the cast hides. Removing
      // a runtime guard because a cast says it is redundant is how a null
      // reaches production.
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // The no-unsafe-* family flags every read of a Supabase result for the
      // same reason. The honest fix is generated database types (a task for
      // whenever the project is re-provisioned — OG1), not scattered casts.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // Spreading a string is used deliberately to count code points in the
      // emoji/glyph guard, which is the correct behaviour there.
      '@typescript-eslint/no-misused-spread': 'off',
      //
      // ── Kept, because these catch real bugs ──
      // no-floating-promises and no-misused-promises stay ON: an unawaited
      // promise in an event handler is how a submit silently does nothing.
    },
  },
  {
    // Tests deliberately construct malformed input to prove the code survives
    // it, so the strictest type rules fight the point of the file.
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },
])
