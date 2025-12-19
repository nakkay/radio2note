import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, articleSummary, userId } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // プランチェック: フリープランでは画像生成不可
    if (userId) {
      try {
        // サーバー側で直接Supabaseからプラン情報を取得（より効率的）
        if (supabase) {
          const { data: subscription } = await supabase
            .from('user_subscriptions')
            .select('plan_type, status, current_period_end')
            .eq('user_id', userId)
            .single();

          // サブスクリプションがない、または無効な場合はフリープラン
          if (!subscription || subscription.status !== 'active' || 
              (subscription.current_period_end && new Date(subscription.current_period_end) < new Date())) {
            return NextResponse.json(
              { error: "Image generation not available for free plan", success: false },
              { status: 403 }
            );
          }

          // プレミアムプランの場合のみ画像生成を許可
          if (subscription.plan_type !== 'premium') {
            return NextResponse.json(
              { error: "Image generation not available for free plan", success: false },
              { status: 403 }
            );
          }
        } else {
          // Supabaseが設定されていない場合はフリープランとみなす
          return NextResponse.json(
            { error: "Image generation not available for free plan", success: false },
            { status: 403 }
          );
        }
      } catch (error) {
        // プラン取得に失敗した場合はフリープランとみなす
        return NextResponse.json(
          { error: "Image generation not available for free plan", success: false },
          { status: 403 }
        );
      }
    } else {
      // ユーザーIDがない場合（未ログイン）は画像生成不可
      return NextResponse.json(
        { error: "Image generation requires authentication", success: false },
        { status: 403 }
      );
    }

    // 記事のタイトルとサマリーを基に画像生成用のプロンプトを作成
    // 参考画像のトンマナ: 太字の日本語テキストが主役、ミニマルで力強いデザイン
    const imagePrompt = `Create a minimal, bold, and impactful thumbnail image for a Japanese blog article on note.com.

【最重要】画像内に以下の日本語タイトルを必ず含めてください：
「${title}」

${articleSummary ? `記事の内容: ${articleSummary}` : ""}

Design requirements (参考画像のトンマナに基づく):
- The Japanese title text "${title}" must be the PRIMARY and DOMINANT visual element
- Use a bold, heavy sans-serif Japanese font (Gothic/ゴシック体 style) - thick, strong, and assertive
- Text should be VERY LARGE and prominently displayed, taking up significant space in the composition
- Left-aligned text layout, stacked vertically if the title is long
- Strong visual hierarchy: text is the hero, visual elements are secondary

Typography style (参考画像のテキストスタイル):
- Bold, heavy Japanese font (similar to Gothic/ゴシック体) - thick strokes, strong presence
- Large font size - text should be the focal point, not small or subtle
- High contrast: black text on light background, OR white text on black rectangular background boxes
- Use black rectangular background boxes for emphasis if needed (like the reference image)
- Generous spacing between lines for readability
- Direct, assertive presentation - no decorative fonts or script styles

Color palette (参考画像の色使い):
- Limited color palette: primarily black, white, and light gray/off-white
- Background: Clean light gray or off-white (like the reference image)
- Text: Solid black for main text, white text on black boxes for emphasis
- Optional: ONE subtle accent color maximum (muted, not vibrant)
- Avoid: Bright colors, gradients, or complex color schemes
- Monochrome or near-monochrome aesthetic

Visual elements (補助的な役割):
- Include simple, minimal visual elements that relate to the article topic (optional)
- Visual elements should be secondary to the text - don't compete for attention
- Simple line art, icons, or stylized illustrations (black and white)
- Place visual elements on the right side or as background, not covering the text
- Clean, minimal style - no complex illustrations or busy graphics
- If including a character or figure, use simple black-and-white line art style

Layout and composition:
- Landscape orientation (16:9 aspect ratio)
- Text on the left side, visual elements (if any) on the right side
- Plenty of white/negative space - don't fill every corner
- Balanced composition but text-dominant
- Professional, magazine-quality layout

What to avoid:
- Small or subtle text - the title must be BOLD and LARGE
- Decorative or script fonts - use strong, bold sans-serif
- Complex color schemes - stick to black, white, gray
- Cluttered layouts - keep it minimal and focused
- Visual elements that compete with the text
- YouTube-style thumbnails with excessive information

Reference style:
- The image should have the same assertive, bold tone as the reference image
- Text should be the hero, with strong visual presence
- Minimal, clean design with maximum impact through typography
- Professional yet bold and direct

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

