# Pet Adviser

猫の健康記録をローカルに保存する Next.js (App Router) + TypeScript のMVPです。

## できること

- 初回アクセス時にデフォルト猫プロフィールを自動作成
- 日次の体重・食事量・トイレ回数を記録
- LocalStorage に保存
- 同じ日付を選ぶと既存記録を上書き編集
- 過去3日平均と比較した簡易異常判定を表示
- 履歴を新しい順で表示

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## 技術構成

- Next.js App Router
- TypeScript
- UI → Service → Local Repository → LocalStorage

## 主なディレクトリ

```txt
src/
  app/
  components/record/
  domain/
  infrastructure/repositories/
  services/
  lib/utils/
```
