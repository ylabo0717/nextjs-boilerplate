/**
 * Loki Testcontainer Setup Utilities
 * テスト用Lokiコンテナの設定とヘルパー関数
 */

import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

export interface LokiTestContainer {
  url: string;
  host: string;
  port: number;
  container: StartedTestContainer;
  health: () => Promise<boolean>;
  stop: () => Promise<void>;
}

/**
 * Lokiテストコンテナを作成・起動
 */
export async function createLokiTestContainer(): Promise<LokiTestContainer> {
  console.log('🚀 Creating Loki test container...');
  
  const container = await new GenericContainer('grafana/loki:latest')
    .withExposedPorts(3100)
    .withCommand(['-config.file=/etc/loki/local-config.yaml'])
    .withWaitStrategy(
      Wait.forHttp('/ready', 3100)
        .forStatusCode(200)
        .withStartupTimeout(30_000)
    )
    .withLogConsumer((stream) => {
      stream.on('data', (line) => console.log(`[Loki Container] ${line}`));
      stream.on('err', (line) => console.error(`[Loki Container Error] ${line}`));
    })
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(3100);
  const url = `http://${host}:${port}`;

  console.log(`✅ Loki test container started at: ${url}`);

  return {
    url,
    host,
    port,
    container,
    health: () => checkLokiHealth(url),
    stop: async () => {
      console.log('🛑 Stopping Loki test container...');
      await container.stop();
      console.log('✅ Loki test container stopped');
    },
  };
}

/**
 * Lokiサーバーの健全性をチェック
 */
export async function checkLokiHealth(lokiUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${lokiUrl}/ready`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.warn(`Loki health check failed for ${lokiUrl}:`, error);
    return false;
  }
}

/**
 * Lokiサーバーが起動するまで待機
 */
export async function waitForLokiReady(
  lokiUrl: string,
  maxRetries = 30,
  retryInterval = 1000
): Promise<boolean> {
  console.log(`⏳ Waiting for Loki to be ready at ${lokiUrl}...`);
  
  for (let i = 0; i < maxRetries; i++) {
    const isHealthy = await checkLokiHealth(lokiUrl);
    if (isHealthy) {
      console.log(`✅ Loki is ready at ${lokiUrl}`);
      return true;
    }
    
    console.log(`⏳ Loki not ready yet, retrying in ${retryInterval}ms... (${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, retryInterval));
  }
  
  console.error(`❌ Loki failed to become ready after ${maxRetries} retries`);
  return false;
}

/**
 * テスト用のLoki設定を生成
 */
export function generateLokiTestConfig() {
  return {
    auth_enabled: false,
    server: {
      http_listen_port: 3100,
    },
    ingester: {
      lifecycler: {
        address: '127.0.0.1',
        ring: {
          kvstore: {
            store: 'inmemory',
          },
          replication_factor: 1,
        },
        final_sleep: '0s',
      },
      chunk_idle_period: '1h',
      max_chunk_age: '1h',
      chunk_target_size: 1048576,
      chunk_retain_period: '30s',
      max_transfer_retries: 0,
    },
    schema_config: {
      configs: [
        {
          from: '2020-10-24',
          store: 'boltdb-shipper',
          object_store: 'filesystem',
          schema: 'v11',
          index: {
            prefix: 'index_',
            period: '24h',
          },
        },
      ],
    },
    storage_config: {
      boltdb_shipper: {
        active_index_directory: '/loki/boltdb-shipper-active',
        cache_location: '/loki/boltdb-shipper-cache',
        resync_interval: '5s',
        shared_store: 'filesystem',
      },
      filesystem: {
        directory: '/loki/chunks',
      },
    },
    limits_config: {
      enforce_metric_name: false,
      reject_old_samples: true,
      reject_old_samples_max_age: '168h',
    },
    chunk_store_config: {
      max_look_back_period: '0s',
    },
    table_manager: {
      retention_deletes_enabled: false,
      retention_period: '0s',
    },
  };
}