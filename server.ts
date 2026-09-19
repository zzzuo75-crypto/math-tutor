import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for math problem photos
app.use(express.json({ limit: '25mb' }));

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Robust wrapper to call Gemini API with automatic exponential backoff retry
 * on transient 503 / 429 capacity spikes and seamless fallback across compliant models.
 * Order: primary (gemini-3.8-flash) -> gemini-flash-latest -> gemini-3.1-flash-lite
 */
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    model?: string;
    contents: any[];
    config?: any;
  }
) {
  const primaryModel = params.model || 'gemini-3.8-flash';
  // Allowed models from the gemini-api skill (standard free tier models)
  const modelsToTry = [
    primaryModel,
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: any = null;

  for (const model of uniqueModels) {
    // Retry up to 2 times per candidate model on transient errors (503, 429, UNAVAILABLE)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const status = err?.status || err?.code;
        const isTransient =
          status === 503 ||
          status === 429 ||
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('ResourceExhausted');

        if (!isTransient) {
          // Schema or validation error, throw immediately
          throw err;
        }

        console.warn(
          `[Gemini API] Temporary capacity spike on ${model} (attempt ${attempt + 1}/2): ${msg}. Retrying in ${600 * (attempt + 1)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
    console.warn(`[Gemini API] Switching to fallback model from ${model}...`);
  }

  throw lastError;
}

// ==========================================
// DUAL IMAGE VERIFICATION SYSTEM
// Pipeline:
// 1. Image Quality Check
// 2. PASS 1: Problem Extraction (Transcriber)
// 3. PASS 2: Independent Mathematical Verification (Verifier)
// 4. Comparison & Synthesis
// ==========================================

// PASS 1: Quality Check + Problem Extraction
app.post('/api/analyze-image/pass1', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: '請提供題目圖片' });
    }

    const ai = getAIClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const systemInstruction = `
你是一位嚴謹專業的台灣國中三年級數學題目辨識專家（角色：題目記錄員，PROBLEM TRANSCRIBER）。
你的任務包含兩個部分：
1. 【影像品質檢查 (Image Quality Check)】：
   - 仔細檢查：模糊度 (blur)、失焦 (focus)、光線亮度與反光 (lighting / glare)、陰影 (shadows)、畫面裁切 (cropping)、字體大小 (text size)、數學符號清晰度 (mathematical symbol visibility)。
   - 檢查整道題目是否完整可見（whether the entire problem is visible）。
   - 若為幾何題，檢查幾何圖形與標記是否完整。
   - 檢查是否包含「不只一道獨立題目」（例如同時拍到了第3題與第4題）。
   - 判定 image_quality："good"、"acceptable" 或 "poor"。
   - 若影像過於模糊、重要數字/符號無法可靠辨識、題目遭裁切、或幾何圖形關鍵角度長度看不清，can_continue 必須設為 false，並在 issues 清單中列出親切具體的繁體中文說明（例如：「照片有些模糊，符號筆劃不清晰」「題目右側算式被裁切掉了」「幾何圖的角度數字看不清楚」）。【絕不猜測】！
   - 若拍到了多道題目，multiple_questions_detected 設為 true，can_continue 設為 false，issues 加入「拍到了超過一道獨立題目」。

2. 【題目忠實謄寫 (PASS 1 Problem Extraction，僅在 can_continue 為 true 時)】：
   - 【絕對不可解題或給出答案】！
   - 忠實記錄題目全文 (question_text，保留台灣國中習慣之繁體中文與 LaTeX 數學表示法)。
   - 提取所有數學算式 (math_expressions)。
   - 提取高風險關鍵數學元素 (critical_values)：所有數字、正負符號 (+, -, ±, =, ≠, >, <, ≥, ≤)、分數 (分子與分母)、次方 (如 x²、x³)、根號 (如 √3)、小數點 (如 0.5、0.05)、百分比 (%)、角度 (如 60°、80°)、單位 (如 cm、cm²)、未知數 (x, y, a, b)。
   - 幾何圖形資訊：若有幾何圖，提取頂點 points、明確標註的角度 angles、邊長 lengths、題目或圖上明確標記的關係 relations (例如 AB = AC, DE ∥ BC)。
   - 幾何安全守則：【嚴禁憑目測臆測未明確標註的條件】（不得推測直角、平行、等長或中點）。
   - 若有任何字跡輕微不確定處，記入 uncertain_parts。
`;

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        {
          text: '請進行影像品質檢查與第一階段數學題目忠實謄寫。請回傳指定格式之 JSON。只記錄，不解題。',
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quality: {
              type: Type.OBJECT,
              properties: {
                image_quality: {
                  type: Type.STRING,
                  description: 'good, acceptable, 或 poor',
                },
                issues: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '若品質不佳，列出具體繁體中文原因',
                },
                can_continue: {
                  type: Type.BOOLEAN,
                  description: '是否清晰足以繼續進行精確數學辨識',
                },
                multiple_questions_detected: {
                  type: Type.BOOLEAN,
                  description: '是否拍到了超過一道獨立題目',
                },
              },
              required: ['image_quality', 'issues', 'can_continue', 'multiple_questions_detected'],
            },
            pass1: {
              type: Type.OBJECT,
              properties: {
                question_text: {
                  type: Type.STRING,
                  description: '忠實謄寫的完整題目內容',
                },
                math_expressions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '題目中的所有數學式與方程式',
                },
                critical_values: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '關鍵高風險數學符號與數字清單',
                },
                is_geometry: {
                  type: Type.BOOLEAN,
                  description: '是否為幾何題或含有圖形',
                },
                diagram_information: {
                  type: Type.OBJECT,
                  properties: {
                    points: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    angles: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          value: { type: Type.STRING },
                        },
                        required: ['name', 'value'],
                      },
                    },
                    lengths: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          segment: { type: Type.STRING },
                          value: { type: Type.STRING },
                        },
                        required: ['segment', 'value'],
                      },
                    },
                    relations: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
                uncertain_parts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                topic_hint: {
                  type: Type.STRING,
                  description: '所屬國三單元觀念（例如：一元二次方程式、相似形、圓形幾何、二次函數等）',
                },
              },
              required: ['question_text', 'math_expressions', 'critical_values', 'is_geometry', 'uncertain_parts'],
            },
          },
          required: ['quality'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in pass 1 analysis:', error);
    return res.status(500).json({
      error: '讀取題目時遇到問題，請稍候重試。',
      details: error?.message,
    });
  }
});

// PASS 2: Independent Mathematical Verification
app.post('/api/analyze-image/pass2', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', pass1 } = req.body;
    if (!imageBase64 || !pass1) {
      return res.status(400).json({ error: '缺少圖片或第一階段辨識資訊' });
    }

    const ai = getAIClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const systemInstruction = `
你是一位獨立且極度嚴謹的台灣國中三年級數學核對專家（角色：MATHEMATICAL VERIFIER，數學檢驗員）。
【你的核心職責是獨立審查原始照片中的每一個數學符號與數值，找出任何辨識錯誤或模糊之處，絕不盲目附和第一遍結果】！
【絕對不可在此解題】！

你將收到第一階段提取的候選題目資訊（Candidate Transcription）。請將其僅視為「待審核的草稿」，切勿假設它是對的！

【逐一檢驗清單 (Verification Checklist)】：
1. 每個數字 (0-9)，特別是極度容易混淆的字元：
   - 3 與 8
   - 1 與 7 或 /
   - 0 與 6 或 8
   - 5 與 6 或 3
2. 每個正負與運算符號：
   - + 與 - （包含加號橫豎不明顯、或負號漏掉）
   - ± 符號
   - = 與 ≠
   - >、<、≥、≤ 不等號
   - × 與 +
3. 每個指數次方：
   - x² 與 x（次方 2 是否被漏掉或誤認）
   - x³ 與 x²
   - 2⁵ 等
4. 每個分數：
   - 分子與分母個別是否正確？（如 1/3 與 1/8）
5. 每個根號：
   - √2, √3 與 √5
   - 根號涵蓋範圍長度（例如 √(x+1) 與 √x + 1）
6. 每個小數點：
   - 0.5 與 0.05（小數點是否微弱易漏或位置有異）
   - 5.05 與 5.5
7. 每個角度：
   - 30°, 45°, 60° 與 80°, 90°
8. 每個單位：
   - cm 與 cm²（平方單位是否清晰）
   - m, km, kg, %
9. 每個未知數與幾何標籤：
   - x, y, a, b
   - 頂點 A, B, C, D
10. 幾何圖形標記與關係：
   - 圖中明確標示的角度數值與線段長度
   - 等長符號、平行符號、垂直記號
   - 【禁止目測推斷】：未標記的直角不可當作直角，未標記的等長不可當作等長。

【判斷標準】：
- 若原圖中該數學符號在照片中完全無法看清且無從查證：verification_status 設為 "unreadable"，並在 unreadable_parts 填寫具體原因（如：「角度數值被反光遮蔽，完全無法判斷」）。
- 若原圖中某處字跡有歧義或與第一階段謄寫有分歧（例如看起來可能是 3 或 8，或是 x² 與 x，或是 + 與 -）：verification_status 設為 "needs_confirmation"，並在 disagreements 清楚記錄位置 location、pass_1 值、可能值 possible_value、原因 reason，並給出建議選項 suggested_options（例如 ["3", "8"]）。
- 只有當原圖的所有關鍵數學元素皆清晰明確、無分歧時，verification_status 方可為 "verified"。
`;

    const auditPrompt = `
請獨立審核原始圖片，逐一核對下列候選題目資訊（請找出可能辨識錯誤）：
【候選題目全文】：${pass1.question_text}
【候選數學式】：${JSON.stringify(pass1.math_expressions || [])}
【關鍵數值】：${JSON.stringify(pass1.critical_values || [])}
【幾何圖資訊】：${JSON.stringify(pass1.diagram_information || null)}

請依據原圖逐一檢查所有數字、運算符號、次方、根號、小數點、角度與單位，回傳審查結果 JSON。
`;

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        {
          text: auditPrompt,
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verification_status: {
              type: Type.STRING,
              description: 'verified, needs_confirmation, 或 unreadable',
            },
            verified_elements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '經雙重核對無誤的數學元素清單',
            },
            disagreements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  location: {
                    type: Type.STRING,
                    description: '分歧所在位置描述（例如：x 前面的數字、常數項、根號內的數字、指數次方）',
                  },
                  pass_1: {
                    type: Type.STRING,
                    description: '第一階段讀到的值',
                  },
                  possible_value: {
                    type: Type.STRING,
                    description: '第二階段檢驗員看到之可能正確值',
                  },
                  reason: {
                    type: Type.STRING,
                    description: '產生分歧或模糊的原因說明',
                  },
                  suggested_options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '提供給學生確認的選項（例如 ["3", "8"]）',
                  },
                },
                required: ['location', 'pass_1', 'possible_value', 'reason', 'suggested_options'],
              },
            },
            diagram_disagreements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  element: { type: Type.STRING },
                  pass_1_value: { type: Type.STRING },
                  verified_value: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  suggested_options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['element', 'pass_1_value', 'verified_value', 'reason', 'suggested_options'],
              },
            },
            unreadable_parts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['verification_status', 'verified_elements', 'disagreements'],
        },
      },
    });

    const pass2 = JSON.parse(response.text?.trim() || '{}');

    // Synthesize final verification payload
    const disagreements = pass2.disagreements || [];
    const diagramDisagreements = pass2.diagram_disagreements || [];
    const unreadableParts = pass2.unreadable_parts || [];
    const uncertainParts = [...(pass1.uncertain_parts || [])];

    let finalStatus: 'verified' | 'needs_confirmation' | 'unreadable' = 'verified';

    if (pass2.verification_status === 'unreadable' || unreadableParts.length > 0) {
      finalStatus = 'unreadable';
    } else if (
      pass2.verification_status === 'needs_confirmation' ||
      disagreements.length > 0 ||
      diagramDisagreements.length > 0 ||
      uncertainParts.length > 0
    ) {
      finalStatus = 'needs_confirmation';
    }

    // Build question_text with clear highlight placeholders if disagreements exist
    let questionText = pass1.question_text || '';
    let candidateQuestionText = pass1.question_text || '';

    // If there is a disagreement and the pass_1 value appears uniquely, we can flag it
    disagreements.forEach((d: any) => {
      uncertainParts.push(`${d.location}：可能是「${d.pass_1}」或「${d.possible_value}」(${d.reason})`);
    });

    const combinedResult = {
      verification_status: finalStatus,
      state: finalStatus === 'verified' ? 'IMAGE_REVIEW' : 'NEED_CLARIFICATION',
      confidence: finalStatus === 'verified' ? 'high' : finalStatus === 'needs_confirmation' ? 'medium' : 'low',
      question_text: questionText,
      candidate_question_text: candidateQuestionText,
      math_expressions: pass1.math_expressions || [],
      critical_values: pass1.critical_values || [],
      is_geometry: !!pass1.is_geometry,
      diagram_information: pass1.diagram_information,
      disagreements,
      diagram_disagreements: diagramDisagreements,
      verified_elements: pass2.verified_elements || [],
      uncertain_parts: uncertainParts,
      unreadable_reason: unreadableParts.length > 0 ? unreadableParts.join('；') : undefined,
      multiple_questions_detected: false,
      topic_hint: pass1.topic_hint || '國中三年級數學',
    };

    return res.json(combinedResult);
  } catch (error: any) {
    console.error('Error in pass 2 verification:', error);
    // Graceful degradation: If Pass 2 has an unexpected transient failure,
    // we still have Pass 1's extracted problem text! Let the student confirm the text.
    if (req.body?.pass1?.question_text) {
      const fallbackPass1 = req.body.pass1;
      return res.json({
        verification_status: 'needs_confirmation',
        state: 'IMAGE_REVIEW',
        confidence: 'medium',
        question_text: fallbackPass1.question_text || '',
        candidate_question_text: fallbackPass1.question_text || '',
        math_expressions: fallbackPass1.math_expressions || [],
        critical_values: fallbackPass1.critical_values || [],
        is_geometry: !!fallbackPass1.is_geometry,
        diagram_information: fallbackPass1.diagram_information,
        disagreements: [],
        diagram_disagreements: [],
        verified_elements: fallbackPass1.math_expressions || [],
        uncertain_parts: ['已為你載入第一階段辨識題目，解題前請親自核對題目數字與符號確認無誤。'],
        unreadable_reason: undefined,
        multiple_questions_detected: false,
        topic_hint: fallbackPass1.topic_hint || '國中三年級數學',
      });
    }

    return res.status(500).json({
      error: '符號核對時遇到問題，請稍候重試。',
      details: error?.message,
    });
  }
});

// Backward-compatible single endpoint that runs full pipeline if called directly
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: '請提供題目圖片' });
    }

    // Call Pass 1 internally
    const pass1Req = { body: { imageBase64, mimeType } } as any;
    let pass1Data: any = null;
    const pass1Res = {
      status: () => pass1Res,
      json: (data: any) => { pass1Data = data; },
    } as any;

    // Direct invocation logic for pass 1
    const ai = getAIClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Step 1: Pass 1
    const p1Response = await generateContentWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: [
        { inlineData: { mimeType, data: cleanBase64 } },
        { text: '請進行影像品質檢查與第一階段數學題目忠實謄寫。只辨識，不解題。' },
      ],
      config: {
        systemInstruction: `
你是一位嚴謹專業的台灣國中三年級數學題目記錄員 (PROBLEM TRANSCRIBER)。
1. 影像品質檢查 (Image Quality Check)：blur, focus, lighting, glare, shadows, cropping, text size, mathematical symbol visibility, whether entire problem is visible, whether geometry diagrams are complete, multiple separate questions.
   判定 image_quality: "good", "acceptable", "poor"。若品質差或無法辨識或被裁切，can_continue 設為 false，列出具體繁體中文 issues。若有多道題目，multiple_questions_detected 設為 true。
2. 題目謄寫 (PASS 1)：若 can_continue 為 true，謄寫完整題目 question_text、數學式 math_expressions、高風險數學元素 critical_values (數字、正負號、分數、次方、根號、小數點、角度、單位、未知數)、幾何資訊 diagram_information。嚴禁目測臆測未標示條件。
`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quality: {
              type: Type.OBJECT,
              properties: {
                image_quality: { type: Type.STRING },
                issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                can_continue: { type: Type.BOOLEAN },
                multiple_questions_detected: { type: Type.BOOLEAN },
              },
              required: ['image_quality', 'issues', 'can_continue', 'multiple_questions_detected'],
            },
            pass1: {
              type: Type.OBJECT,
              properties: {
                question_text: { type: Type.STRING },
                math_expressions: { type: Type.ARRAY, items: { type: Type.STRING } },
                critical_values: { type: Type.ARRAY, items: { type: Type.STRING } },
                is_geometry: { type: Type.BOOLEAN },
                diagram_information: {
                  type: Type.OBJECT,
                  properties: {
                    points: { type: Type.ARRAY, items: { type: Type.STRING } },
                    angles: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: { name: { type: Type.STRING }, value: { type: Type.STRING } },
                        required: ['name', 'value'],
                      },
                    },
                    lengths: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: { segment: { type: Type.STRING }, value: { type: Type.STRING } },
                        required: ['segment', 'value'],
                      },
                    },
                    relations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                },
                uncertain_parts: { type: Type.ARRAY, items: { type: Type.STRING } },
                topic_hint: { type: Type.STRING },
              },
              required: ['question_text', 'math_expressions', 'critical_values', 'is_geometry', 'uncertain_parts'],
            },
          },
          required: ['quality'],
        },
      },
    });

    const parsedP1 = JSON.parse(p1Response.text?.trim() || '{}');
    const quality = parsedP1.quality;

    if (!quality.can_continue || quality.image_quality === 'poor' || quality.multiple_questions_detected) {
      return res.json({
        verification_status: 'unreadable',
        quality,
        multiple_questions_detected: !!quality.multiple_questions_detected,
        state: 'NEED_CLARIFICATION',
        confidence: 'low',
        question_text: '',
        candidate_question_text: '',
        math_expressions: [],
        critical_values: [],
        is_geometry: false,
        disagreements: [],
        verified_elements: [],
        uncertain_parts: quality.issues || ['照片品質無法辨識'],
        unreadable_reason: (quality.issues || []).join('；'),
      });
    }

    const pass1 = parsedP1.pass1;

    // Step 2: Pass 2 Independent Mathematical Verification
    let pass2: any = { verification_status: 'verified', verified_elements: [], disagreements: [] };
    try {
      const p2Response = await generateContentWithFallback(ai, {
        model: 'gemini-3.8-flash',
        contents: [
          { inlineData: { mimeType, data: cleanBase64 } },
          {
            text: `請獨立審查原始圖片，逐一核對候選內容並找出錯誤：\n${JSON.stringify(pass1)}`,
          },
        ],
        config: {
          systemInstruction: `
你是一位獨立的台灣國中三年級數學核對專家（MATHEMATICAL VERIFIER）。
獨立比對原圖與候選內容，檢查數字 (3 vs 8, 1 vs 7)、正負號 (+ vs -)、指數 (x² vs x)、分數 (1/3 vs 1/8)、根號 (√3 vs √5)、小數點 (0.5 vs 0.05)、角度 (60° vs 80°)、單位 (cm vs cm²)、幾何標註。
若有任何分歧或模糊，verification_status 設為 "needs_confirmation"，並在 disagreements 給出 location, pass_1, possible_value, reason, suggested_options。
若清晰相符且無誤，設為 "verified"。若無法辨認，設為 "unreadable"。
`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verification_status: { type: Type.STRING },
              verified_elements: { type: Type.ARRAY, items: { type: Type.STRING } },
              disagreements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    location: { type: Type.STRING },
                    pass_1: { type: Type.STRING },
                    possible_value: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    suggested_options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['location', 'pass_1', 'possible_value', 'reason', 'suggested_options'],
                },
              },
              diagram_disagreements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    element: { type: Type.STRING },
                    pass_1_value: { type: Type.STRING },
                    verified_value: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    suggested_options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['element', 'pass_1_value', 'verified_value', 'reason', 'suggested_options'],
                },
              },
              unreadable_parts: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['verification_status', 'verified_elements', 'disagreements'],
          },
        },
      });

      pass2 = JSON.parse(p2Response.text?.trim() || '{}');
    } catch (p2Err) {
      console.warn('Pass 2 encountered error, gracefully continuing with Pass 1 candidate data:', p2Err);
      pass2 = {
        verification_status: 'needs_confirmation',
        verified_elements: pass1.math_expressions || [],
        disagreements: [],
      };
    }
    const disagreements = pass2.disagreements || [];
    const diagramDisagreements = pass2.diagram_disagreements || [];
    const unreadableParts = pass2.unreadable_parts || [];
    const uncertainParts = [...(pass1.uncertain_parts || [])];

    let finalStatus: 'verified' | 'needs_confirmation' | 'unreadable' = 'verified';
    if (pass2.verification_status === 'unreadable' || unreadableParts.length > 0) {
      finalStatus = 'unreadable';
    } else if (
      pass2.verification_status === 'needs_confirmation' ||
      disagreements.length > 0 ||
      diagramDisagreements.length > 0 ||
      uncertainParts.length > 0
    ) {
      finalStatus = 'needs_confirmation';
    }

    disagreements.forEach((d: any) => {
      uncertainParts.push(`${d.location}：可能是「${d.pass_1}」或「${d.possible_value}」(${d.reason})`);
    });

    return res.json({
      verification_status: finalStatus,
      state: finalStatus === 'verified' ? 'IMAGE_REVIEW' : 'NEED_CLARIFICATION',
      confidence: finalStatus === 'verified' ? 'high' : finalStatus === 'needs_confirmation' ? 'medium' : 'low',
      quality,
      question_text: pass1.question_text || '',
      candidate_question_text: pass1.question_text || '',
      math_expressions: pass1.math_expressions || [],
      critical_values: pass1.critical_values || [],
      is_geometry: !!pass1.is_geometry,
      diagram_information: pass1.diagram_information,
      disagreements,
      diagram_disagreements: diagramDisagreements,
      verified_elements: pass2.verified_elements || [],
      uncertain_parts: uncertainParts,
      unreadable_reason: unreadableParts.length > 0 ? unreadableParts.join('；') : undefined,
      multiple_questions_detected: false,
      topic_hint: pass1.topic_hint || '國中三年級數學',
    });
  } catch (error: any) {
    console.error('Error in analyze-image pipeline:', error);
    return res.status(500).json({
      error: '剛剛辨識題目時遇到問題，請稍候重試。',
      details: error?.message,
    });
  }
});

// 2. Guided Tutor Interaction - Step by step pedagogical coach
app.post('/api/guided-tutor', async (req, res) => {
  try {
    const {
      question_text,
      history = [],
      current_step = 1,
      attempt = 1,
      student_input,
    } = req.body;

    if (!question_text) {
      return res.status(400).json({ error: '缺少題目內容' });
    }

    const ai = getAIClient();

    const systemInstruction = `
你是一位耐心、溫和且教學經驗豐富的台灣國中三年級（國三）數學家教老師。
你正在使用「帶我一步一步做」（Guided Tutor）模式指導學生。

【核心教學原則】：
1. 絕不一次給出全部解答！你的目標是啟發學生，讓學生自己動腦算出關鍵答案。
2. 每次對話「只問一個清楚具體的小問題」或要求算一步。
3. 使用台灣國中生熟悉的語言、術語與符號（如：因式分解、十字符號、公式解、配方法、對稱軸、相似三角形對應邊成比例、圓周角與圓心角等）。
4. 第一輪對話（student_input 為空或第一次開始時）：
   - 先用 1-2 句話簡短說明「這題主要在考什麼觀念？」（例如：「這題主要在考一元二次方程式的十字交乘法因式分解。」）
   - 接著提出第 1 個引導問題（例如：「我們先想想看：有哪兩個整數，相乘是 6，相加剛好是 -5？」）
5. 學生回答時的處理機制：
   A. 學生回答正確：
      - 明確給予肯定，並簡短說明為什麼正確（例如：「沒錯！-2 和 -3 相乘是 6，相加是 -5。」）
      - 若還有下一步，進展到下一步並問下一個問題（例如：「所以方程式可以改寫成 (x - 2)(x - 3) = 0。接下來想想看，兩個數相乘等於 0，代表什麼？」）
      - 若這已經是最後一步且題目完全解開，給予結語總結，將 is_complete 設為 true。
   B. 學生回答錯誤（漸進式提示）：
      - 絕不只說「錯了」！
      - 第 1 次答錯（attempt = 1）：給予「小提示」（Small hint），提醒他注意某個特定檢查點（如正負號或運算順序）。
      - 第 2 次答錯（attempt = 2）：給予「強提示」（Stronger hint），縮小推理範圍。
      - 第 3 次或仍然答錯（attempt >= 3）：詳細解釋當前這一小步的正確做法與本步答案，不要讓學生卡死，然後自然銜接到下一步。
   C. 學生說「不知道」、「不會」、「卡住了」：
      - 溫和體諒，不要逼他猜，給予一個溫柔的啟發性提示（小提示）。若再次說不知道，逐步加深提示。
   D. 學生明確要求「直接告訴我答案」/「只要答案」/「不用解釋」：
      - 尊重學生意願，直接給出最終答案，並標記 direct_answer_revealed: true，同時親切加上一句：「如果你想知道怎麼算，我可以隨時再帶你一步一步做喔！」is_complete 設為 true。
6. 輸出必須為 JSON 格式。
`;

    const promptPayload = {
      question_text,
      current_step,
      attempt,
      student_input: student_input || null,
      history,
    };

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: [
        {
          text: `請根據學生現況進行家教引導。上下文資訊：\n${JSON.stringify(promptPayload, null, 2)}`,
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            teacher_message: {
              type: Type.STRING,
              description: '老師給學生的引導說明、肯定或提示話語，含這一步問學生的問題',
            },
            current_step: {
              type: Type.INTEGER,
              description: '當前所在步驟編號（從 1 開始）',
            },
            attempt: {
              type: Type.INTEGER,
              description: '針對當前步驟學生的嘗試次數',
            },
            hint_level: {
              type: Type.INTEGER,
              description: '目前提示等級：0(正常提問), 1(小提示), 2(強提示), 3(公佈此步答案)',
            },
            student_answer_correct: {
              type: Type.BOOLEAN,
              description: '若學生有回答，該回答是否正確',
            },
            waiting_for_student: {
              type: Type.BOOLEAN,
              description: '是否正在等待學生輸入下一句回答',
            },
            is_complete: {
              type: Type.BOOLEAN,
              description: '整道題目是否已經完整引導完畢',
            },
            concept_introduction: {
              type: Type.STRING,
              description: '題目主要觀念說明（初次開始時提供）',
            },
            direct_answer_revealed: {
              type: Type.BOOLEAN,
              description: '是否因為學生要求而直接揭曉答案',
            },
            encouragement: {
              type: Type.STRING,
              description: '自然親切的鼓勵小語（不過度吹捧）',
            },
          },
          required: ['teacher_message', 'current_step', 'attempt', 'hint_level', 'waiting_for_student', 'is_complete'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in guided tutor:', error);
    return res.status(500).json({
      error: '老師剛剛思考時遇到了小問題，請再試一次。',
      details: error?.message,
    });
  }
});

// 3. Full Solution - Complete structured pedagogical breakdown
app.post('/api/full-solution', async (req, res) => {
  try {
    const { question_text, imageDetails } = req.body;
    if (!question_text) {
      return res.status(400).json({ error: '缺少題目內容' });
    }

    const ai = getAIClient();

    const systemInstruction = `
你是一位教學嚴謹、親切的台灣國中三年級數學老師。
請為這道題目製作【直接看完整解析】（Full Solution）。

結構必須嚴格包含以下六大區塊：
1. 【這題在考什麼？】：用 1～3 句話說明核心單元觀念與考核重點。
2. 【解題思路】：清楚解釋「為什麼選擇這個解題方向與公式」，幫助學生建立直覺。
3. 【解題步驟】：分步驟（Step 1, Step 2, ...）條理呈現。每一步均包含精準數學運算式（使用乾淨 LaTeX 或標準數學符號）以及平易近人的正體中文說明。不可無故拆解過多零碎步驟，但關鍵推導不可跳步。
4. 【答案】：醒目、明確的最終答案（附帶正確單位或所有合理解）。
5. 【檢查】：驗算環節（例如：將答案代回原方程式檢驗、檢查幾何邊長是否大於0、檢查分母是否不為0、排除不合解、檢查單位等）。
6. 【這題你要記住】：1～3 點關鍵心得或考試常見陷阱提醒。

【程度判斷特別規則】：
- 若題目超出台灣國三數學課綱（如涉及微積分、高次方根、高二三角函數和角公式等）：
  - 絕對不拒絕解題！
  - 必須將 is_above_grade9 設為 true。
  - 在 above_grade9_note 中明確寫出：「這題已經超出一般國三數學的範圍，會用到＿＿＿的概念。」
  - 並清晰區分「國三已經學過的觀念」與「高中之後才會正式學到的觀念」，盡量用國三能理解的基礎邏輯推導。

【數學正確性最高指導原則】：
- 輸出前內部反覆驗算，確保正負號、分數約分、開根號正負符號、幾何比例無任何疏漏。
`;

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: [
        {
          text: `請為以下數學題目生成完整解析：\n題目：${question_text}\n${imageDetails ? `幾何/附圖補充：${imageDetails}` : ''}`,
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: {
              type: Type.STRING,
              description: '這題在考什麼？（1～3 句說明核心概念）',
            },
            thinking: {
              type: Type.STRING,
              description: '解題思路（為什麼用這個方法解）',
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step_number: { type: Type.INTEGER },
                  title: { type: Type.STRING, description: '步驟標題，如：第一步：展開並整理方程式' },
                  math: { type: Type.STRING, description: '核心數學算式' },
                  explanation: { type: Type.STRING, description: '該步驟的通俗中文原理說明' },
                },
                required: ['step_number', 'title', 'math', 'explanation'],
              },
            },
            final_answer: {
              type: Type.STRING,
              description: '最終答案（清楚完整標明）',
            },
            verification: {
              type: Type.STRING,
              description: '檢查與驗算說明',
            },
            takeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '這題你要記住（1～3 點核心重點或避坑指南）',
            },
            is_above_grade9: {
              type: Type.BOOLEAN,
              description: '是否超出一般國三課綱範圍',
            },
            above_grade9_note: {
              type: Type.STRING,
              description: '超綱概念說明與國中/高中銜接區隔',
            },
          },
          required: ['topic', 'thinking', 'steps', 'final_answer', 'verification', 'takeaways', 'is_above_grade9'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating full solution:', error);
    return res.status(500).json({
      error: '正在整理題目解析時發生錯誤，請再試一次。',
      details: error?.message,
    });
  }
});

// 4. Step Clarification - For "有一步不懂"
app.post('/api/explain-step', async (req, res) => {
  try {
    const { question_text, student_confusion, solution_summary } = req.body;
    if (!student_confusion) {
      return res.status(400).json({ error: '請告訴老師哪一步不懂' });
    }

    const ai = getAIClient();

    const systemInstruction = `
你是一位溫暖耐心的台灣國中數學老師。
學生剛看完題目的解法，但在其中某個步驟卡住了，提出了他的困惑：「${student_confusion}」。

【教學原則】：
1. 針對學生卡住的點「精準解惑」，【不要把整題從頭唸一遍】！
2. 用更生活化、更直觀的比喻或拆成兩三個極小步來解釋「為什麼可以這樣做」。
3. 使用台灣正體中文，語氣親切有鼓勵性，如同下課後一對一站在講桌旁講解。
4. 解釋完後，出一個極簡單的直觀小提問，確認他有沒有豁然開朗。
`;

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: [
        {
          text: `原題目：${question_text}\n解題脈絡：${solution_summary || ''}\n學生的卡點或疑問：${student_confusion}\n請進行重點式深入解說。`,
        },
      ],
      config: {
        systemInstruction,
      },
    });

    return res.json({ explanation: response.text });
  } catch (error: any) {
    console.error('Error explaining step:', error);
    return res.status(500).json({
      error: '老師思考解說時遇到小問題，請再試一次。',
      details: error?.message,
    });
  }
});

// 5. Practice Problem Generator - For "出一題讓我試試"
app.post('/api/practice-problem', async (req, res) => {
  try {
    const { question_text, concept } = req.body;
    const ai = getAIClient();

    const systemInstruction = `
你是一位台灣國中三年級數學老師。學生希望能「出一題讓我試試」，自主檢驗學習成效。
請出一道同概念的練習題：
1. 考核完全相同的核心數學觀念（如：一元二次方程式因式分解、配方法、相似形邊長比等）。
2. 難度相當，適合台灣國中三年級學生。
3. 改變數字或情境，避免完全一樣。
4. 【不要在題目中直接露出答案】！
5. 必須回傳 JSON 格式。
`;

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: [
        {
          text: `原題目：${question_text}\n主要觀念：${concept || '國三數學'}\n請出 1 題類似練習題供學生練習。`,
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            problem_text: {
              type: Type.STRING,
              description: '類似練習題的完整題目描述',
            },
            concept: {
              type: Type.STRING,
              description: '本題考核的數學觀念名稱',
            },
            hint: {
              type: Type.STRING,
              description: '第一層啟發性提示（先不透露答案）',
            },
            reference_answer: {
              type: Type.STRING,
              description: '正確答案（僅供後端校對使用）',
            },
          },
          required: ['problem_text', 'concept', 'hint', 'reference_answer'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating practice problem:', error);
    return res.status(500).json({
      error: '生成練習題時遇到問題，請再試一次。',
      details: error?.message,
    });
  }
});

// 6. Check Practice Answer
app.post('/api/check-practice', async (req, res) => {
  try {
    const { problem_text, student_answer, attempt = 1 } = req.body;
    if (!student_answer) {
      return res.status(400).json({ error: '請輸入你的計算答案' });
    }

    const ai = getAIClient();

    const systemInstruction = `
你是一位台灣國中數學老師。學生正在回答類似練習題。
題目：${problem_text}
學生作答：${student_answer}
這是學生的第 ${attempt} 次嘗試。

規則：
1. 嚴格檢驗學生答案是否正確（考慮等價形式，如分數約分、根式化簡、符號順序等）。
2. 若回答正確：熱情肯定，簡短總結為什麼算對。is_correct = true。
3. 若回答錯誤：
   - attempt = 1：給予溫和的小提示，引導他檢查哪裡可能算錯。
   - attempt = 2：給出更具體的解題提示。
   - attempt >= 3：解釋正確算式與答案，並給予鼓勵。
`;

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: [
        {
          text: '請批改學生的練習題答案並給予家教回饋。',
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_correct: {
              type: Type.BOOLEAN,
              description: '學生作答是否正確',
            },
            teacher_message: {
              type: Type.STRING,
              description: '老師的評語或提示',
            },
            hint_level: {
              type: Type.INTEGER,
              description: '提示等級 (1=小提示, 2=強提示, 3=公布完整詳解)',
            },
            explained_answer: {
              type: Type.STRING,
              description: '若已達第3次答錯或正確時，提供完整詳解與答案',
            },
          },
          required: ['is_correct', 'teacher_message', 'hint_level'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error checking practice answer:', error);
    return res.status(500).json({
      error: '批改時遇到問題，請再試一次。',
      details: error?.message,
    });
  }
});

// Vite middleware and static serving
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Math Tutor server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
