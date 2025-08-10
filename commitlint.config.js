module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新機能
        'fix', // バグ修正
        'docs', // ドキュメントのみの変更
        'style', // コードの意味に影響しない変更（空白、フォーマット、セミコロンなど）
        'refactor', // バグ修正や機能追加を伴わないコード変更
        'perf', // パフォーマンス改善
        'test', // テストの追加や既存テストの修正
        'chore', // ビルドプロセスやヘルパーツールの変更
        'revert', // 以前のコミットを取り消す
        'build', // ビルドシステムや外部依存関係に影響する変更
        'ci', // CI設定ファイルとスクリプトの変更
      ],
    ],
    'subject-case': [0], // 日本語対応のため無効化
    'subject-max-length': [2, 'always', 100],
  },
};
