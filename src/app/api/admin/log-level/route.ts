/**
 * Admin API for Dynamic Log Level Management
 * Secure endpoint with authentication and validation
 *
 * Provides REST API for runtime log level configuration changes.
 * Includes comprehensive security measures and error handling.
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  saveRemoteConfig,
  createDefaultConfig,
  mergeConfigurations,
  validateRemoteConfig,
  getConfigSummary,
  clearConfigCache,
  getConfigWithFallback,
  type RemoteLogConfig,
} from '@/lib/logger/remote-config';

// Constants for error messages
const RATE_LIMIT_ERROR = 'Rate limit exceeded';
const INTERNAL_SERVER_ERROR = 'Internal server error';

/**
 * Admin authentication configuration
 */
interface AdminAuthConfig {
  readonly jwt_secret?: string;
  readonly api_keys: readonly string[];
  readonly rate_limits: {
    readonly requests_per_minute: number;
    readonly burst_limit: number;
  };
  readonly allowed_origins: readonly string[];
}

/**
 * Request rate tracking
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Create admin authentication configuration (pure function)
 */
function createAdminAuthConfig(): AdminAuthConfig {
  const apiKeys = process.env.ADMIN_API_KEYS?.split(',').filter(Boolean) || [];
  const allowedOrigins = process.env.ADMIN_ALLOWED_ORIGINS?.split(',').filter(Boolean) || [
    'http://localhost:3000',
  ];

  return Object.freeze({
    jwt_secret: process.env.JWT_SECRET,
    api_keys: Object.freeze(apiKeys),
    rate_limits: Object.freeze({
      requests_per_minute: parseInt(process.env.ADMIN_RATE_LIMIT_PER_MINUTE || '60', 10),
      burst_limit: parseInt(process.env.ADMIN_BURST_LIMIT || '10', 10),
    }),
    allowed_origins: Object.freeze(allowedOrigins),
  }) as AdminAuthConfig;
}

/**
 * Extract client identifier for rate limiting (pure function)
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';

  // Include user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return `${ip}-${userAgent.slice(0, 50)}`;
}

/**
 * Check rate limit (pure function + controlled side effects)
 */
function checkRateLimit(
  clientId: string,
  config: AdminAuthConfig
): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const windowStart = now - 60 * 1000; // 1 minute window

  let clientData = rateLimitMap.get(clientId);

  // Reset if window has passed
  if (!clientData || clientData.resetTime < windowStart) {
    clientData = { count: 0, resetTime: now + 60 * 1000 };
  }

  // Check limits
  if (clientData.count >= config.rate_limits.requests_per_minute) {
    return { allowed: false, resetTime: clientData.resetTime };
  }

  // Increment counter
  clientData.count++;
  rateLimitMap.set(clientId, clientData);

  return { allowed: true };
}

/**
 * Validate admin authentication (pure function)
 */
function validateAdminAuth(
  request: NextRequest,
  config: AdminAuthConfig
): { valid: boolean; error?: string } {
  // Check API key in Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { valid: false, error: 'Missing authorization header' };
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return { valid: false, error: 'Invalid authorization format. Use: Bearer <api-key>' };
  }

  if (!config.api_keys.includes(token)) {
    return { valid: false, error: 'Invalid API key' };
  }

  // Check CORS if origin is present
  const origin = request.headers.get('origin');
  if (origin && !config.allowed_origins.includes(origin)) {
    return { valid: false, error: 'Origin not allowed' };
  }

  return { valid: true };
}

/**
 * Create error response (pure function)
 */
function createErrorResponse(message: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create success response (pure function)
 */
function createSuccessResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/admin/log-level - Fetch current configuration
 */
export async function GET(request: NextRequest) {
  const config = createAdminAuthConfig();

  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateCheck = checkRateLimit(clientId, config);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: RATE_LIMIT_ERROR,
          retry_after: Math.ceil((rateCheck.resetTime! - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    // Authentication
    const authResult = validateAdminAuth(request, config);
    if (!authResult.valid) {
      return createErrorResponse(authResult.error!, 401);
    }

    // Get include_summary query parameter
    const url = new URL(request.url);
    const includeSummary = url.searchParams.get('summary') === 'true';

    // Fetch configuration with fallback
    const configResult = await getConfigWithFallback();

    if (!configResult.success) {
      return createErrorResponse('Failed to fetch configuration', 500, {
        error: configResult.error,
        source: configResult.source,
      });
    }

    const responseData = {
      config: configResult.config,
      source: configResult.source,
      cached: configResult.cached,
      summary: includeSummary ? getConfigSummary(configResult.config!) : undefined,
    };

    return createSuccessResponse(responseData, 'Configuration retrieved successfully');
  } catch (error) {
    console.error('Admin API GET error:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    return createErrorResponse(INTERNAL_SERVER_ERROR, 500);
  }
}

/**
 * POST /api/admin/log-level - Update configuration
 */
export async function POST(request: NextRequest) {
  const config = createAdminAuthConfig();

  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateCheck = checkRateLimit(clientId, config);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: RATE_LIMIT_ERROR,
          retry_after: Math.ceil((rateCheck.resetTime! - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    // Authentication
    const authResult = validateAdminAuth(request, config);
    if (!authResult.valid) {
      return createErrorResponse(authResult.error!, 401);
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Validate configuration format
    const validation = validateRemoteConfig(body);
    if (!validation.valid) {
      return createErrorResponse('Configuration validation failed', 400, {
        errors: validation.errors,
      });
    }

    // Get current configuration for merging
    const currentResult = await getConfigWithFallback();
    const baseConfig = currentResult.success ? currentResult.config! : createDefaultConfig();

    // Merge new configuration with current
    const newConfig = mergeConfigurations(baseConfig, body as Partial<RemoteLogConfig>);

    // Save the updated configuration
    const saveResult = await saveRemoteConfig(newConfig);

    if (!saveResult.success) {
      return createErrorResponse('Failed to save configuration', 500, {
        error: saveResult.error,
      });
    }

    // Clear cache to force refresh
    await clearConfigCache();

    const responseData = {
      config: saveResult.config,
      previous_version: saveResult.previous_version,
      summary: getConfigSummary(saveResult.config!),
    };

    return createSuccessResponse(responseData, 'Configuration updated successfully');
  } catch (error) {
    console.error('Admin API POST error:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    return createErrorResponse(INTERNAL_SERVER_ERROR, 500);
  }
}

/**
 * PATCH /api/admin/log-level - Partial configuration update
 */
export async function PATCH(request: NextRequest) {
  const config = createAdminAuthConfig();

  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateCheck = checkRateLimit(clientId, config);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: RATE_LIMIT_ERROR,
          retry_after: Math.ceil((rateCheck.resetTime! - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    // Authentication
    const authResult = validateAdminAuth(request, config);
    if (!authResult.valid) {
      return createErrorResponse(authResult.error!, 401);
    }

    // Parse request body
    let updates: Partial<RemoteLogConfig>;
    try {
      updates = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Get current configuration
    const currentResult = await getConfigWithFallback();
    if (!currentResult.success) {
      return createErrorResponse('Failed to fetch current configuration', 500, {
        error: currentResult.error,
      });
    }

    // Apply partial updates
    const newConfig = mergeConfigurations(currentResult.config!, updates);

    // Validate the merged configuration
    const validation = validateRemoteConfig(newConfig);
    if (!validation.valid) {
      return createErrorResponse('Updated configuration validation failed', 400, {
        errors: validation.errors,
      });
    }

    // Save the updated configuration
    const saveResult = await saveRemoteConfig(newConfig);

    if (!saveResult.success) {
      return createErrorResponse('Failed to save configuration', 500, {
        error: saveResult.error,
      });
    }

    // Clear cache to force refresh
    await clearConfigCache();

    const responseData = {
      config: saveResult.config,
      previous_version: saveResult.previous_version,
      changes: updates,
      summary: getConfigSummary(saveResult.config!),
    };

    return createSuccessResponse(responseData, 'Configuration updated successfully');
  } catch (error) {
    console.error('Admin API PATCH error:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    return createErrorResponse(INTERNAL_SERVER_ERROR, 500);
  }
}

/**
 * DELETE /api/admin/log-level - Reset to default configuration
 */
export async function DELETE(request: NextRequest) {
  const config = createAdminAuthConfig();

  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateCheck = checkRateLimit(clientId, config);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: RATE_LIMIT_ERROR,
          retry_after: Math.ceil((rateCheck.resetTime! - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    // Authentication
    const authResult = validateAdminAuth(request, config);
    if (!authResult.valid) {
      return createErrorResponse(authResult.error!, 401);
    }

    // Create default configuration
    const defaultConfig = createDefaultConfig();

    // Save default configuration
    const saveResult = await saveRemoteConfig(defaultConfig);

    if (!saveResult.success) {
      return createErrorResponse('Failed to reset configuration', 500, {
        error: saveResult.error,
      });
    }

    // Clear cache
    await clearConfigCache();

    const responseData = {
      config: saveResult.config,
      summary: getConfigSummary(saveResult.config!),
    };

    return createSuccessResponse(responseData, 'Configuration reset to default');
  } catch (error) {
    console.error('Admin API DELETE error:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    return createErrorResponse(INTERNAL_SERVER_ERROR, 500);
  }
}
