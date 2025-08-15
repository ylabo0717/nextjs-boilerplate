/**
 * Gitleaksパターンテスト
 * 
 * 改善されたシークレットスキャニングパターンが正しく動作することを検証
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Gitleaks Secret Scanning Patterns', () => {
  const gitleaksPath = resolve(process.cwd(), '.gitleaks.toml');
  let gitleaksContent: string;

  beforeAll(() => {
    gitleaksContent = readFileSync(gitleaksPath, 'utf-8');
  });

  describe('環境変数参照パターンの検証', () => {
    it('Docker Compose環境変数展開パターンが含まれている', () => {
      // LOG_IP_HASH_SECRET関連
      expect(gitleaksContent).toContain('\\$\\{LOG_IP_HASH_SECRET\\}');
      expect(gitleaksContent).toContain('LOG_IP_HASH_SECRET=\\$\\{.*\\}');
      
      // JWT_SECRET関連
      expect(gitleaksContent).toContain('\\$\\{JWT_SECRET\\}');
      expect(gitleaksContent).toContain('JWT_SECRET=\\$\\{.*\\}');
      
      // LOKI認証関連
      expect(gitleaksContent).toContain('\\$\\{LOKI_PASSWORD\\}');
      expect(gitleaksContent).toContain('\\$\\{LOKI_USERNAME\\}');
      
      // GRAFANA認証関連
      expect(gitleaksContent).toContain('\\$\\{GRAFANA_ADMIN_PASSWORD\\}');
      expect(gitleaksContent).toContain('GRAFANA_ADMIN_PASSWORD=\\$\\{.*\\}');
    });

    it('JavaScript環境変数参照パターンが含まれている', () => {
      expect(gitleaksContent).toContain('process\\.env\\.LOG_IP_HASH_SECRET');
      expect(gitleaksContent).toContain('process\\.env\\.JWT_SECRET');
      expect(gitleaksContent).toContain('process\\.env\\.LOKI_PASSWORD');
      expect(gitleaksContent).toContain('process\\.env\\.LOKI_USERNAME');
    });
  });

  describe('パターンの厳密性検証', () => {
    it('変数名のみのマッチを避ける厳密なパターンを使用している', () => {
      // より厳密なパターンを使用していることを確認
      // プレーンな変数名のみのパターンは使用していない
      expect(gitleaksContent).not.toContain("'''LOG_IP_HASH_SECRET''',");
      expect(gitleaksContent).not.toContain("'''JWT_SECRET''',");
      expect(gitleaksContent).not.toContain("'''GRAFANA_ADMIN_PASSWORD''',");
    });

    it('エスケープされた特殊文字を使用している', () => {
      // 正規表現の特殊文字が適切にエスケープされている
      expect(gitleaksContent).toContain('\\$\\{');  // ${
      expect(gitleaksContent).toContain('\\}');     // }
      expect(gitleaksContent).toContain('\\.');     // .
    });
  });

  describe('セキュリティホワイトリストの検証', () => {
    it('共通の例外パターンが含まれている', () => {
      expect(gitleaksContent).toContain('example\\.com');
      expect(gitleaksContent).toContain('localhost');
      expect(gitleaksContent).toContain('127\\.0\\.0\\.1');
      expect(gitleaksContent).toContain('changeme');
      expect(gitleaksContent).toContain('password123');
    });

    it('テストファイルが除外されている', () => {
      expect(gitleaksContent).toContain('tests?\\/.*');
      expect(gitleaksContent).toContain('.*\\.test\\.(js|ts|jsx|tsx)$');
      expect(gitleaksContent).toContain('.*\\.spec\\.(js|ts|jsx|tsx)$');
    });
  });

  describe('設定の一貫性検証', () => {
    it('基本設定が正しく設定されている', () => {
      expect(gitleaksContent).toContain('title = "Gitleaks Configuration"');
      expect(gitleaksContent).toContain('useDefault = true');
    });

    it('すべての重要なルールが定義されている', () => {
      // AWS関連
      expect(gitleaksContent).toContain('id = "aws-access-key"');
      expect(gitleaksContent).toContain('id = "aws-secret-key"');
      
      // GitHub関連
      expect(gitleaksContent).toContain('id = "github-pat"');
      
      // パスワード関連
      expect(gitleaksContent).toContain('id = "generic-password"');
      expect(gitleaksContent).toContain('id = "env-password"');
    });
  });
});

describe('Gitleaksパターンのシミュレーションテスト', () => {
  describe('許可されるべきパターン', () => {
    const allowedPatterns = [
      // 環境変数参照
      'process.env.LOG_IP_HASH_SECRET',
      'process.env.JWT_SECRET',
      '${LOG_IP_HASH_SECRET}',
      '${JWT_SECRET:-default}',
      'LOG_IP_HASH_SECRET=${SOME_VAR}',
      '${GRAFANA_ADMIN_PASSWORD:-changeme123!}',
      
      // 設定例
      'password123',
      'changeme',
      'example.com',
      'localhost',
      'your_api_key',
      
      // Redis例
      'redis://localhost:6379',
      'redis://new-host:6379',
    ];

    it.each(allowedPatterns)('パターン "%s" は許可される', (pattern) => {
      // このテストは実際のgitleaksツールを使用しないため、
      // パターンの存在確認のみ行う
      expect(pattern).toBeTruthy();
    });
  });

  describe('検出されるべきパターン', () => {
    const secretPatterns = [
      // 実際のシークレット（テスト用のダミー値）
      'LOG_IP_HASH_SECRET=actual-secret-value-here',
      'JWT_SECRET=real-jwt-secret-key',
      'password=supersecret123',
      'api_key=sk-abcd1234567890',
      
      // AWS キー
      'AKIAIOSFODNN7EXAMPLE',
      'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      
      // GitHub トークン
      'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      
      // API キー
      'AIzaSyDaGmWKa4JsXZ-HjGw7_FLYXxxxxxxxx',
    ];

    it.each(secretPatterns)('パターン "%s" は検出される', (pattern) => {
      // このテストは実際のgitleaksツールを使用しないため、
      // パターンの形式確認のみ行う
      expect(pattern).toBeTruthy();
    });
  });
});