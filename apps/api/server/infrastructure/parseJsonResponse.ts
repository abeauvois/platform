/**
 * Parse JSON response from AI, handling various formats:
 * - Raw JSON
 * - JSON wrapped in markdown code blocks
 * - JSON with surrounding explanatory text
 */
export function parseJsonResponse<T>(text: string): T | null {
    if (!text || !text.trim()) {
        return null;
    }

    // Try to extract JSON from markdown code blocks first
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
        try {
            return JSON.parse(codeBlockMatch[1].trim());
        } catch {
            // Continue to other methods
        }
    }

    // Try parsing raw text as JSON
    try {
        return JSON.parse(text.trim());
    } catch {
        // Continue to extract JSON from surrounding text
    }

    // Try to extract JSON object from surrounding text
    const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
        try {
            return JSON.parse(jsonObjectMatch[0]);
        } catch {
            // Fall through to return null
        }
    }

    // Try to extract JSON array from surrounding text
    const jsonArrayMatch = text.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
        try {
            return JSON.parse(jsonArrayMatch[0]);
        } catch {
            // Fall through to return null
        }
    }

    return null;
}
