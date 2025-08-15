/**
 * Vitest Global Setup for Testcontainers
 * Lokiコンテナのライフサイクル管理
 */

import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

let lokiContainer: StartedTestContainer | null = null;

export async function setup({ provide }: { provide: (key: string, value: any) => void }) {
  console.log('🚀 Starting Loki testcontainer...');
  
  try {
    // Lokiコンテナを起動
    lokiContainer = await new GenericContainer('grafana/loki:latest')
      .withExposedPorts(3100)
      .withCommand(['-config.file=/etc/loki/local-config.yaml'])
      .withWaitStrategy(
        Wait.forHttp('/ready', 3100)
          .forStatusCode(200)
          .withStartupTimeout(30_000)
      )
      .withLogConsumer((stream) => {
        stream.on('data', (line) => console.log(`[Loki] ${line}`));
        stream.on('err', (line) => console.error(`[Loki Error] ${line}`));
        stream.on('end', () => console.log('[Loki] Stream ended'));
      })
      .start();

    const lokiUrl = `http://${lokiContainer.getHost()}:${lokiContainer.getMappedPort(3100)}`;
    
    console.log(`✅ Loki testcontainer started at: ${lokiUrl}`);
    
    // Vitestのprovide機能でテストにLoki URLを提供
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