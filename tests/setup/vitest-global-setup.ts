/**
 * Vitest Global Setup for Testcontainers
 * Lokiコンテナのライフサイクル管理
 */

import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

let lokiContainer: StartedTestContainer | null = null;

export async function setup({ provide }: { provide: (key: string, value: any) => void }) {
  // Docker環境でLokiテストをスキップする場合はセットアップを省略
  if (process.env.SKIP_LOKI_TESTS === 'true') {
    console.log('🔄 Skipping Loki testcontainer setup (SKIP_LOKI_TESTS=true)');

    // Lokiが必要なテストがスキップされるよう、ダミー値を提供
    provide('lokiUrl', 'http://localhost:3100');
    provide('lokiHost', 'localhost');
    provide('lokiPort', 3100);

    return {
      lokiUrl: 'http://localhost:3100',
      lokiHost: 'localhost',
      lokiPort: 3100,
    };
  }

  console.log('🚀 Starting Loki testcontainer...');

  try {
    // Lokiコンテナを起動（安定版を使用）
    lokiContainer = await new GenericContainer('grafana/loki:3.5.0')
      .withExposedPorts(3100)
      .withCommand(['-config.file=/etc/loki/local-config.yaml'])
      .withWaitStrategy(
        Wait.forAll([
          Wait.forListeningPorts(), // ポートがリスニング状態になるまで待機
          Wait.forHttp('/ready', 3100).forStatusCode(200).withStartupTimeout(60_000), // 60秒に延長
        ])
      )
      .withLogConsumer((stream) => {
        stream.on('data', (line) => console.log(`[Loki] ${line}`));
        stream.on('err', (line) => console.error(`[Loki Error] ${line}`));
        stream.on('end', () => console.log('[Loki] Stream ended'));
      })
      .start();

    const lokiUrl = `http://${lokiContainer.getHost()}:${lokiContainer.getMappedPort(3100)}`;

    console.log(`✅ Loki testcontainer started at: ${lokiUrl}`);

    // 追加の健全性チェック
    console.log('🔍 Performing additional health check...');
    try {
      const healthResponse = await fetch(`${lokiUrl}/ready`, {
        signal: AbortSignal.timeout(10000), // 10秒でタイムアウト
      });
      if (healthResponse.ok) {
        console.log('✅ Loki health check passed');
      } else {
        console.warn(`⚠️ Loki health check returned status: ${healthResponse.status}`);
      }
    } catch (healthError) {
      console.warn('⚠️ Manual health check failed, but container started:', healthError);
      // コンテナは起動済みなので、エラーを投げずに続行
    }

    // VitestのprovideでテストにLoki URLを提供
    provide('lokiUrl', lokiUrl);
    provide('lokiHost', lokiContainer.getHost());
    provide('lokiPort', lokiContainer.getMappedPort(3100));

    return {
      lokiUrl,
      lokiHost: lokiContainer.getHost(),
      lokiPort: lokiContainer.getMappedPort(3100),
    };
  } catch (error) {
    console.error('❌ Failed to start Loki testcontainer:', error);
    throw error;
  }
}

export async function teardown() {
  if (lokiContainer) {
    console.log('🛑 Stopping Loki testcontainer...');
    try {
      await lokiContainer.stop();
      console.log('✅ Loki testcontainer stopped successfully');
    } catch (error) {
      console.error('❌ Failed to stop Loki testcontainer:', error);
    } finally {
      lokiContainer = null;
    }
  }
}
