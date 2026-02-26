import js from '@eslint/js';

export default [
    {
        ignores: [
            'node_modules/**',
            'logs/**',
            'uploads/**',
            'coverage/**',
            'src/controllers/CartController.js',
        ],
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                process: 'readonly',
                console: 'readonly',
                Buffer: 'readonly',
                URL: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                describe: 'readonly',
                test: 'readonly',
                expect: 'readonly',
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^(?:_|next$)',
                    caughtErrors: 'none',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                    varsIgnorePattern: '^(logger|config|VariantType|VariantOption|slugify|brandStorage|bannerStorage|userStorage|template|data|mongoose|Product|Brand|relevantTypes)$',
                },
            ],
            'no-console': 'off',
            'prefer-const': 'warn',
            'no-var': 'error',
            'no-useless-escape': 'off',
            'no-case-declarations': 'off',
        },
    },
];
