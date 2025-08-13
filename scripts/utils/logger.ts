/**
 * Logger utility for scripts with verbose mode support
 *
 * @public
 */
export class Logger {
  /**
   * Whether to output verbose logs
   */
  private verbose: boolean;

  /**
   * Creates a new Logger instance
   *
   * @param verbose - Whether to enable verbose logging
   *
   * @public
   */
  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  /**
   * Output debug message (only in verbose mode)
   *
   * @param message - The debug message to output
   *
   * @public
   */
  debug(message: string): void {
    if (this.verbose) {
      console.log(`\x1b[36m[DEBUG]\x1b[0m ${message}`);
    }
  }

  /**
   * Output info message
   *
   * @param message - The info message to output
   *
   * @public
   */
  info(message: string): void {
    console.log(message);
  }

  /**
   * Output warning message
   *
   * @param message - The warning message to output
   *
   * @public
   */
  warn(message: string): void {
    console.warn(`\x1b[33m[WARN]\x1b[0m ${message}`);
  }

  /**
   * Output error message
   *
   * @param message - The error message to output
   *
   * @public
   */
  error(message: string): void {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
  }

  /**
   * Output command execution info (only in verbose mode)
   *
   * @param command - The command being executed
   *
   * @public
   */
  command(command: string): void {
    if (this.verbose) {
      console.log(`\x1b[35m[EXEC]\x1b[0m ${command}`);
    }
  }

  /**
   * Output timing info (only in verbose mode)
   *
   * @param label - The label for the timing
   * @param duration - The duration in milliseconds
   *
   * @public
   */
  timing(label: string, duration: number): void {
    if (this.verbose) {
      console.log(`\x1b[34m[TIMING]\x1b[0m ${label}: ${duration}ms`);
    }
  }

  /**
   * Output configuration info (only in verbose mode)
   *
   * @param config - The configuration object to output
   *
   * @public
   */
  config(config: Record<string, unknown>): void {
    if (this.verbose) {
      console.log(`\x1b[32m[CONFIG]\x1b[0m`, JSON.stringify(config, null, 2));
    }
  }

  /**
   * Check if verbose mode is enabled
   *
   * @returns Whether verbose mode is enabled
   *
   * @public
   */
  isVerbose(): boolean {
    return this.verbose;
  }
}

/**
 * Parse command line arguments for verbose flag
 *
 * @param args - Command line arguments (typically process.argv.slice(2))
 * @returns Whether verbose mode is enabled
 *
 * @public
 */
export function parseVerboseFlag(args: string[]): boolean {
  return args.includes('--verbose') || args.includes('-v');
}
