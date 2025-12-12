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

    const toneGuidance =
      tone === "first"
        ? "一人称（私）で書いてください。親しみやすく、個人的な体験を伝えるスタイルで、読者との距離が近い印象を与えるようにしてください。"
        : "三人称（彼・彼女）で書いてください。客観的で専門的な印象を与えるスタイルで、ビジネスやフォーマルな記事に適した文体にしてください。";

    const systemPrompt = `あなたは優れた記事ライターです。対話形式のインタビューを、読みやすいnote記事に変換してください。

記事の要件:
- 文字数: 3,000〜5,000字
- 構成: 導入・本題・締めの3部構成
- トーン: ${toneGuidance}
- ユーザーの体験や発見を中心に据えた内容にする
- 自然な流れで、読みやすい文章にする
- 見出しを適切に使用して、読みやすさを向上させる

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

