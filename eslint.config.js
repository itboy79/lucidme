// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';

export default tseslint.config(
  {
    ignores: [
      '**/build/**',
      '**/dist/**',
      '**/.svelte-kit/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/.vercel/**',
      'native/ios/**',
      'native/android/**',
      'e2e/playwright-report/**',
      'e2e/test-results/**',
      '**/*.config.{js,cjs,mjs,ts}',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    // Config di base per .ts/.js: parser TS + extraFileExtensions così
    // typescript-eslint riconosce i .svelte (necessario per regole type-aware).
    name: 'lucidme:ts-base',
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        extraFileExtensions: ['.svelte'],
      },
      globals: {
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        crypto: 'readonly',
        AudioContext: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
      },
    },
  },
  // eslint-plugin-svelte: parser svelte per i .svelte + processor (DEPO il ts-base,
  // così vince per i .svelte; il ts-base resta per i .ts/.js).
  ...svelte.configs['flat/recommended'],
  {
    // Per i .svelte: il parser resta svelte-eslint-parser (da flat/recommended),
    // ma i <script lang="ts"> vanno parsati con @typescript-eslint/parser.
    name: 'lucidme:svelte-ts-script',
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.svelte'],
      },
    },
  },
  {
    rules: {
      // Regola §8.5.4 wiki: nessun testo sogni in log; warning su console.* fuori src/lib/dev
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // no-undef disattivato per TS/Svelte: TypeScript copre già i controlli di
      // definizione (tipi DOM come MouseEvent/HTMLInputElement sono in lib.dom).
      // Raccomandato da typescript-eslint quando si usa il parser TS.
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          // Parametri/variabili con prefisso _ sono intenzionalmente ignorati
          // (es. indice only in #each, args di firma/interface).
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': false,
          // @ts-ignore vietato; APPROVED-BY-PM solo con ts-expect-error + commento
          minimumDescriptionLength: 12,
        },
      ],
    },
  },
);
