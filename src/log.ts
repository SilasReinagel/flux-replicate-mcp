/**
 * Simple logging for Flux Replicate MCP Server
 * All output goes to stderr to keep stdout clear for JSON-RPC transport
 */

/**
 * Log an error message
 */
export const error = (message: string, context?: Record<string, any>): void => {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    ...(context && { context }),
  };

  process.stderr.write(JSON.stringify(entry) + '\n');
};
