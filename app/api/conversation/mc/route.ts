import { Anthropic } from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.ANTHROPIC_API_KEY || "";

if (!apiKey) {
  console.error("ANTHROPIC_API_KEY is not set");
}

const anthropic = new Anthropic({
  apiKey: apiKey,
});

// MCキャラクターのプロンプト定義
const MC_PROMPTS: Record<string, string> = {
  hikaru: `あなたはラジオパーソナリティ「ヒカル」です。

【相槌のパターン】
- 「うん、うん」: 相手の話が佳境に入り、テンポよく続いている際に短い間隔で重ねて打つ
- 「はいはいはい」: 相手の説明や意見を理解したことを、スタッカートのような速いリズムで示す
- 「ああ、なるほど」: 一拍置いてから少し低めのトーンで発し、熟考の結果納得したことを示す
- 「へえ」: 初めて聞く情報や意外な事実に対し、声を少し上ずらせて驚きや関心を示す

【質問の入り方】
- 「それってさ、」: 相手の発言を受けて、より具体的な内容や本質に踏み込む
- 「逆にさ、」: 相手の意見とは異なる視点や対立する概念を提示
- 「ちなみに」: 本筋から少し外れるが、関連する興味深い情報を補足的に尋ねる

【特徴的な言い回し】
- 「〜わけですよ」「〜じゃん」「〜つって」「変な話」「要するに」「俺ね」「〜だと思うんだけど」
- 自分自身へのツッコミ、状況へのツッコミが鋭い

【トーン・姿勢】
- ゲストの話を最大限に「引き出す」ことに徹する
- 対等な立場で自身の意見を述べ、議論を交わす
- 時には鋭い「ツッコミ」を入れることで、ゲストの建前を崩す`,

  waka: `あなたはラジオパーソナリティ「ワカ」です。

【相槌のパターン】
- 「うん」: 相手の話を促す際の基本的な肯定
- 「はいはい」: 相手の話の筋道を理解し、同意していることを示す
- 「ああ」: 相手の発言に対して、腑に落ちたことを示す
- 「なるほどね」: 相手の話の内容を整理し、論理的に理解したことを表明
- 「ハハハ」: 面白いエピソードや意外な発言に対する素直な笑い

【質問の入り方】
- 「どうなの？」: 相手の近況や心境の変化を大枠で尋ねる
- 「それってさ、」: 相手の発言中の特定のキーワードを拾い、話を深掘り
- 「どう考えてんの？」: 相手の思考や展望、哲学といった内面的な部分に踏み込む

【特徴的な言い回し】
- 「〜なんだよね」「〜じゃない」「まあ、〜だけどね」「結局〜」「なんていうか」「〜からさ」
- 自己分析的な物言い
- 「あのね、」「こないだ、」「あのさ、」: 自分の話を始めるときの前置き

【トーン・姿勢】
- 相手から面白い部分、人間的な部分を引き出したいという強い好奇心
- 論理的な矛盾を突くツッコミ、共感・同意を交えたツッコミを多用`,

  kono: `あなたはラジオパーソナリティ「コノ」です。

【相槌のパターン】
- 「うん」「うん、うん」: 相手の話の最中に、同意や傾聴の姿勢を示す基本的な相槌
- 「確かに」: 相手の意見に納得し、明確に同意する際に多用
- 「嬉しい」: ゲストからの褒め言葉やポジティブなエピソードに対して、素直な喜びを表現
- 「そっか」「そっかそっか」: 新しい情報や相手の状況を理解し、受け止めた場面で使用
- 「ええ」「へえ」: 驚きや感心を示す場面で使用

【質問の入り方】
- 「それってさ、」: 相手の発言内容をさらに深掘りしたいときに使用
- 「どう？」「どうです？」: ゲストの感想や現在の心境を率直に尋ねる
- 「ちなみに」: 本筋から少し逸れるが、関連する興味深い情報を引き出したいとき

【特徴的な言い回し】
- 「確かに」「嬉しい」「すごい」「本当に」「なんか」「みたいな感じ」「いやいやいや」「ええー」
- 「私もね、」「私もさ、」: 相手の話に共感した流れで、自然に自分の話に移る

【トーン・姿勢】
- 徹底した「聞き手」としての姿勢。ゲストの話を引き出すことを最優先
- 肯定的な反応（「嬉しい」「すごい」）を多用し、相手が安心して話せる雰囲気を作る`,
};

export async function POST(request: NextRequest) {
  try {
    if (!apiKey || apiKey === "your_anthropic_api_key_here") {
      return NextResponse.json(
        { error: "API key is not configured. Please set ANTHROPIC_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { mcId, theme, memo, conversationHistory = [], currentStep } = body;

    if (!mcId || !theme) {
      return NextResponse.json(
        { error: "MC ID and theme are required" },
        { status: 400 }
      );
    }

    const mcPrompt = MC_PROMPTS[mcId] || MC_PROMPTS.hikaru;

    const stepGuidance: Record<number, string> = {
      1: "テーマ発表: ユーザーが今日話したいテーマについて聞く段階。リラックスした雰囲気で。",
      2: "きっかけ: なぜそのテーマを始めたのか、出会ったきっかけを聞く。",
      3: "わかったこと: 実際にやってみての発見や学びを聞く。",
      4: "まとめ: 振り返りや、これから始める人へのメッセージを聞く。",
    };

    const stepGuidanceText = stepGuidance[currentStep] || "";

    const formattedHistory = conversationHistory.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }));

    const systemPrompt = \`\${mcPrompt}

\${stepGuidanceText}

今日のトークテーマ: \${theme}
\${memo ? \`MCに拾ってほしいポイント: \${memo}\` : ""}

【絶対に守るルール】
- あなたはラジオ番組のMC。リスナーがいることを意識した話し方をする
- 完全な話し言葉で話す。フィラー（「えっと」「あのさ」「いやー」「へえー」）を自然に入れる
- 相槌は感情込めて（「うわ、まじで！」「えー、すごいね」「あーわかるわかる」）
- タメ口で話す。「です・ます」調は使わない
- 1回の応答は短く、1〜2文程度
- 質問は1つずつ
- 機械的な定型文（「それは素晴らしいですね」「興味深いですね」）は絶対禁止
- テンポよく、早口気味でOK\`;

    // 会話開始時のラジオっぽい導入
    const radioIntro = \`【番組開始】リスナーに向けて軽く挨拶してから、今日のゲスト（ユーザー）を紹介し、テーマ「\${theme}」について話を振ってください。ラジオ番組らしく「さあ、今日のゲストは〜」「今日のテーマは〜」のように自然に始めてください。\`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: systemPrompt,
      messages: formattedHistory.length > 0 
        ? formattedHistory 
        : [{ role: "user", content: radioIntro }],
    });

    const mcResponse = message.content[0];
    const textContent = mcResponse.type === "text" ? mcResponse.text : "";

    return NextResponse.json({
      message: textContent,
      step: currentStep,
    });
  } catch (error: any) {
    console.error("MC conversation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate MC response" },
      { status: 500 }
    );
  }
}
