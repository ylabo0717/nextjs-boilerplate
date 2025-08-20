# Docker Environment Cleanup Action

Docker環境のクリーンアップを段階的に実行するGitHub Actionです。

## 概要

このActionは、テスト実行後のDocker環境を適切にクリーンアップし、CI/CDパイプラインでのリソース効率化と安定性を提供します。

## 入力パラメータ

| パラメータ | 必須 | デフォルト | 説明 |
|-----------|-----|-----------|-----|
| `cleanup-level` | ❌ | `basic` | クリーンアップレベル (`basic`/`full`/`aggressive`) |
| `compose-file` | ❌ | `docker-compose.test.yml` | クリーンアップ対象のDocker Composeファイル |
| `preserve-cache` | ❌ | `true` | Dockerビルドキャッシュの保持 |

## クリーンアップレベル

### Basic (`basic`)
- Composeサービスの停止・削除
- 未使用コンテナの削除
- 安全で軽量なクリーンアップ

### Full (`full`)
- Basic + 以下を追加:
- 未使用ボリュームの削除
- 未使用ネットワークの削除

### Aggressive (`aggressive`)
- Full + 以下を追加:
- 未使用イメージの削除
- `preserve-cache=false`時はビルドキャッシュも削除
- 完全なシステムクリーンアップ

## 実行内容

### 1. 設定表示
現在のクリーンアップ設定を表示

### 2. Composeサービス停止
指定されたComposeファイルのサービスを停止・削除

### 3. 段階的クリーンアップ
レベルに応じた段階的なリソースクリーンアップ

### 4. クリーンアップサマリー
残存リソースの表示と実行結果の確認

## 使用例

### 基本的なクリーンアップ
```yaml
- uses: ./.github/actions/docker-cleanup
  if: always()
```

### 完全なクリーンアップ
```yaml
- uses: ./.github/actions/docker-cleanup
  if: always()
  with:
    cleanup-level: 'full'
```

### 積極的なクリーンアップ（キャッシュ削除含む）
```yaml
- uses: ./.github/actions/docker-cleanup
  if: always()
  with:
    cleanup-level: 'aggressive'
    preserve-cache: 'false'
```

### カスタムComposeファイル
```yaml
- uses: ./.github/actions/docker-cleanup
  if: always()
  with:
    compose-file: 'docker-compose.prod.yml'
    cleanup-level: 'full'
```

## クリーンアップ戦略

### 開発環境での推奨設定
```yaml
cleanup-level: 'basic'
preserve-cache: 'true'
```

### CI/CD環境での推奨設定
```yaml
cleanup-level: 'full'
preserve-cache: 'true'  # パフォーマンス重視
```

### リソース制約のある環境
```yaml
cleanup-level: 'aggressive'
preserve-cache: 'false'
```

## エラーハンドリング

- Composeファイルが存在しない場合は警告を出力して継続
- 各クリーンアップステップのエラーは独立して処理
- 最終的なサマリーで残存リソースを確認可能

## 出力

このActionは環境のクリーンアップのみを行い、特別な出力は提供しません。クリーンアップの完了状況は標準出力で確認できます。

## 注意事項

- `always()`条件での使用を推奨（テスト失敗時もクリーンアップ実行）
- `aggressive`レベルは大量のキャッシュ削除により次回実行時間が増加する可能性
- 本番環境では`cleanup-level: 'basic'`の使用を推奨

## 関連ドキュメント

- [Setup Docker Test Environment Action](../setup-docker-test-env/README.md)
- [CI/CDワークフロー改善設計書](../../../docs/work_dir/docker_compose/functional-separation-design.md)