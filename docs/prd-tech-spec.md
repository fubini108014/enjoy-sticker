# **客製化貼紙工具平台：產品與工程落地完整規格書 (PRD & Tech Spec)**

# **1\. 執行摘要與商業設定 (Executive Summary)**

## **產品定位與商業模式**

本平台專注於消費級（C 端）與個人文創的「零門檻線上貼紙編輯與訂製平台」。用戶只需上傳圖片，系統將自動完成去背、生成邊框刀模與緊湊排版，降到最低的操作門檻。

營運初期採\*\*輕資產自營工坊（Micro-Factory / Studio）\*\*模式，透過桌上型高階相片噴墨印表機與數位割字機，在家或小型工作室完成全流程生產（印刷、覆膜、模切、包裝與寄送），達到極低固定成本與快速驗證市場之目的。

## **主力商品與目標市場**

* **主力銷售單位**：A4 整版拼貼板（Sticker Sheet，採用 Kiss-cut 半斷工藝）。  
* **目標市場**：台灣本地市場，全面支援新台幣 (TWD) 計價、本地主流第三方金流、超商取貨與郵局扁平件物流。

## **成本與毛利結構模型（單張 A4 估算）**

| 項目 | 規格 / 說明 | 單價預估 (TWD) |
| :---- | :---- | :---- |
| **列印耗材** | 霧面背膠相片紙 / 亮面白底防水 PVC | \$4.0 – \$6.0 |
| **墨水消耗** | Epson 6 色相片原廠墨水（全彩高覆蓋率估計） | \$1.5 – \$2.5 |
| **表面保護** | 亮膜 / 霧膜冷裱膜 | \$2.0 – \$3.0 |
| **保護包裝** | A4 加厚防折紙板信封 ＋ 內層防潮透明自黏袋 | \$6.0 – \$8.0 |
| **合計硬體耗材成本** | **單張 A4 直接生產成本** | **\$13.5 – \$19.5** |

* **終端建議售價**：單張 A4 整版排滿 **\$180 – \$220 TWD**  
* **預估耗材毛利率**：**89% – 93%**（未扣除金流手續費、折舊與人力成本）

---

# **2\. 實體產線與設備整合規格 (Hardware & Manufacturing Spec)**

## **2.1 推薦硬體配置**

1. **印刷設備**：`Epson L8050`（A4 六色連續供墨）。採用 C, M, Y, K, Lc, Lm 6 色墨水，可有效消除人物膚色與漸層色彩的顆粒感。  
2. **裁切設備**：`Silhouette Cameo 4 / 5`。內建光學對位感測器，支援 Print & Cut 巡邊自動裁切。  
3. **覆膜設備**：手動冷裱覆膜機（350 mm 滾軸幅寬）。

## **2.2 裁切工藝與對位規範（Silhouette Registration Standard）**

後端渲染產出的 A4 印刷檔，四周必須嚴格保留 Silhouette 割字機光學鏡頭讀取記號（Registration Marks）的專用禁印區域：

* **標記樣式**：  
  * 左上角：實心黑色方塊（\$5 \\times 5 \\text{ mm}\$）。  
  * 右上角與左下角：各有一組直角「L」型光學定位線。  
* **物理邊界限制**：  
  * 上方預留 \$15 \\text{ mm}\$，左右預留 \$10 \\text{ mm}\$，下方預留 \$20 \\text{ mm}\$。  
  * **有效排版安全區域**：寬約 \$180 \\text{ mm} \\times\$ 高約 \$250 \\text{ mm}\$。  
  * 光學讀取通道（所有對位記號周圍 \$10 \\text{ mm}\$ 半徑內）嚴禁有任何彩色圖案或文字。  
* **刀模工藝參數**：  
  * **半斷（Kiss-cut）**：僅切穿貼紙層與背膠層，底紙保持完整不切穿。  
  * **容差邊界**：貼紙輪廓白邊預設寬度為 \$2.0 \\text{ mm}\$，以吸收割字機運作時約 \$\\pm 0.3 \\text{ mm}\$ 的機械偏差。

---

# **3\. 系統架構與技術堆疊 (Architecture & Tech Stack)**

採用「**前端低解析即時互動 ＋ 後端 GPU/Worker 高解析無損渲染**」之分離式架構，兼顧使用者體驗與印刷品質。\[使用者瀏覽器\]

   │ (Next.js \+ Fabric.js)

   ▼ (低解析預覽 & JSON Canvas 參數)

\[ NestJS API Gateway \]

   │

   ├─► \[ PostgreSQL / Prisma \]

   ├─► \[ Cloudflare R2 \] (原圖/向量檔存儲)

   └─► \[ BullMQ 訊息佇列 \]

            │

            ▼

   \[ Python FastAPI Worker \]

      ├─► BiRefNet / RMBG-1.4 (AI 自動去背)

      ├─► Clipper2 / OpenCV (生成輪廓與擴張白邊)

      └─► PyMuPDF / ReportLab (產出 300 DPI CMYK PDF & Cut SVG)

## **技術堆疊明細**

* **前端 (Client)**：`Next.js (React)` \+ `Tailwind CSS` \+ `Fabric.js`（處理畫布互動、多圖層拖曳旋轉、即時縮放與白邊預覽）。  
* \*\* API 閘道器\*\*：`NestJS / Node.js` \+ `PostgreSQL` \+ `Prisma ORM` \+ `Cloudflare R2`（圖檔儲存）+ `BullMQ`（非同步任務佇列）。  
* **渲染與演算法 Worker**：`Python FastAPI` \+ 開源去背模型（`BiRefNet` / `RMBG-1.4`）+ 向量演算法（`Clipper2` / `Shapely`）+ PDF/DXF 產出（`PyMuPDF` / `ReportLab` / `ezdxf`）。

---

# **4\. 核心功能規格詳細說明 (Functional Specifications)**

## **4.1 前端畫布編輯器模組 (Frontend Canvas Editor)**

1. **多格式上傳**：支援 JPG、PNG、WebP、HEIC（手機拍立得格式，由前端自動轉換為 PNG），單一檔案限制 \$25 \\text{ MB}\$。  
2. **DPI 智能防呆警告**：  
   根據貼紙在 A4 畫布上的實際物理尺寸（\$\\text{mm}\$）計算來源圖片像素密度：  
   \$\$\\text{實際 DPI} \= \\frac{\\text{像素寬度}}{\\text{物理寬度 (mm)} / 25.4}\$\$  
   * \$\\ge 300 \\text{ DPI}\$：顯示綠色優良標示。  
   * \$150 – 299 \\text{ DPI}\$：顯示黃色警示。  
   * \$\< 150 \\text{ DPI}\$：顯示紅色警告，並跳出「印製效果可能模糊」之提示。  
3. **刀模白邊控制器**：預設開啟自動白邊（\$1.0 – 4.0 \\text{ mm}\$ 可調）。提供「單圖填滿」與「多圖自動緊湊排列（Auto-pack，物體間最小間距 \$3 \\text{ mm}\$）」功能。

## **4.2 影像演算法與刀模管線 (Contour Generation Pipeline)**

\[原始圖檔\] ──► \[ Alpha 去背 (RMBG-1.4) \] ──► \[ 二值化遮罩 (Threshold 128\) \]

                                                        │

\[ 輸出 SVG/DXF \] ◄── \[ RDP 簡化與平滑 \] ◄── \[ Clipper2 膨脹 (+2mm) \] ◄── \[ Marching Squares 輪廓提取 \]

1. **AI 智慧去背**：輸入圖檔經由 RMBG-1.4 處理，產出 Alpha 通道遮罩。  
2. **二值化與輪廓提取**：採用 Marching Squares 演算法將 Alpha 通道轉換為多邊形邊界點陣列。  
3. **向量外擴（Offsetting）**：利用 Clipper2 進行多邊形正向膨脹，計算公式為預設白邊值 \$+2.0 \\text{ mm}\$。  
4. **節點簡化**：使用 Ramer-Douglas-Peucker (RDP) 演算法，將 \$\\epsilon\$ 設為 \$0.8 – 1.2 \\text{ px}\$，去除過度密集的節點。  
5. **平滑化處理**：採用 Chaikin 演算法或 Cubic Bézier 曲線進行邊角平滑。

## **4.3 檔案匯出規格 (Export Standard)**

* **`order_{id}_print.pdf`（列印專用檔）**：  
  * 尺寸：標準 A4（\$210 \\times 297 \\text{ mm}\$）。  
  * 解析度與色彩：\$300 \\text{ DPI}\$、CMYK 色彩空間（嵌入 FOGRA39 描述檔）。  
  * 內容：包含 Silhouette 光學對位記號、圖檔本身、及 \$0.5 \\text{ mm}\$ 出血位，**不含**裁切紅線（防止誤印切線）。  
* **`order_{id}_cut.dxf` / `.svg`（割字機專用刀模檔）**：  
  * 比例：1:1 等比例對齊。  
  * 內容：包含三點對位記號點位，以及 \$0.1 \\text{ pt}\$ 紅色閉合向量切線（`#FF0000`）。

---

# **5\. 商業營運、金流與物流整合 (Business & Logistics)**

## **5.1 本地金流與電子發票整合**

* **綠界科技（ECPay）全方位金流**：  
  * 信用卡支付（支援 3D 驗證）。  
  * LINE Pay / 街口支付。  
  * ATM 虛擬帳號轉帳（設定 24 小時繳費期限，逾時自動釋放訂單）。  
* **電子發票**：串接綠界 B2C 電子發票 API，支援載具歸戶、手機條碼及捐贈碼。

## **5.2 台灣本地物流模組**

* **超商 C2C**：7-ELEVEN（交貨便）與全家便利商店（店到店），支援門市地圖選擇器，並於後端自動生成託運單（小白單）列印資料。  
* **郵局寄送**：採用郵局 1 號袋扁平專用包裝，資費定額為 \$\$37 – \$44 \\text{ TWD}\$。

## **5.3 訂單狀態機 (Order State Machine)**

\[PENDING\_PAYMENT\] ──(付款成功)──► \[PROCESSING\_RENDER\]

                                      │

                                  (渲染完成)

                                      ▼

    \[PACKED\] ◄──(印刷/裁切完成)── \[QUEUED\_TO\_PRINT\]

       │

   (交寄物流)

       ▼

   \[SHIPPED\] ──► \[DELIVERED\]

---

# **6\. 資料庫模型設計 (Schema Blueprint)**

使用 Prisma ORM 語法定義之 PostgreSQL Schema 模型：datasource db {

  provider \= "postgresql"

  url      \= env("DATABASE\_URL")

}

generator client {

  provider \= "prisma-client-js"

}

enum OrderStatus {

  PENDING\_PAYMENT

  PROCESSING\_RENDER

  QUEUED\_TO\_PRINT

  PACKED

  SHIPPED

  DELIVERED

  CANCELLED

}

enum ShippingType {

  UNIMART\_C2C

  FAMILY\_C2C

  POST\_OFFICE

}

enum FinishType {

  GLOSSY

  MATTE

}

model User {

  id        String   @id @default(uuid())

  email     String   @unique

  name      String?

  phone     String?

  designs   Design\[\]

  orders    Order\[\]

  createdAt DateTime @default(now())

  updatedAt DateTime @updatedAt

}

model Design {

  id          String      @id @default(uuid())

  userId      String

  user        User        @relation(fields: \[userId\], references: \[id\])

  canvasJson  Json

  previewUrl  String

  orderItems  OrderItem\[\]

  createdAt   DateTime    @default(now())

  updatedAt   DateTime    @updatedAt

}

model Order {

  id              String       @id @default(uuid())

  userId          String

  user            User         @relation(fields: \[userId\], references: \[id\])

  status          OrderStatus  @default(PENDING\_PAYMENT)

  totalAmount     Int

  shippingType    ShippingType

  shippingAddress String

  recipientName   String

  recipientPhone  String

  trackingNumber  String?

  ecpayTradeNo    String?      @unique

  items           OrderItem\[\]

  createdAt       DateTime     @default(now())

  updatedAt       DateTime     @updatedAt

}

model OrderItem {

  id            String     @id @default(uuid())

  orderId       String

  order         Order      @relation(fields: \[orderId\], references: \[id\])

  designId      String

  design        Design     @relation(fields: \[designId\], references: \[id\])

  finishType    FinishType @default(GLOSSY)

  quantity      Int        @default(1)

  unitPrice     Int

  highResPdfUrl String?

  cutSvgUrl     String?

}

---

# **7\. 敏捷開發里程碑 (Implementation Roadmap)**

第 1–2 週：\[ 階段 1：核心演算法驗證 PoC \] ──► Python FastAPI \+ BiRefNet \+ Clipper2 模組

第 3–4 週：\[ 階段 2：硬體無損閉環整合 \]   ──► Fabric.js 編輯器 \+ PDF/DXF 導出 \+ 實體印裁測試

第 5–6 週：\[ 階段 3：電商與金物流系統 \]   ──► NestJS \+ ECPay 金流 \+ 超商地圖 \+ 發票系統

第 7 週  ：\[ 階段 4：封閉測試與上線 \]     ──► 端到端測試 \+ 壓力測試 \+ 官網正式上線

* **階段 1：核心演算法驗證 PoC（第 1–2 週）**  
  * 搭建 Python Worker 服務，驗證去背、輪廓導出與 Clipper2 膨脹計算。  
  * 確保轉出的向量 DXF/SVG 能精確被 Silhouette Studio 讀取。  
* **階段 2：硬體無損閉環整合（第 3–4 週）**  
  * 完成前端 Fabric.js 編輯器開發，實現即時白邊預覽與排版。  
  * 實現高解析度 CMYK PDF 生成，並進行實體 Epson L8050 印刷與 Cameo 裁切對位測試，校正機械誤差。  
* **階段 3：電商與金物流系統（第 5–6 週）**  
  * 完成 NestJS 後端與 PostgreSQL 資料庫串接。  
  * 整合綠界金流、超商 C2C 門市選擇與電子發票開立功能。  
* **階段 4：封閉測試與上線（第 7 週）**  
  * 小範圍發放體驗碼，驗證整體流程（上線、下單、列印、裁切、寄送）。  
  * 修正邊界 Bug 並正式對外開放。

---

# **8\. 產能瓶頸與產線升級路徑 (Scaling Strategy)**

小作坊期 (1-15張/日)     ──► 單人作業 / 單機 L8050 \+ Cameo 4

微型工廠期 (20-50張/日)  ──► 雙裁切機並行 \+ 電動冷裱機 \+ 局部備貨

外包轉移期 (50+張/日)    ──► 啟動代工廠 API 自動拋單 (BPO)

1. **小作坊期（第 1–2 個月，日單 1–15 張，月營收約 0.6–9 萬）**  
   * **設備**：Epson L8050 \$\\times\$ 1、Cameo 4 \$\\times\$ 1、手動冷裱機 \$\\times\$ 1。  
   * **人力**：創辦人單人兼職營運，手工覆膜與包裝。  
2. **微型工廠期（第 3–4 個月，日單 20–50 張，月營收約 12–30 萬）**  
   * **設備**：添購第二台 Cameo 5 裁切機以舒緩瓶頸，升級為 380mm 電動自動進紙冷裱機。  
   * **流程優化**：後端新增批次列印功能，將多張 A4 訂單合併產出。  
3. **外包轉移期（第 5 個月後，日單 50+ 張，月營收 30 萬以上）**  
   * **策略轉型**：對接大型印刷廠 API（如健豪、雲端印刷網），將量大或複製訂單自動轉單外包（BPO）。  
   * **自營產線定位**：自營設備轉為處理「加價急件（24H 出貨）」與特殊小眾材質。

---

# **9\. 第二階段核心功能與技術擴展 (Phase 2 Features)**

* **特殊材質支援**：  
  * 新增雷射炫彩（Holographic）與透明貼紙選項。  
  * **白墨鋪底演算法（White Underbase Choke）**：針對透明貼紙自動生成比彩色圖樣內縮 \$0.2 \\text{ mm}\$ 的白墨圖層，避免印刷時白墨溢邊。  
* **創作者分潤與公開圖庫市集 (Creator Marketplace)**：  
  * 允許插畫家上傳作品集，消費者可直接調用圖樣進行拼貼。  
  * 每賣出一張拼貼板，自動計算 \$5 – 10%\$ 分潤給創作者。  
* **雲端畫布存檔與一鍵重新訂購 (Re-order)**：  
  * 保存歷史排版紀錄，提供一鍵下單複製舊有貼紙板。

---

# **10\. 冷啟動與用戶增長計畫 (Go-To-Market Plan)**

* **寵物社群定向推廣**：  
  * 針對 Instagram / Threads 上熱門寵物帳號（貓狗社群）進行「晒毛孩貼紙免費體驗」活動。  
  * 邀請創作者開箱並提供專屬折扣碼，獲取種子用戶。  
* **同人展與文創市集合作**：  
  * 鎖定 FF（開拓動漫祭）、CWT（台灣同人誌販售會）之獨立攤主，提供「小量多樣、無需開模」的試印方案。  
* **社群 UGC 病毒擴散機制**：  
  * 在包裝內附贈專屬 QR Code，消費者開箱拍照標記官方 IG 帳號即可獲得 \$\$30 \\text{ TWD}\$ 購物金。

---

# **11\. 風險管理與應對預案 (Contingency Plans)**

| 風險項目 | 潛在問題 / 症狀 | 應對與解決預案 |
| :---- | :---- | :---- |
| **割字機對位失敗** | 冷裱膜反光導致 Silhouette 光學鏡頭無法讀取標記 | 於後端產生 PDF 時將標記區域設為禁印，冷裱時避開標記；或於標記處貼上霧面隱形膠帶消光。 |
| **智慧財產權爭議** | 用戶上傳未授權或侵權圖像（動漫 IP、他人照片） | 1\. 於結帳前設置強制勾選「版權聲明 Checkbox」。2. 設定檢舉機制與條款，若收到權利人通知即下架該設計。 |
| **覆膜氣泡與起皺** | 手動冷裱工藝不穩定導致貼紙報廢 | 制定嚴格操作 SOP（先固定頭端 \$2 \\text{ cm}\$，配合滾軸勻速推進），若報廢率高於標準則加速導入電動冷裱機。 |
| **螢幕與印刷色差** | 用戶反映印出成品顏色偏暗或有色偏 | 1\. 編輯器預設顯示「RGB 轉 CMYK 色彩容差警告」。2. 前端介面標示「螢幕發光色彩與印刷塗料存在物理色差」之說明。 |

---

# **12\. 營運指標儀表板 (KPIs & Metrics)**

* **轉化率漏斗（Conversion Funnel）**：  
  * 上傳圖片轉換率 \$\> 35%\$（進入首頁至成功上傳第一張圖）。  
  * 編輯器至結帳轉換率 \$\> 15%\$。  
  * 金流付款成功率 \$\> 60%\$。  
* **履約時效 (Fulfillment Time)**：  
  * 從「付款完成」至「超商寄件」控制於 **48 小時內**（不含例假日）。  
* **生產品質控制**：  
  * 裁切偏移或對位失敗報廢率嚴格控制於 **\$3%\$ 以下**。  
  * 消費者售後客訴退換貨率控制於 **\$1.5%\$ 以下**。