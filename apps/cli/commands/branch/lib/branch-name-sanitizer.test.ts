import { describe, expect, test } from 'bun:test';
import { sanitizeBranchName } from './branch-name-sanitizer.js';

describe('sanitizeBranchName', () => {
	test('converts spaces to hyphens', () => {
		expect(sanitizeBranchName('this is a branch name')).toBe('this-is-a-branch-name');
	});

	test('converts to lowercase', () => {
		expect(sanitizeBranchName('This Is UPPERCASE')).toBe('this-is-uppercase');
	});

	test('handles commit message style with colon', () => {
		expect(sanitizeBranchName('fix: This is a bug fix')).toBe('fix-this-is-a-bug-fix');
	});

	test('removes special characters', () => {
		expect(sanitizeBranchName('feature: add [new] feature?')).toBe('feature-add-new-feature');
	});

	test('collapses consecutive hyphens', () => {
		expect(sanitizeBranchName('fix:  multiple   spaces')).toBe('fix-multiple-spaces');
	});

	test('removes tilde and caret', () => {
		expect(sanitizeBranchName('test~branch^name')).toBe('test-branch-name');
	});

	test('handles asterisk and backslash', () => {
		expect(sanitizeBranchName('test*branch\\name')).toBe('test-branch-name');
	});

	test('collapses consecutive dots', () => {
		expect(sanitizeBranchName('test..branch...name')).toBe('test.branch.name');
	});

	test('trims leading and trailing hyphens', () => {
		expect(sanitizeBranchName('--test-branch--')).toBe('test-branch');
	});

	test('trims leading and trailing dots', () => {
		expect(sanitizeBranchName('..test.branch..')).toBe('test.branch');
	});

	test('handles @ and curly braces', () => {
		expect(sanitizeBranchName('test@{branch}')).toBe('test-branch');
	});

	test('truncates to 60 characters', () => {
		const longText = 'this is a very long branch name that exceeds sixty characters and should be truncated';
		const result = sanitizeBranchName(longText);
		expect(result.length).toBeLessThanOrEqual(60);
	});

	test('handles commas', () => {
		expect(sanitizeBranchName('This is also an invalid name, for a branch')).toBe(
			'this-is-also-an-invalid-name-for-a-branch'
		);
	});

	test('handles empty string', () => {
		expect(sanitizeBranchName('')).toBe('');
	});

	test('handles string with only invalid characters', () => {
		expect(sanitizeBranchName(':::???***')).toBe('');
	});

	test('preserves valid characters like numbers', () => {
		expect(sanitizeBranchName('feature-123-add-api')).toBe('feature-123-add-api');
	});

	test('handles real-world examples', () => {
		expect(sanitizeBranchName('fix: This is a bug fix with invalid name for a branch')).toBe(
			'fix-this-is-a-bug-fix-with-invalid-name-for-a-branch'
		);

		expect(sanitizeBranchName('feat(api): Add user authentication endpoint')).toBe(
			'feat-api-add-user-authentication-endpoint'
		);
	});
});
