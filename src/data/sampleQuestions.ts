import { DisagreementItem, DiagramInfo } from '../types';

export interface SampleQuestion {
  id: string;
  title: string;
  category: string;
  question_text: string;
  mockImageDescription: string;
  svgPreview: string;
  mockDisagreements?: DisagreementItem[];
  mockDiagramInfo?: DiagramInfo;
}

export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    id: 'quad-1',
    title: '一元二次方程式（十字交乘法）',
    category: '代數',
    question_text: '求一元二次方程式 $x^2 - 5x + 6 = 0$ 的所有解。',
    mockImageDescription: '手寫數學筆記：x² - 5x + 6 = 0',
    svgPreview: 'x² - 5x + 6 = 0',
  },
  {
    id: 'disagreement-demo',
    title: '雙重檢驗範例：數字辨識分歧（3 與 8）',
    category: '代數（辨識核對）',
    question_text: '已知 $3x + 5 = 29$，求 $x$ 的值。',
    mockImageDescription: '字跡手寫：3x + 5 = 29，筆劃首位易與 8 混淆',
    svgPreview: '3x + 5 = 29',
    mockDisagreements: [
      {
        location: 'x 前面的係數',
        pass_1: '3',
        possible_value: '8',
        reason: '原圖手寫字跡上方筆畫微連，可能是 3 也可能是 8。',
        suggested_options: ['3', '8'],
      },
    ],
  },
  {
    id: 'geom-similarity',
    title: '相似三角形與平行線段比',
    category: '幾何',
    question_text: '如圖，在 $\\triangle ABC$ 中，$D$、$E$ 分別在 $\\overline{AB}$、$\\overline{AC}$ 上，且 $\\overline{DE} \\parallel \\overline{BC}$。若 $\\overline{AD} = 4$，$\\overline{DB} = 6$，$\\overline{DE} = 6$，求 $\\overline{BC}$ 的長度。',
    mockImageDescription: '幾何題：三角形 ABC，DE 平行 BC，已知邊長求 BC',
    svgPreview: '△ABC, DE ∥ BC',
    mockDiagramInfo: {
      points: ['A', 'B', 'C', 'D', 'E'],
      angles: [],
      lengths: [
        { segment: 'AD', value: '4' },
        { segment: 'DB', value: '6' },
        { segment: 'DE', value: '6' },
      ],
      relations: ['DE ∥ BC', 'D 在 AB 上', 'E 在 AC 上'],
    },
  },
  {
    id: 'circle-angle',
    title: '圓周角與圓心角定理',
    category: '圓形幾何',
    question_text: '設點 $O$ 為圓心，$A$、$B$、$C$ 為圓周上的三點。若圓心角 $\\angle AOB = 110^\\circ$，求弦切所對圓周角 $\\angle ACB$ 的度數。',
    mockImageDescription: '圓形圖形：已知圓心角 ∠AOB = 110°，求圓周角 ∠ACB',
    svgPreview: '圓O, ∠AOB = 110°',
    mockDiagramInfo: {
      points: ['O', 'A', 'B', 'C'],
      angles: [{ name: 'AOB', value: '110°' }],
      lengths: [],
      relations: ['O 為圓心', 'A, B, C 在圓周上'],
    },
  },
  {
    id: 'quad-complete-square',
    title: '配方法求二次函數極值',
    category: '二次函數',
    question_text: '已知二次函數 $y = -2x^2 + 8x - 3$，求該函數的對稱軸方程式與最大值。',
    mockImageDescription: '二次函數：y = -2x² + 8x - 3 求頂點坐標與極值',
    svgPreview: 'y = -2x² + 8x - 3',
  },
];
