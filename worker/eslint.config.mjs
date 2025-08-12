import prettier from 'eslint-config-prettier';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));
const prettierIgnorePath = fileURLToPath(new URL('./.prettierignore', import.meta.url));

export default ts.config(
	includeIgnoreFile(gitignorePath, 'gitignore'),
	includeIgnoreFile(prettierIgnorePath, 'prettierignore'),
	js.configs.recommended,
	...ts.configs.recommended,
	prettier,
	{
		languageOptions: {
			globals: { ...globals.node, ...globals['shared-node-browser'] }
		},
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
			'@typescript-eslint/no-unused-vars': 'off'
		}
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				projectService: true
			}
			// },
			// rules: {
			// 	// Enforce consistent type imports to catch verbatimModuleSyntax issues
			// 	'@typescript-eslint/consistent-type-imports': [
			// 		'error',
			// 		{
			// 			prefer: 'type-imports',
			// 			disallowTypeAnnotations: false,
			// 			fixStyle: 'separate-type-imports'
			// 		}
			// 	],
			// 	// Ensure consistent type exports as well
			// 	'@typescript-eslint/consistent-type-exports': [
			// 		'error',
			// 		{
			// 			fixMixedExportsWithInlineTypeSpecifier: false
			// 		}
			// 	]
		}
	}
);
