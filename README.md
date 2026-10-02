# enjoy-sticker

客製化貼紙工具平台：提供圖片上傳、去背、白邊刀模生成、A4 排版與訂製流程。

## 開發規格

- [完整產品與工程落地規格書（PRD & Tech Spec）](docs/prd-tech-spec.md)
- [Google Docs 原始文件](https://docs.google.com/document/d/1wgdr4vdKQueciOn79AZl_qgefEI_oXxt5qqgaJiYowM/edit)

規格書於 2026-10-02 從 Google Docs 匯出為 Markdown，第 1–12 章保留原始匯出內容；第 13 章加入 2026-10-03 的 MVP 產品體驗與履約補充規格。此檔案為匯入當日的快照，後續原始文件變更不會自動同步。

原文件包含 12 個章節，第 13 章補充產品體驗與 MVP 驗收。原章節涵蓋：商業設定、實體產線、系統架構、核心功能、金物流、資料庫模型、開發里程碑、產線升級、第二階段功能、用戶增長、風險管理與營運指標。

## 開發起點

依規格書第 7 章，第一階段為核心演算法 PoC：驗證去背、輪廓提取、白邊外擴與 SVG/DXF 匯出，並確認刀模檔能被 Silhouette Studio 正確讀取。

## 介面原型

已建立可操作的貼紙工作桌，提供素材上傳、拖曳與鍵盤移動、尺寸與白邊調整、複製與刪除、復原與重做、自動排版、瀏覽器草稿儲存，以及訂製確認預覽。

啟動本機預覽（需 Node.js，不需安裝套件）：

```sh
node prototype/server.cjs
```

開啟 <http://127.0.0.1:4173>。亦可直接使用瀏覽器開啟 `prototype/index.html`；草稿保存建議使用本機伺服器，以維持一致的瀏覽器來源。

- [介面原型](prototype/index.html)
- [設計方向與功能範圍](docs/ui-design.md)

原型新增背景比較、指定份數與同圖排滿、30 天同裝置自動存稿、印製檢查、配送總價、獨立設計快照、重新編輯與工坊異常狀態示範。所有訂單保存在瀏覽器，不會付款、退款或寄件。尚未串接 AI 去背、HEIC 轉換、正式印刷 PDF/SVG/DXF、帳號、金流、物流與正式訂單服務。畫布白邊與對位記號只用於視覺預覽，不能作為正式印刷或裁切檔。示範定價為每張 A4 NT$200，超商運費 NT$60／郵局 NT$40；確認頁展示含運費總額，費率僅供原型使用。

中文字體使用 Noto Sans TC，品牌與數字使用 Outfit，由 Google Fonts 載入；離線時使用本機 sans-serif 字體。

## GitHub Pages 部署

預定網站網址：<https://fubini108014.github.io/enjoy-sticker/>。

部署流程在 `.github/workflows/pages.yml`。修改 `prototype/` 或部署設定並推送到 `main` 後，自動檢查 JavaScript、打包並發布；亦可在 Actions 手動執行。

首次啟用需在 GitHub 儲存庫 Settings → Pages → Build and deployment，將 Source 設為 **GitHub Actions**。部署結果可在 Actions 的 **Deploy sticker studio to GitHub Pages** 查看；只有 workflow 成功並確認網站可讀取後，才視為發布完成。

發布內容僅包含原型的 HTML、CSS 與兩份前端 JavaScript；本機伺服器、規格書與預覽截圖不會加入網站發布包。正式 API、金流、物流與印刷服務尚未提供；草稿與示範訂單存在訪客自己的瀏覽器。不同網站來源的本機草稿不會互相同步。
