import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, articleSummary } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // 記事のタイトルとサマリーを基に画像生成用のプロンプトを作成
    // クリックしたくなる、テキスト入りのタイトル画像
    const imagePrompt = `Create a stunning, click-worthy thumbnail image for a Japanese blog article on note.com.

【重要】画像内に以下の日本語タイトルを必ず含めてください：
「${title}」

${articleSummary ? `記事の内容: ${articleSummary}` : ""}

Design requirements:
- Eye-catching, scroll-stopping visual that makes people want to click
- The Japanese title text "${title}" must be prominently displayed and highly readable
- Bold, modern typography for the title (large, clear font)
- Rich, vibrant color scheme that pops
- Professional quality suitable for note.com blog platform
- Landscape orientation (16:9 aspect ratio)
- Text should have good contrast against the background (use text shadows, overlays, or contrasting backgrounds)
- Magazine-cover or YouTube-thumbnail quality composition
- The image should tell a story related to the article topic
- Make the viewer curious about the content

Typography style:
- Use bold, impactful Japanese font styling
- Title should be the focal point
- Consider using subtle text effects (shadows, gradients, outlines) for readability

Generate only the image.`;

    console.log("🎨 画像生成開始 (Gemini 3 Pro Image / Nano Banana Pro):", title);

    // Gemini 3 Pro Image Preview (Nano Banana Pro) で画像生成
    // https://ai.google.dev/gemini-api/docs/image-generation?hl=ja
    const response = await genai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: imagePrompt,
    });

    // レスポンスから画像データを抽出
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates in response");
    }

    const parts = candidates[0].content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error("No parts in response");
    }

    // 画像パートを探す
    let imageData: string | null = null;
    let mimeType = "image/png";
    for (const part of parts) {
      if (part.inlineData) {
        imageData = part.inlineData.data || null;
        mimeType = part.inlineData.mimeType || "image/png";
        break;
      }
    }

    if (!imageData) {
      throw new Error("No image data found in response");
    }

    console.log("🎨 画像生成完了, mimeType:", mimeType);

    return NextResponse.json({
      success: true,
      imageBase64: imageData,
      mimeType,
    });
  } catch (error: unknown) {
    console.error("Image generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate image";
    
    // 画像生成に失敗しても記事は使えるようにする
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: 500 }
    );
  }
}

