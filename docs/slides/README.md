# Slides — "現在のコードベースでできること"

PptxGenJS で生成する DeNovoCNN 機能紹介スライド。

## 再生成

```bash
cd docs/slides
npm install        # pptxgenjs / react-icons / react / react-dom / sharp
node build.js      # → DeNovoCNN_capabilities.pptx
```

## ファイル

| パス | 内容 | git |
|---|---|---|
| `build.js` | スライド生成スクリプト（全レイアウト） | tracked |
| `package.json` / `package-lock.json` | Node 依存定義 | tracked |
| `assets/sample_{snp,del,ins}.png` | パイルアップ画像サンプル（`images/` から上部クロップ・5倍拡大して作成済み。`images/` は git 管理外のため成果物を同梱） | tracked |
| `DeNovoCNN_capabilities.pptx` | 完成スライド（10枚） | tracked |
| `node_modules/`, `*.pdf`, `slide-*.jpg` | npm 依存・QA用の中間生成物 | ignored |

## QA（任意）

```bash
soffice --headless --convert-to pdf DeNovoCNN_capabilities.pptx
pdftoppm -jpeg -r 110 DeNovoCNN_capabilities.pdf slide   # slide-01.jpg ...
```

## 備考

- フォント: 見出し `Noto Serif CJK JP` / 本文 `Noto Sans CJK JP`。
- サンプル画像を別の変異で差し替える場合は `images/` の PNG から
  上部クロップ（データ行のみ）→ 5倍 NEAREST 拡大で `assets/` に再作成する。
