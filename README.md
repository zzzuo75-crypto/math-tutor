# 台灣國三 AI 數學老師 (Taiwan Grade 9 AI Math Tutor)

專為台灣國中三年級學生量身打造的 AI 數學家教 Web App。具備相片雙重嚴格核對、啟發式循序引導、步驟詳解、卡點深入說明與即時同概念練習題功能。

---

## 核心功能特色

1. **雙重影像辨識與嚴謹核對機制 (Dual Image Verification System)**
   - **影像品質檢測**：自動判斷模糊、反光、陰影、裁切或多題誤入。
   - **第一階段（Pass 1）**：忠實記錄題目全文、數學式、關鍵數字與幾何標註，絕不直接猜測答案。
   - **第二階段（Pass 2）**：獨立審核高風險易混淆符號（如 3 vs 8、正負號、次方、根號、幾何條件），若有歧義主動提示學生點選確認。
2. **啟發式家教引導模式（Guided Tutor Mode）**
   - 每次只問一個關鍵小問題或引導計算一步，不直接灌答案。
   - 答錯時提供三段階梯式提示（小提示 → 強提示 → 詳細解說）。
3. **完整解析模式（Full Solution Mode）**
   - 清楚呈現「這題在考什麼」、「解題思維」、「分步驟算式」與「驗算檢查」。
   - 若超出國三課綱，明確標註並引導學生理解。
4. **「不懂」深入提問與「出一題讓我試試」**
   - 針對任何卡點步驟一對一白話詳解。
   - 自動生成同難度、同觀念的模擬練習題，並支援即時批改。

---

## 本地開發與啟動

### 1. 取得程式碼
從 GitHub clone 專案：
```bash
git clone <your-repository-url>
cd taiwan-grade9-math-tutor
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 設定環境變數
建立 `.env` 檔案並填入 Gemini API 金鑰：
```env
GEMINI_API_KEY="your-gemini-api-key"
```
*(你可以在 [Google AI Studio](https://aistudio.google.com/) 免費取得 API Key)*

### 4. 啟動開發伺服器
```bash
npm run dev
```
瀏覽器開啟 `http://localhost:3000` 即可開始使用！

---

## 技術堆疊
- **Frontend**：React 18、TypeScript、Tailwind CSS、Lucide Icons、Motion
- **Backend**：Node.js、Express、Vite 中介層
- **AI Engine**：Google Gemini API (`@google/genai`)
