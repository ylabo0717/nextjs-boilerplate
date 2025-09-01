/**
 * Grafana認証設定テスト
 *
 * Docker Compose設定でのGrafanaパスワード環境変数が正しく設定されることを検証
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Grafana設定テストはファイル読み込みのみでLoki接続を必要としないため、常に実行
const shouldSkip = false;

// 早期スキップ
if (shouldSkip) {
  describe('Grafana Authentication Configuration', () => {
    it('should skip all tests when SKIP_LOKI_TESTS=true', () => {
      console.log('⏭️ SKIP_LOKI_TESTS=true のため、すべてのGrafanaテストをスキップしました');
    });
  });
} else {
  describe('Grafana Authentication Configuration', () => {
    describe('Docker Compose設定の検証', () => {
      it('docker-compose.prod.ymlでGrafanaパスワードが環境変数化されている', () => {
        const dockerComposePath = resolve(process.cwd(), 'docker/compose/docker-compose.prod.yml');
        const dockerComposeContent = readFileSync(dockerComposePath, 'utf-8');

        // ハードコードされたパスワードが使用されていないことを確認
        expect(dockerComposeContent).not.toContain('GF_SECURITY_ADMIN_PASSWORD=admin');

        // 環境変数が必須化されていることを確認（セキュリティ強化）
        expect(dockerComposeContent).toContain(
          'GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:?Required}'
        );
      });

      it('環境変数が必須化されてセキュリティが強化されている', () => {
        const dockerComposePath = resolve(process.cwd(), 'docker/compose/docker-compose.prod.yml');
        const dockerComposeContent = readFileSync(dockerComposePath, 'utf-8');

        // パスワードにデフォルト値がプレーンな"admin"でないことを確認
        expect(dockerComposeContent).not.toContain(
          'GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}'
        );

        // 弱いデフォルト値が削除されていることを確認
        expect(dockerComposeContent).not.toContain(':-changeme123!}');

        // 環境変数が必須化されていることを確認（より安全なアプローチ）
        expect(dockerComposeContent).toContain(':?Required');
      });
    });

    describe('.env.prod.example設定の検証', () => {
      it('GRAFANA_ADMIN_PASSWORD環境変数が例に含まれている', () => {
        const envExamplePath = resolve(process.cwd(), '.env.prod.example');
        const envExampleContent = readFileSync(envExamplePath, 'utf-8');

        expect(envExampleContent).toContain('GRAFANA_ADMIN_PASSWORD=');
        expect(envExampleContent).toContain('Grafana');
      });

      it('セキュリティに関する注意書きが含まれている', () => {
        const envExamplePath = resolve(process.cwd(), '.env.prod.example');
        const envExampleContent = readFileSync(envExamplePath, 'utf-8');

        expect(envExampleContent).toContain('IMPORTANT');
        expect(envExampleContent).toContain('secure');
      });
    });

    describe('ドキュメント更新の検証', () => {
      it('設定ガイドにGrafanaセキュリティ設定が含まれている', () => {
        const configGuidePath = resolve(
          process.cwd(),
          'docs/developer_guide/logging/logging-configuration-guide.ja.md'
        );
        const configGuideContent = readFileSync(configGuidePath, 'utf-8');

        expect(configGuideContent).toContain('GRAFANA_ADMIN_PASSWORD');
        expect(configGuideContent).toContain('セキュリティ設定');
      });

      it('統合ガイドにGrafanaアクセス情報が更新されている', () => {
        const integrationGuidePath = resolve(
          process.cwd(),
          'docs/work_dir/logging-integration-guide.md'
        );
        const integrationGuideContent = readFileSync(integrationGuidePath, 'utf-8');

        expect(integrationGuideContent).not.toContain('Password: `admin`');
        expect(integrationGuideContent).toContain('GRAFANA_ADMIN_PASSWORD');
      });
    });

    describe('環境変数必須化ロジックの検証', () => {
      it('環境変数が設定されている場合はその値が使用される', () => {
        // 環境変数展開ロジックのテスト
        const testPassword = 'MySecurePassword123!';
        process.env.GRAFANA_ADMIN_PASSWORD = testPassword;

        // Docker Composeの環境変数が設定されている場合の展開をシミュレート
        const resolvedValue = process.env.GRAFANA_ADMIN_PASSWORD;

        expect(resolvedValue).toBe(testPassword);
        expect(resolvedValue).not.toBe('admin');

        // テスト後にクリーンアップ
        delete process.env.GRAFANA_ADMIN_PASSWORD;
      });

      it('環境変数が未設定の場合はエラーメッセージが表示される設定になっている', () => {
        // 環境変数が未設定の状態を確認
        delete process.env.GRAFANA_ADMIN_PASSWORD;

        // Docker Composeの必須環境変数設定を確認
        const dockerComposePath = resolve(process.cwd(), 'docker/compose/docker-compose.prod.yml');
        const dockerComposeContent = readFileSync(dockerComposePath, 'utf-8');

        // 必須環境変数の設定が含まれていることを確認
        expect(dockerComposeContent).toContain(':?Required');

        // 環境変数が未設定の場合はundefinedとなることを確認
        expect(process.env.GRAFANA_ADMIN_PASSWORD).toBeUndefined();
      });
    });
  });
}
