/**
 * Converts arbitrary text into a valid git branch name.
 *
 * Git branch names cannot contain:
 * - Spaces, ~, ^, :, ?, *, [, ], \
 * - Consecutive dots (..)
 * - @{ sequence
 * - Cannot start or end with / or .
 * - Cannot start with -
 */
export function sanitizeBranchName(text: string): string {
	return (
		text
			.toLowerCase()
			.trim()
			// Replace colons, spaces, commas, parentheses, and other invalid chars with hyphens
			.replace(/[:\s,()~^?*[\]\\@{}]+/g, '-')
			// Collapse consecutive dots
			.replace(/\.{2,}/g, '.')
			// Collapse consecutive hyphens
			.replace(/-{2,}/g, '-')
			// Trim leading/trailing hyphens, dots, and slashes
			.replace(/^[-./]+|[-./]+$/g, '')
			// Truncate to reasonable length
			.slice(0, 60)
	);
}
