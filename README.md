# 時間表 · 2026 秋季學期

一個單檔 PWA（漸進式網頁應用），用嚟管理課表、溫書時段、待辦、截止倒數、GPA 同日記。

- **完全離線可用** —— 全部資源都由 Service Worker 快取
- **資料只存喺你部機** —— localStorage + IndexedDB，唔會上傳
- **可以加到主畫面** —— 開出嚟同原生 App 一樣，冇網址欄
- **兩部機同步（可選）** —— 借用你自己嘅 GitHub 私密 Gist，見 App 內「設定 → 雲端同步」

## 點用

直接開 `index.html` 就得（要經 HTTP，唔好用 `file://`，唔然 Service Worker 同「加到主畫面」會失效）。

本機開：

```bash
python -m http.server 3000 --bind 127.0.0.1
# 然後開 http://localhost:3000/index.html
```

## 檔案

| 檔案 | 用途 |
|---|---|
| `index.html` | 整個 App（HTML + CSS + JS 單檔） |
| `sw.js` | Service Worker：離線快取 + 版本更新 |
| `manifest.json` | PWA 資訊（名稱、圖示、捷徑） |
| `icon-*.png` / `apple-touch-icon.png` | App 圖示 |

## 更新版本

改完之後，**同時**改：

1. `sw.js` 嘅 `const VERSION = 'vNN';`
2. `index.html` 嘅 `var APP_VER = 'vNN';`

兩個必須一致 —— 設定頁「App 更新」靠對比佢哋嚟判斷有冇新版。
