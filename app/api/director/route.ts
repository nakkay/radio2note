import { Anthropic } from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

interface Message {
  role: "user" | "assistant";
  content: string;
}

// 固有名詞を抽出する（アニメ、映画、場所、人名など）
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  
  // カギ括弧内のテキストを抽出
  const bracketMatches = text.match(/[「『](.*?)[」』]/g);
  if (bracketMatches) {
    bracketMatches.forEach(match => {
      keywords.push(match.replace(/[「『」』]/g, ""));
    });
  }
  
  // カタカナ語を抽出（3文字以上）
  const katakanaMatches = text.match(/[ァ-ヶー]{3,}/g);
  if (katakanaMatches) {
    katakanaMatches.forEach(match => {
      if (!keywords.includes(match)) {
        keywords.push(match);
      }
    });
  }
  
  return keywords.slice(0, 3); // 最大3つ
}

// Google検索でネタを取得（Gemini with Grounding）
async function searchGrounding(query: string): Promise<string | null> {
  try {
    const result = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `「${query}」について、会話のネタになる面白い情報を1〜2文で教えて。`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    const text = result.text;
    return text || null;
  } catch (error) {
    console.error("Grounding search failed:", error);
    return null;
  }
}

// 番組構成（起承転結）
interface Chapter {
  id: number;
  name: string;
  label: string;
  goals: string[];
  transitionSignals: string[];
}

const CHAPTERS: Chapter[] = [
  {
    id: 1,
    name: "起",
    label: "導入・アイスブレイク",
    goals: [
      "ゲストをリラックスさせる",
      "テーマへの入り口を作る",
      "ゲストが話し始めるきっかけを与える",
    ],
    transitionSignals: [
      "ゲストがテーマについて話し始めた",
      "具体的なエピソードや体験が出てきた",
      "ゲストがリラックスして話している",
    ],
  },
  {
    id: 2,
    name: "承",
    label: "深掘り・きっかけ",
    goals: [
      "きっかけや背景を深く掘り下げる",
      "感情や動機を引き出す",
      "「なぜ」を繰り返し聞く",
    ],
    transitionSignals: [
      "きっかけや動機が明確になった",
      "感情的なエピソードが出てきた",
      "ゲストの価値観が見えてきた",
    ],
  },
  {
    id: 3,
    name: "転",
    label: "発見・転換点",
    goals: [
      "意外な発見や転換点を引き出す",
      "「やってみてわかったこと」を聞く",
      "失敗談や苦労話を引き出す",
    ],
    transitionSignals: [
      "具体的な学びや発見が語られた",
      "失敗から得た教訓が出てきた",
      "話が一区切りついた感がある",
    ],
  },
  {
    id: 4,
    name: "結",
    label: "まとめ・締め",
    goals: [
      "話をまとめる",
      "これから始める人へのアドバイスを聞く",
      "気持ちよく終わる",
    ],
    transitionSignals: [
      "完了 - これ以上進まない",
    ],
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationHistory, theme, memo, mcId, currentChapter = 1 } = body;

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: "Conversation history is required" },
        { status: 400 }
      );
    }

    // 会話履歴が少ない場合はスキップ
    if (conversationHistory.length < 2) {
      return NextResponse.json({ 
        instruction: null,
        shouldAdvanceChapter: false,
        currentChapter,
      });
    }

    // 1. Grounding：直近のユーザー発言から固有名詞を抽出してネタを取得
    const recentUserMessages = conversationHistory
      .filter((msg: Message) => msg.role === "user")
      .slice(-3);
    
    let groundingInfo = "";
    for (const msg of recentUserMessages) {
      const keywords = extractKeywords(msg.content);
      for (const keyword of keywords) {
        const info = await searchGrounding(keyword);
        if (info) {
          groundingInfo += `\n[ネタ] 「${keyword}」について: ${info}`;
        }
      }
    }

    // 2. 会話履歴をテキストに変換
    const conversationText = conversationHistory
      .map((msg: Message, idx: number) => {
        const speaker = msg.role === "user" ? "ゲスト" : "MC";
        return `${idx + 1}. ${speaker}: ${msg.content}`;
      })
      .join("\n");

    // 3. 現在のチャプター情報
    const chapter = CHAPTERS.find(c => c.id === currentChapter) || CHAPTERS[0];
    const nextChapter = CHAPTERS.find(c => c.id === currentChapter + 1);

    // 会話の流れを分析（最近の会話の傾向を把握）
    const recentMessages = conversationHistory.slice(-6);
    const userMessages = recentMessages.filter((msg: Message) => msg.role === "user");
    const mcMessages = recentMessages.filter((msg: Message) => msg.role === "assistant");
    
    // 会話の分析
    const conversationAnalysis = {
      userMessageCount: userMessages.length,
      mcMessageCount: mcMessages.length,
      recentTopics: userMessages.map(m => {
        // キーワード抽出（簡易版）
        const words = m.content.split(/[。、！？\s]/).filter(w => w.length > 2);
        return words.slice(0, 3).join(" ");
      }).filter(Boolean),
      isLooping: userMessages.length >= 3 && 
        userMessages.slice(-3).some((msg, i) => 
          i > 0 && msg.content.length < 50 && 
          userMessages[i - 1].content.length < 50
        ), // 短い発言が続いている = ループの可能性
      needsDeeperDive: userMessages.some(msg => 
        msg.content.length > 100 && 
        !msg.content.includes("？") && 
        !msg.content.includes("?")
      ), // 長い発言があるが質問がない = 深掘りが必要
    };

    // 4. ディレクター判断（Claude Sonnet 4 - 速度と精度のバランス）
    const systemPrompt = `あなたはラジオ番組の敏腕ディレクター兼放送作家です。
MCとゲストの会話をリアルタイムで監視し、積極的に介入して番組を面白くします。

【あなたの役割】
1. **積極的な深掘り指示**: ゲストが面白そうな話をしたら、すぐに「それについてもっと聞いて」と指示
2. **軌道修正**: 話が脱線したらテーマに戻すよう指示
3. **話題提供**: 検索で得た情報をMCに伝え、知ったかぶりさせる
4. **チャプター進行**: 会話の流れから次のチャプターに進むべきか判断

【今日のテーマ】
${theme}

${memo ? `【特に拾ってほしいポイント】\n${memo}` : ""}

【現在のチャプター】
${chapter.name}「${chapter.label}」

【このチャプターのゴール】
${chapter.goals.map(g => `- ${g}`).join("\n")}

【次のチャプターへ進むシグナル】
${chapter.transitionSignals.map(s => `- ${s}`).join("\n")}

${nextChapter ? `【次のチャプター】\n${nextChapter.name}「${nextChapter.label}」\nゴール:\n${nextChapter.goals.map(g => `- ${g}`).join("\n")}` : "【注意】これが最後のチャプターです。締めに入ってください。"}

${groundingInfo ? `\n【放送作家からのネタ提供】${groundingInfo}\nこの情報をMCに伝えて、会話に活用させてください。` : ""}

【MC情報】
${mcId === "hikaru" ? "ヒカル: 鋭いツッコミと深掘りが得意。ストレートな質問で核心を突く。指示は「それについてもっと聞いて」「具体的には？」「なぜそう思ったの？」など具体的に。" : ""}
${mcId === "waka" ? "ワカ: 論理的な質問と自己分析的な話し方。構造的に話を整理する。指示は「どう考えてんの？」「それってさ、」で始まる質問を促す。" : ""}
${mcId === "kono" ? "コノ: 共感力が高く、聞き上手。感情に寄り添いながら引き出す。指示は「どんな気持ちだった？」「それでどうなった？」など感情を引き出す質問を。" : ""}

【会話の分析】
- 最近のゲスト発言数: ${conversationAnalysis.userMessageCount}回
- 最近のMC発言数: ${conversationAnalysis.mcMessageCount}回
- 最近の話題: ${conversationAnalysis.recentTopics.join(", ") || "なし"}
- ループの可能性: ${conversationAnalysis.isLooping ? "あり（同じ話題で回っている）" : "なし"}
- 深掘りが必要: ${conversationAnalysis.needsDeeperDive ? "あり（長い発言があるが深掘りされていない）" : "なし"}

【指示の出し方 - 重要】
以下のような具体的で実行可能な指示を出してください：

良い例：
- "ゲストが「〇〇が大変だった」と言った。具体的にどんなことが大変だったのか、エピソードを聞いて"
- "ゲストが「〇〇を始めた」と言った。きっかけは何だったのか、なぜ始めたのか深掘りして"
- "話が抽象的になっている。具体的なエピソードや体験談を聞いて"
- "ゲストが感情的な言葉（「嬉しかった」「辛かった」など）を使った。その時の気持ちをもっと聞いて"
- "ネタ情報「〇〇について...」がある。これを会話に自然に織り交ぜて、ゲストの話と関連付けて"

悪い例：
- "もっと深掘りして"（抽象的すぎる）
- "会話を続けて"（何をすべきか不明確）
- "質問して"（どんな質問か不明確）

【出力形式 - 必ずJSON形式で返答】
{
  "shouldAdvanceChapter": true/false,  // 次のチャプターに進むべきか
  "advanceReason": "進む理由（shouldAdvanceChapterがtrueの場合のみ）",
  "instruction": "MCへの具体的で実行可能な指示（2〜3文、必ず具体的な質問内容や深掘りポイントを指定）",
  "groundingTip": "ネタがあれば活用方法のヒント（なければnull）",
  "notableQuote": "ゲストの発言で記事に使えそうな印象的なフレーズ（20〜50文字、なければnull）"
}

【引用抽出の基準】
- ゲストの具体的な体験談
- 感情が込められた発言（「嬉しかった」「辛かった」など）
- 独自の視点や気づき
- 印象的な比喩表現
- 核心を突いた一言
※MCの発言は抽出しない。ゲストの発言のみ。

【判断基準】
- チャプターを進める条件:
  - ゴールが概ね達成された
  - 同じ話題でループし始めた（5発言以上同じ話題）
  - ゲストが次の話題を求めているサインがある
  - 6発言以上続いた（各チャプターは4-8発言が目安）
- チャプターを維持する条件:
  - まだ核心に迫っていない
  - 面白いエピソードが展開中
  - 深掘りがまだ足りない

【重要ルール】
1. **必ず具体的な指示を出す**: 「それについてもっと聞いて」ではなく「〇〇について、具体的にどんなことがあったのか聞いて」
2. **積極的に介入**: ゲストが面白そうな話をしたら、すぐに深掘り指示を出す
3. **番組をダレさせない**: 同じ話題で3発言以上続いたら、深掘り指示か次の話題への移行を検討
4. **ネタは必ず活用**: groundingInfoがある場合は、必ずinstructionに含める
5. 「結」のチャプターでは shouldAdvanceChapter は常に false
6. **指示は常に出す**: 会話が順調でも、次の深掘りポイントや話題提供の指示を出す`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", // 速度と精度のバランス
      max_tokens: 800, // より詳細な指示を出すために増やす
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `以下の会話を分析し、MCへの具体的で実行可能な指示を出してください。必ずJSON形式で返答してください。

【会話ログ（${conversationHistory.length}発言）】
${conversationText}

【分析ポイント】
- ゲストの最近の発言で、深掘りできそうなポイントは？
- 話がループしていないか？
- テーマから脱線していないか？
- ネタ情報を活用できるタイミングは？

上記を踏まえて、MCへの具体的な指示（instruction）を必ず出してください。`,
        },
      ],
    });

    const responseText = message.content[0];
    const text = responseText.type === "text" ? responseText.text : "";
    
    // JSONをパース
    let result;
    try {
      // JSON部分を抽出（```json ... ``` で囲まれている場合にも対応）
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse director response:", text);
      return NextResponse.json({ 
        instruction: null,
        shouldAdvanceChapter: false,
        currentChapter,
      });
    }

    console.log("📋 ディレクター判断:", result);

    // 最終チャプター（結）の場合は、AIがtrueを返しても強制的にfalseにする
    const canAdvance = result.shouldAdvanceChapter && nextChapter != null;

    return NextResponse.json({
      instruction: result.instruction || null,
      shouldAdvanceChapter: canAdvance,
      advanceReason: canAdvance ? (result.advanceReason || null) : null,
      groundingTip: result.groundingTip || null,
      notableQuote: result.notableQuote || null,
      currentChapter: canAdvance ? currentChapter + 1 : currentChapter,
      chapterInfo: canAdvance ? {
        name: nextChapter.name,
        label: nextChapter.label,
      } : null,
    });
  } catch (error: unknown) {
    console.error("Director API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to get director instruction";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
