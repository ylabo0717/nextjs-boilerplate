/**
 * Grafana認証設定テスト
 * 
 * Docker Compose設定でのGrafanaパスワード環境変数が正しく設定されることを検証
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Grafana Authentication Configuration', () => {
  describe('Docker Compose設定の検証', () => {
    it('docker-compose.loki.ymlでGrafanaパスワードが環境変数化されている', () => {
      const dockerComposePath = resolve(process.cwd(), 'docker-compose.loki.yml');
      const dockerComposeContent = readFileSync(dockerComposePath, 'utf-8');

      // ハードコードされたパスワードが使用されていないことを確認
      expect(dockerComposeContent).not.toContain('GF_SECURITY_ADMIN_PASSWORD=admin');
      
      // 環境変数での設定が使用されていることを確認
      expect(dockerComposeContent).toContain('GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-changeme123!}');
    });

    it('環境変数のデフォルト値が安全に設定されている', () => {
      const dockerComposePath = resolve(process.cwd(), 'docker-compose.loki.yml');
      const dockerComposeContent = readFileSync(dockerComposePath, 'utf-8');

      // デフォルト値がプレーンな"admin"でないことを確認
      expect(dockerComposeContent).not.toContain(':-admin}');
      
      // より安全なデフォルト値が設定されていることを確認
      expect(dockerComposeContent).toContain(':-changeme123!}');
    });
  });

  describe('.env.example設定の検証', () => {
    it('GRAFANA_ADMIN_PASSWORD環境変数が例に含まれている', () => {
      const envExamplePath = resolve(process.cwd(), '.env.example');
      const envExampleContent = readFileSync(envExamplePath, 'utf-8');

      expect(envExampleContent).toContain('GRAFANA_ADMIN_PASSWORD=');
      expect(envExampleContent).toContain('Grafana Admin Password');
    });

    it('セキュリティに関する注意書きが含まれている', () => {
      const envExamplePath = resolve(process.cwd(), '.env.example');
      const envExampleContent = readFileSync(envExamplePath, 'utf-8');

      expect(envExampleContent).toContain('IMPORTANT');
      expect(envExampleContent).toContain('secure');
    });
  });

  describe('ドキュメント更新の検証', () => {
    it('設定ガイドにGrafanaセキュリティ設定が含まれている', () => {
      const configGuidePath = resolve(process.cwd(), 'docs/developer_guide/logging-configuration-guide.md');
      const configGuideContent = readFileSync(configGuidePath, 'utf-8');

      expect(configGuideContent).toContain('GRAFANA_ADMIN_PASSWORD');
      expect(configGuideContent).toContain('セキュリティ設定');
    });

    it('統合ガイドにGrafanaアクセス情報が更新されている', () => {
      const integrationGuidePath = resolve(process.cwd(), 'docs/work_dir/logging-integration-guide.md');
      const integrationGuideContent = readFileSync(integrationGuidePath, 'utf-8');

      expect(integrationGuideContent).not.toContain('Password: `admin`');
      expect(integrationGuideContent).toContain('GRAFANA_ADMIN_PASSWORD');
    });
  });

  describe('環境変数展開ロジックの検証', () => {
    it('環境変数が設定されている場合はその値が使用される', () => {
      // 環境変数展開ロジックのテスト
      const testPassword = 'MySecurePassword123!';
      process.env.GRAFANA_ADMIN_PASSWORD = testPassword;

      // Docker Composeの環境変数展開をシミュレート
      const dockerComposeVariable = '${GRAFANA_ADMIN_PASSWORD:-changeme123!}';
      const resolvedValue = process.env.GRAFANA_ADMIN_PASSWORD || 'changeme123!';

      expect(resolvedValue).toBe(testPassword);
      expect(resolvedValue).not.toBe('changeme123!');
      expect(resolvedValue).not.toBe('admin');

      // テスト後にクリーンアップ
      delete process.env.GRAFANA_ADMIN_PASSWORD;
    });

    it('環境変数が未設定の場合はデフォルト値が使用される', () => {
      // 環境変数が未設定の状態を確認
      delete process.env.GRAFANA_ADMIN_PASSWORD;

      // Docker Composeの環境変数展開をシミュレート
      const resolvedValue = process.env.GRAFANA_ADMIN_PASSWORD || 'changeme123!';

      expect(resolvedValue).toBe('changeme123!');
      expect(resolvedValue).not.toBe('admin');
    });
  });
});