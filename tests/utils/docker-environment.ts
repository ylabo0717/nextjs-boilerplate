/**
 * Docker Environment Detection Utilities
 * Docker環境での実行を判定し、適切なテスト動作を制御
 */

/**
 * Docker-in-Docker環境での実行かどうかを判定
 *
 * 注意: 通常のGitHub Actions CI（ubuntu-latest）では
 * Testcontainersは正常に動作します。
 *
 * この関数は、Docker Compose内でのテスト実行
 * （Docker-in-Docker環境）のみを検出します。
 */
export function isRunningInDockerComposeEnvironment(): boolean {
  // Docker Compose環境の特定的な指標
  const dockerComposeIndicators = [
    // Docker Compose環境でのみ設定される環境変数
    process.env.TESTCONTAINERS_HOST_OVERRIDE === 'host.docker.internal',

    // Docker Compose内のコンテナ名パターン
    process.env.HOSTNAME?.includes('nextjs-boilerplate-app-'),

    // Docker Compose環境での特定の設定
    process.env.DOCKER_HOST?.includes('/var/run/docker.sock') &&
      require('fs').existsSync('/.dockerenv'),
  ];

  const isDockerCompose = dockerComposeIndicators.some((indicator) => indicator);

  if (isDockerCompose) {
    console.log('🐳 Docker Compose環境での実行を検出しました（Testcontainers制約あり）');
  }

  return isDockerCompose;
}

/**
 * 通常のCI環境（GitHub Actions等）での実行かどうかを判定
 */
export function isRunningInNativeCI(): boolean {
  const isCI = process.env.CI === 'true';
  const isNotDockerCompose = !isRunningInDockerComposeEnvironment();

  if (isCI && isNotDockerCompose) {
    console.log('⚡ ネイティブCI環境での実行を検出しました（Testcontainers利用可能）');
  }

  return isCI && isNotDockerCompose;
}

/**
 * Testcontainersが利用可能かどうかを判定
 * Docker Compose環境ではTestcontainersは制限される
 *
 * 環境判定:
 * - ローカル開発環境: Testcontainers利用可能 ✅
 * - GitHub Actions CI: Testcontainers利用可能 ✅
 * - Docker Compose環境: Testcontainers制限あり ⚠️
 */
export function isTestcontainersAvailable(): boolean {
  const available = !isRunningInDockerComposeEnvironment();

  if (!available) {
    console.log('⚠️ Docker Compose環境のため、Testcontainersテストをスキップします');
    console.log('   ローカル環境やGitHub Actions CIでは正常に動作します');
  } else {
    if (isRunningInNativeCI()) {
      console.log('✅ ネイティブCI環境 - Testcontainers利用可能');
    } else {
      console.log('✅ ローカル環境 - Testcontainers利用可能');
    }
  }

  return available;
}

/**
 * Docker環境でのテストスキップ理由を取得
 */
export function getDockerSkipReason(): string {
  return 'Docker-in-Docker環境ではTestcontainersが制限されるため、このテストをスキップします。ローカル環境では正常に動作します。';
}

/**
 * 条件付きテスト実行のためのヘルパー
 * Testcontainersが利用できない場合はテストをスキップ
 */
export function skipIfDockerEnvironment(testFunction: () => void, reason?: string): void {
  if (isTestcontainersAvailable()) {
    testFunction();
  } else {
    // テストをスキップし、理由を明示
    console.log(`⏭️ テストスキップ: ${reason || getDockerSkipReason()}`);
  }
}

/**
 * テスト環境情報の表示
 */
export function logTestEnvironmentInfo(): void {
  console.log('🔍 テスト環境情報:');
  console.log(`  - Docker Compose環境: ${isRunningInDockerComposeEnvironment() ? 'Yes' : 'No'}`);
  console.log(`  - ネイティブCI環境: ${isRunningInNativeCI() ? 'Yes' : 'No'}`);
  console.log(`  - Testcontainers利用可能: ${isTestcontainersAvailable() ? 'Yes' : 'No'}`);
  console.log(`  - CI環境: ${process.env.CI || 'No'}`);
  console.log(`  - Node環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  - ホスト名: ${process.env.HOSTNAME || 'N/A'}`);
}
