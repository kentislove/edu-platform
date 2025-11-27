# Educational Platform (Demo)

這是一個基於 Google Sheets 作為後端資料庫的教學平台網站範例。

## 功能特色
- **會員系統**：支援 Email 註冊/登入 以及 Google 一鍵登入。
- **內容管理**：透過 Google Sheets 管理影片標題、連結與縮圖。
- **權限控制**：
  - 一般會員：僅可觀看免費內容。
  - VIP 會員 (已付費)：可解鎖觀看所有內容。
- **無伺服器架構**：前端使用靜態 HTML/JS，後端使用 Google Apps Script (GAS)。

## 如何使用
1. 登入系統。
2. 瀏覽課程列表。
3. 點擊卡片觀看影片。

## 技術架構
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Google Apps Script
- **Database**: Google Sheets

## 部署
本專案託管於 GitHub Pages。

## 📚 開發文件

- **[完整開發文件](DEVELOPMENT_DOCUMENTATION.md)** - 詳細的開發流程、時程、成本分析與基礎設施升級方案
- **[開發摘要](DEVELOPMENT_SUMMARY.md)** - 視覺化摘要，包含流程圖、成本對照表與快速參考

### 重點摘要
- **開發時程**: 7-12 週 (約 2-3 個月)
- **開發成本**: NT$ 304,000 - 1,200,000 (依團隊規模)
- **當前架構**: 完全免費，適合 100 DAU 以下
- **升級時機**: DAU > 80 人時建議開始規劃升級
- **同時在線上限**: 10-15 人 (當前架構)

