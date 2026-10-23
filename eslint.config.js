import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

const BOUNDARY = (message) => ({ message });

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'packages/api/var/**',
      'spec/**',
      '**/*.md',
      'package-lock.json',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Use crypto.randomUUID()/crypto.randomBytes() instead of Math.random (spec_tecnica Â§12).',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'eval', message: 'eval is not allowed (spec_tecnica Â§3.3).' },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: ['packages/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@cj/api', '@cj/ocr', '@cj/web'],
              ...BOUNDARY(
                'core must stay pure: allowed deps are @cj/contracts and @noble/hashes (spec_tecnica Â§3.2).',
              ),
            },
            {
              group: [
                '**/apps',
                '**/apps/**',
                '**/packages/api',
                '**/packages/api/**',
                '**/packages/ocr',
                '**/packages/ocr/**',
              ],
              ...BOUNDARY(
                'core must not import from apps/ or from @cj/api/@cj/ocr (spec_tecnica Â§3.2).',
              ),
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/contracts/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@cj/api', '@cj/ocr', '@cj/web'],
              ...BOUNDARY('contracts may depend on core only (spec_tecnica Â§3.2).'),
            },
            {
              group: [
                '**/apps',
                '**/apps/**',
                '**/packages/api',
                '**/packages/api/**',
                '**/packages/ocr',
                '**/packages/ocr/**',
              ],
              ...BOUNDARY('contracts may depend on core only (spec_tecnica Â§3.2).'),
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/ocr/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@cj/api', '@cj/core', '@cj/web'],
              ...BOUNDARY('ocr may depend on contracts only (spec_tecnica Â§3.2).'),
            },
            {
              group: [
                '**/apps',
                '**/apps/**',
                '**/packages/api',
                '**/packages/api/**',
                '**/packages/core',
                '**/packages/core/**',
              ],
              ...BOUNDARY('ocr may depend on contracts only (spec_tecnica Â§3.2).'),
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/api/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@cj/web'],
              ...BOUNDARY('api must not import the web app (spec_tecnica Â§3.2).'),
            },
            {
              group: ['**/apps', '**/apps/**'],
              ...BOUNDARY('api must not import from apps/ (spec_tecnica Â§3.2).'),
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@cj/api', '@cj/ocr'],
              ...BOUNDARY(
                'web may depend on @cj/core and @cj/contracts only (spec_tecnica Â§3.2).',
              ),
            },
            {
              group: ['**/packages', '**/packages/**'],
              ...BOUNDARY(
                'web must import workspace packages by name, not by relative path (spec_tecnica Â§3.2).',
              ),
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/no-danger': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/[A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F]/]',
          message:
            'Texto literal em JSX: mova para o catÃ¡logo pt-BR (@cj/contracts messages.ui, CTR-02).',
        },
        {
          selector:
            'JSXAttribute[name.name=/^(title|placeholder|alt|aria-label|label|aria-placeholder|aria-roledescription|aria-valuetext)$/][value.value=/[A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F]/]',
          message: 'Atributo de texto literal em JSX: mova para o catÃ¡logo pt-BR (CTR-02).',
        },
        {
          selector: 'Literal[value=/[\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F]/]',
          message: 'String com acentuaÃ§Ã£o fora do catÃ¡logo pt-BR (CTR-02).',
        },
        {
          selector: 'TemplateElement[value.raw=/[\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F]/]',
          message: 'Template literal com acentuaÃ§Ã£o fora do catÃ¡logo pt-BR (CTR-02).',
        },
      ],
    },
  },
  {
    files: ['packages/api/src/**/*.ts', 'packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/[\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F]/]',
          message: 'String com acentuaÃ§Ã£o fora do catÃ¡logo pt-BR (CTR-02).',
        },
        {
          selector: 'TemplateElement[value.raw=/[\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F]/]',
          message: 'Template literal com acentuaÃ§Ã£o fora do catÃ¡logo pt-BR (CTR-02).',
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    rules: prettier.rules,
  },
);
