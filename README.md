# enjoy-sticker

客製化貼紙工具平台：提供圖片上傳、去背、白邊刀模生成、A4 排版與訂製流程。

## 開發規格

- [完整產品與工程落地規格書（PRD & Tech Spec）](docs/prd-tech-spec.md)
- [Google Docs 原始文件](https://docs.google.com/document/d/1wgdr4vdKQueciOn79AZl_qgefEI_oXxt5qqgaJiYowM/edit)

規格書於 2026-10-02 從 Google Docs 匯出為 Markdown，保留完整原文。此檔案為匯入當日的快照，後續原始文件變更不會自動同步。

原文件包含 12 個章節：商業設定、實體產線、系統架構、核心功能、金物流、資料庫模型、開發里程碑、產線升級、第二階段功能、用戶增長、風險管理與營運指標。

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

原型尚未串接 AI 去背、HEIC 轉換、正式印刷 PDF/SVG/DXF、帳號、金流、物流與訂單服務。畫布白邊與對位記號只用於視覺預覽，不能作為正式印刷或裁切檔。示範定價為每張 A4 NT$200，尚未含運費。

中文字體使用 Noto Sans TC，品牌與數字使用 Outfit，由 Google Fonts 載入；離線時使用本機 sans-serif 字體。
