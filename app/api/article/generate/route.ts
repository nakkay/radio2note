import { Anthropic } from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversationHistory,
      theme,
      tone, // "first" or "third"
    } = body;

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: "Conversation history is required" },
        { status: 400 }
      );
    }

    // 会話履歴をテキストに変換
    const conversationText = conversationHistory
      .map((msg: any) => {
        const speaker = msg.role === "user" ? "ユーザー" : "MC";
        return `${speaker}: ${msg.content}`;
      })
      .join("\n\n");

    let toneGuidance = "";
    if (tone === "first") {
      toneGuidance = "一人称（私）で書いてください。親しみやすく、個人的な体験を伝えるスタイルで、読者との距離が近い印象を与えるようにしてください。";
    } else if (tone === "dialogue") {
      toneGuidance = `上質な雑誌の対談記事として書いてください。

【コンセプト】
これは「ラジオの書き起こし」ではなく「洗練された対談記事」です。
実際の発言をベースにしつつ、言葉足らずな部分は膨らませ、冗長な部分は削り、
読者が「この人の話、面白いな」と思えるような仕上がりにしてください。

【話者の表記】
- 「━━」を聞き手（インタビュアー）として使用
- 話し手（ゲスト）は名前なしで地の文のように扱う

【スタイル】
1. 聞き手の発言は「━━」で始め、簡潔な質問や相槌のみ
2. 話し手の発言は段落として自然に流れるように
3. 相槌・フィラー・繰り返しは完全に削除
4. 話し手の発言は、意図を汲み取って読みやすく再構成してOK
5. 足りない説明は補い、本人が言いそうな言葉で膨らませる
6. 見出しは話の転換点に入れる

【形式例】
---
## セロハンテープで「ガラス」を作る発想

━━お子さんの創作活動が面白いと伺いました。

最近、4歳の娘が水槽を作ったんですよ。紙とセロハンテープだけで。ガラスの透明感を出すために、セロハンテープを何重にも巻いて壁を作っていて。

━━セロハンテープで、ガラスを。

そう、普通は何かを貼り合わせる道具じゃないですか。でも彼女にとっては「透明な素材」なんですよね。その発想に、正直やられましたね。僕ら大人は「テープは貼るもの」という固定観念があるけど、子どもにはそれがない。
---

【避けること】
- 「MC」「ゲスト」という表記
- 一問一答の羅列
- 「うん」「はい」「なるほど」だけの相槌
- 会話そのままの口語体
- 書き起こし感のある文章`;
    } else {
      toneGuidance = "一人称（私）で書いてください。親しみやすく、個人的な体験を伝えるスタイルで、読者との距離が近い印象を与えるようにしてください。";
    }

    const isDialogue = tone === "dialogue";
    
    const systemPrompt = isDialogue 
      ? `あなたは一流雑誌の編集者です。ラジオ収録の素材から、読み応えのある対談記事を作成してください。

【あなたの役割】
生の会話素材を「上質なインタビュー記事」に仕上げること。
話し手の魅力や洞察を引き出し、読者が引き込まれる記事にしてください。

【記事の構成】
1. リード文（2〜3行で記事の魅力を伝える導入）
2. 本編（対談形式、見出し2〜4個で区切る）
3. 編集後記（任意：話を聞いて感じたことを1段落で）

【品質基準】
- 文字数: 2,500〜4,500字
- 話し手の言葉を活かしつつ、読みやすく再構成する
- 「この人の話をもっと聞きたい」と思わせる仕上がり
- 本質的な部分を深掘りし、表面的なやり取りは省略

今日のテーマ: ${theme || "未指定"}

${toneGuidance}

以下の収録素材から、対談記事を作成してください:`
      : `あなたは優れた記事ライターです。ラジオ対談の内容から、読みやすいnote記事を作成してください。

記事の要件:
- 文字数: 2,000〜4,000字
- 構成: 導入・本題（見出し2〜3個）・締め
- トーン: ${toneGuidance}
- ゲスト（ユーザー）の体験や発見を中心に据えた内容にする

今日のテーマ: ${theme || "未指定"}

以下の対話内容を基に、記事を作成してください:`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `以下の対話内容を記事に変換してください:\n\n${conversationText}`,
        },
      ],
    });

    const articleContent = message.content[0];
    const articleText =
      articleContent.type === "text" ? articleContent.text : "";

    return NextResponse.json({
      article: articleText,
      theme,
      tone,
      wordCount: articleText.length,
    });
  } catch (error: any) {
    console.error("Article generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate article" },
      { status: 500 }
    );
  }
}

