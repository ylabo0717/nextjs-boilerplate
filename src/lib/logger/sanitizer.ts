/**
 * Security Enhancement: Log Injection Prevention Sanitizer Implementation
 *
 * Defends against log injection attacks through control character and newline escaping.
 * Ensures log system security through complete sanitization of user input.
 */

import type { SanitizedLogEntry } from './types';

/**
 * Control character sanitization (0x00-0x1F, 0x7F-0x9F) (pure function)
 *
 * Converts control characters to Unicode escape format (\\uXXXX) to prevent log injection attacks.
 *
 * @param input - Data to sanitize
 * @returns Sanitized data
 *
 * @example
 * ```typescript
 * sanitizeControlCharacters("Hello\\x00World")
 * // → "Hello\\\\u0000World"
 * ```
 *
 * @public
 */
export function sanitizeControlCharacters(input: unknown): unknown {
  if (typeof input === 'string') {
    // Control characters: 0x00-0x1F (C0 control), 0x7F-0x9F (DEL + C1 control)
    return input.replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
      return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}`;
    });
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeControlCharacters(item));
  }

  if (input && typeof input === 'object') {
    // Set for circular reference detection
    const seen = new Set<object>();
    return sanitizeObjectWithCircularCheck(input, seen);
  }

  return input;
}

/**
 * Object sanitization considering circular references (pure function)
 *
 * @param input - Object to sanitize
 * @param seen - Set for circular reference detection
 * @returns Sanitized object
 *
 * @internal
 */
function sanitizeObjectWithCircularCheck(
  input: object,
  seen: Set<object>
): Record<string, unknown> {
  if (seen.has(input)) {
    return { _circular_reference: true };
  }

  seen.add(input);

  try {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = sanitizeControlCharacters(key) as string;

      if (value && typeof value === 'object') {
        if (seen.has(value)) {
          Object.assign(sanitized, { [sanitizedKey]: { _circular_reference: true } });
        } else {
          // Pass the same seen set for recursive processing
          Object.assign(sanitized, {
            [sanitizedKey]: sanitizeObjectWithCircularCheck(value, seen),
          });
        }
      } else {
        Object.assign(sanitized, { [sanitizedKey]: sanitizeControlCharacters(value) });
      }
    }

    return sanitized;
  } finally {
    seen.delete(input);
  }
}

/**
 * CRLF injection prevention (pure function)
 *
 * Converts newline characters to escape format to prevent CRLF injection attacks on log files.
 *
 * @param input - String to sanitize
 * @returns Escaped string
 *
 * @example
 * ```typescript
 * sanitizeNewlines("Line1\\nLine2\\r\\nLine3")
 * // → "Line1\\\\nLine2\\\\r\\\\nLine3"
 * ```
 *
 * @public
 */
export function sanitizeNewlines(input: string): string {
  return input.replace(/\r\n/g, '\\r\\n').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

/**
 * JSON-safe string escaping (pure function)
 *
 * Sanitizes both control characters and newlines to enable safe output in JSON format.
 *
 * @param input - Data to sanitize
 * @returns JSON-serialization safe data
 *
 * @example
 * ```typescript
 * sanitizeForJson("Hello\\x00\\nWorld")
 * // → "Hello\\\\u0000\\\\nWorld"
 * ```
 *
 * @public
 */
export function sanitizeForJson(input: unknown): unknown {
  if (typeof input === 'string') {
    return sanitizeNewlines(sanitizeControlCharacters(input) as string);
  }

  return sanitizeControlCharacters(input);
}

/**
 * Comprehensive log message sanitization (pure function)
 *
 * Sanitizes both log messages and data, returning them in safe format.
 * Performs comprehensive processing to prevent log injection attacks and data corruption.
 *
 * @param message - Log message
 * @param data - Data to include in log (optional)
 * @returns Sanitized log entry
 *
 * @example
 * ```typescript
 * sanitizeLogEntry("User login\\x00", { user: "admin\\ntest" })
 * // → { message: "User login\\\\u0000", data: { user: "admin\\\\ntest" } }
 * ```
 *
 * @public
 */
export function sanitizeLogEntry(message: string, data?: unknown): SanitizedLogEntry {
  const sanitizedMessage = sanitizeForJson(message);
  const sanitizedData = data ? sanitizeForJson(data) : undefined;

  return {
    message: String(sanitizedMessage), // Explicitly convert to String
    data: sanitizedData,
  };
}

/**
 * Large object limitation (pure function)
 *
 * Limits object depth and key count to prevent memory exhaustion.
 * Also performs circular reference detection and processing to ensure safe log output.
 *
 * @param input - Data to limit
 * @param maxDepth - Maximum depth (default: 10)
 * @param maxKeys - Maximum key count (default: 100)
 * @returns Size-limited data
 *
 * @example
 * ```typescript
 * const largeObj = { a: 1, b: 2 }; // 200 keys example
 * limitObjectSize(largeObj, 10, 50);
 * // Returns: { a: 1, b: 2, _truncated: "150 more keys" }
 * ```
 *
 * @public
 */
export function limitObjectSize(
  input: unknown,
  maxDepth: number = 10,
  maxKeys: number = 100
): unknown {
  return limitObjectSizeRecursive(input, maxDepth, maxKeys, 0, new Set());
}

/**
 * Recursive processing for object size limitation (pure function)
 *
 * @param input - Data to process
 * @param maxDepth - Maximum depth
 * @param maxKeys - Maximum key count
 * @param currentDepth - Current depth
 * @param seen - Set for circular reference detection
 * @returns Limited data
 *
 * @internal
 */
function limitObjectSizeRecursive(
  input: unknown,
  maxDepth: number,
  maxKeys: number,
  currentDepth: number,
  seen: Set<object>
): unknown {
  if (currentDepth >= maxDepth) {
    return { _truncated: 'max_depth_reached' };
  }

  if (typeof input === 'string' && input.length > 1000) {
    return input.substring(0, 1000) + '... [TRUNCATED]';
  }

  if (Array.isArray(input)) {
    return processArray(input, maxDepth, maxKeys, currentDepth, seen);
  }

  if (input && typeof input === 'object') {
    return processObject(input, maxDepth, maxKeys, currentDepth, seen);
  }

  return input;
}

/**
 * Array data processing (pure function)
 *
 * @param input - Array to process
 * @param maxDepth - Maximum depth
 * @param maxKeys - Maximum element count
 * @param currentDepth - Current depth
 * @param seen - Set for circular reference detection
 * @returns Limited array
 *
 * @internal
 */
function processArray(
  input: unknown[],
  maxDepth: number,
  maxKeys: number,
  currentDepth: number,
  seen: Set<object>
): unknown[] {
  if (input.length > maxKeys) {
    const truncated = input
      .slice(0, maxKeys)
      .map((item) => limitObjectSizeRecursive(item, maxDepth, maxKeys, currentDepth + 1, seen));
    truncated.push({ _truncated: `${input.length - maxKeys} more items` });
    return truncated;
  }
  return input.map((item) =>
    limitObjectSizeRecursive(item, maxDepth, maxKeys, currentDepth + 1, seen)
  );
}

/**
 * Object data processing (pure function)
 *
 * @param input - Object to process
 * @param maxDepth - Maximum depth
 * @param maxKeys - Maximum key count
 * @param currentDepth - Current depth
 * @param seen - Set for circular reference detection
 * @returns Limited object
 *
 * @internal
 */
function processObject(
  input: object,
  maxDepth: number,
  maxKeys: number,
  currentDepth: number,
  seen: Set<object>
): unknown {
  if (seen.has(input)) {
    return { _circular_reference: true };
  }

  seen.add(input);

  try {
    const entries = Object.entries(input);
    if (entries.length > maxKeys) {
      return createLimitedObject(entries, maxDepth, maxKeys, currentDepth, seen, maxKeys);
    }

    return createCompleteObject(entries, maxDepth, maxKeys, currentDepth, seen);
  } finally {
    seen.delete(input);
  }
}

/**
 * Creation of key-limited object (pure function)
 *
 * @param entries - Object key-value pairs
 * @param maxDepth - Maximum depth
 * @param maxKeys - Maximum key count
 * @param currentDepth - Current depth
 * @param seen - Set for circular reference detection
 * @param keyLimit - Key limitation count
 * @returns Limited object
 *
 * @internal
 */
function createLimitedObject(
  entries: [string, unknown][],
  maxDepth: number,
  maxKeys: number,
  currentDepth: number,
  seen: Set<object>,
  keyLimit: number
): Record<string, unknown> {
  const limited: Record<string, unknown> = {};
  const limitedEntries = entries.slice(0, keyLimit);

  for (const [key, value] of limitedEntries) {
    const processedValue = limitObjectSizeRecursive(
      value,
      maxDepth,
      maxKeys,
      currentDepth + 1,
      seen
    );
    Object.assign(limited, { [key]: processedValue });
  }

  Object.assign(limited, { _truncated: `${entries.length - keyLimit} more keys` });
  return limited;
}

/**
 * Creation of complete object (pure function)
 *
 * @param entries - Object key-value pairs
 * @param maxDepth - Maximum depth
 * @param maxKeys - Maximum key count
 * @param currentDepth - Current depth
 * @param seen - Set for circular reference detection
 * @returns Processed object
 *
 * @internal
 */
function createCompleteObject(
  entries: [string, unknown][],
  maxDepth: number,
  maxKeys: number,
  currentDepth: number,
  seen: Set<object>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of entries) {
    const processedValue = limitObjectSizeRecursive(
      value,
      maxDepth,
      maxKeys,
      currentDepth + 1,
      seen
    );
    Object.assign(result, { [key]: processedValue });
  }

  return result;
}
