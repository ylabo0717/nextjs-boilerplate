# リリース自動化ガイド

## 概要

このプロジェクトでは、[Changesets](https://github.com/changesets/changesets)を使用してリリースプロセスを自動化しています。

## リリースワークフロー

### 1. 変更内容の記録（開発者）

開発者は機能追加やバグ修正を行った際に、changesetを作成します：

```bash
# 対話式でchangesetを作成
pnpm changeset:add

# または
pnpm changeset
```

以下の情報を入力します：

- 変更の影響を受けるパッケージ（このプロジェクトでは`nextjs-boilerplate`）
- バージョンタイプ（major/minor/patch）
- 変更内容の説明

### 2. リリースPRの自動作成

mainブランチにプッシュされると、GitHub Actionsが自動的に：

1. changesetを検出
2. バージョンを計算
3. リリースPRを作成または更新

### 3. リリースの実行

リリースPRがマージされると：

1. パッケージのバージョンが更新
2. CHANGELOGが自動生成
3. Gitタグが作成
4. GitHub Releaseが作成
5. ビルドアセットがアップロード

## バージョニング規則

[セマンティックバージョニング](https://semver.org/lang/ja/)に従います：

- **Major（X.0.0）**: 破壊的変更
- **Minor（0.X.0）**: 後方互換性のある機能追加
- **Patch（0.0.X）**: 後方互換性のあるバグ修正

## コマンド一覧

```bash
# changeset作成
pnpm changeset:add

# 現在のchangesetの状態を確認
pnpm release:check

# バージョンを手動で更新（通常は不要）
pnpm changeset:version

# リリースを手動で実行（通常は不要）
pnpm release
```

## 手動リリース

緊急リリースが必要な場合、GitHub Actionsから手動でトリガーできます：

1. GitHub Actionsページへ移動
2. "Release"ワークフローを選択
3. "Run workflow"をクリック
4. バージョンタイプを選択（patch/minor/major）
5. 必要に応じてプレリリース識別子を選択（beta/alpha/rc）

## プレリリース

ベータ版やRC版をリリースする場合：

```bash
# プレリリース用のchangesetを作成
pnpm changeset pre enter beta
pnpm changeset:add
pnpm changeset:version

# プレリリースモードを終了
pnpm changeset pre exit
```

## changesetファイルの構造

`.changeset/`ディレクトリに作成されるファイル：

```markdown
---
'nextjs-boilerplate': minor
---

新機能: ダークモードのサポートを追加
```

## トラブルシューティング

### changesetが検出されない

- `.changeset/`ディレクトリにMarkdownファイルが存在するか確認
- ファイル名が`README.md`でないことを確認

### リリースPRが作成されない

- mainブランチへの権限を確認
- GitHub Actionsの実行ログを確認
- GITHUB_TOKENの権限設定を確認

### バージョンが正しく更新されない

- package.jsonのversionフィールドを確認
- changesetのconfig.jsonを確認
- 手動で`pnpm changeset:version`を実行してエラーを確認

## ベストプラクティス

1. **小さく頻繁なリリース**
   - 変更を小さく保つ
   - 定期的にリリース

2. **明確な変更記録**
   - changesetのメッセージは簡潔かつ明確に
   - ユーザー視点で記述

3. **プレリリースの活用**
   - 大きな変更はベータ版でテスト
   - フィードバックを収集してから正式リリース

4. **自動化の活用**
   - 手動操作を最小限に
   - CI/CDでの自動チェック

## 関連ドキュメント

- [Changesets公式ドキュメント](https://github.com/changesets/changesets)
- [セマンティックバージョニング](https://semver.org/lang/ja/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [デプロイメント環境設定](./deployment-environments.md)
