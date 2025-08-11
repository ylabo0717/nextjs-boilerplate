declare module 'eslintcc' {
  export interface ComplexityRank {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    F: number;
  }

  export interface ComplexityRanks {
    complexity?: ComplexityRank;
    'max-depth'?: ComplexityRank;
    'max-params'?: ComplexityRank;
    'max-statements'?: ComplexityRank;
    'max-nested-callbacks'?: ComplexityRank;
  }

  export interface ComplexityOptions {
    rules?: string | string[];
    ranks?: ComplexityRanks;
    eslintOptions?: {
      useEslintrc?: boolean;
      overrideConfig?: Record<string, unknown>;
    };
  }

  export interface ComplexityRuleInfo {
    value: number;
    rank: number;
    label: string;
  }

  export interface ComplexityMessage {
    loc?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
    type?: string;
    name?: string;
    rules?: {
      complexity?: ComplexityRuleInfo;
      'max-depth'?: ComplexityRuleInfo;
      'max-params'?: ComplexityRuleInfo;
      'max-statements'?: ComplexityRuleInfo;
      'max-nested-callbacks'?: ComplexityRuleInfo;
    };
    maxRule?: string;
  }

  export interface ComplexityFileReport {
    file: string;
    messages: ComplexityMessage[];
    average?: {
      rank: number;
      label: string;
    };
  }

  export interface ComplexityReport {
    files: ComplexityFileReport[];
    average?: {
      rank: number;
      label: string;
    };
  }

  export class Complexity {
    constructor(options?: ComplexityOptions);
    lintFiles(patterns: string[]): Promise<ComplexityReport>;
    lintText(code: string, filePath?: string): Promise<ComplexityReport>;
  }
}
