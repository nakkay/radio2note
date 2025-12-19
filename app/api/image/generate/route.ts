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
    // 視覚的要素を含めつつ、ミニマルで上質なタイトル画像（情報過多を避ける）
    const imagePrompt = `Create a minimal, sophisticated, and high-quality thumbnail image for a Japanese blog article on note.com.

【重要】画像内に以下の日本語タイトルを必ず含めてください：
「${title}」

${articleSummary ? `記事の内容: ${articleSummary}` : ""}

Design requirements:
- The image MUST include visual elements that relate to the article topic (illustrations, icons, simple graphics, or conceptual imagery)
- However, avoid information overload - keep it simple and elegant, not cluttered like typical YouTube thumbnails
- Minimal and sophisticated design with limited color palette (2-3 colors maximum)
- Elegant, refined aesthetic suitable for premium content
- The Japanese title text "${title}" must be prominently displayed and highly readable
- Clean, modern typography for the title (large, clear font with generous spacing)
- Subtle, muted color scheme - avoid vibrant or flashy colors
- Use neutral tones, pastels, or monochrome with subtle accents
- Professional quality suitable for note.com blog platform
- Landscape orientation (16:9 aspect ratio)
- Text should have good contrast against the background (use subtle text shadows or overlays if needed)
- Magazine-quality composition with plenty of white space
- Visual elements should complement the title, not compete with it
- Focus on elegance and readability over eye-catching effects

Visual elements guidelines:
- Include ONE main visual element that represents the article topic (illustration, icon, simple graphic, or conceptual image)
- Visual should be simple, clean, and stylized - not photorealistic or complex
- Place visual elements strategically to support the title, not overwhelm it
- Use negative space effectively - don't fill every corner
- Avoid multiple competing visual elements (no collage-style layouts)

Typography style:
- Use clean, modern Japanese font styling
- Title should be the focal point with ample breathing room
- Subtle text effects only if necessary for readability (avoid heavy shadows or gradients)

Color guidelines:
- Primary colors: Neutral tones (grays, beiges, soft whites)
- Accent colors: One subtle accent color maximum (muted blues, soft greens, or warm grays)
- Avoid: Bright reds, yellows, or highly saturated colors
- Background: Clean, simple backgrounds with minimal visual noise

What to avoid:
- Cluttered layouts with multiple text boxes, arrows, or callouts
- Overly complex illustrations or busy backgrounds
- Too many visual elements competing for attention
- YouTube-style thumbnails with excessive information density

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

