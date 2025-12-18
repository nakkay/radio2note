import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";

// MCごとのElevenLabs音声設定
const voiceSettings: Record<string, { 
  voiceId: string; 
  stability: number; 
  similarityBoost: number;
  style: number;
}> = {
  // ヒカル: 伊集院光っぽい声
  hikaru: { 
    voiceId: "8QgNyYugQ07X0LFdMABE",
    stability: 0.4,
    similarityBoost: 0.75,
    style: 0.4,
  },
  
  // ワカ: オードリー若林っぽい声
  waka: { 
    voiceId: "SOuiRq8aXqyALuq5QIQ8",
    stability: 0.35,
    similarityBoost: 0.8,
    style: 0.5,
  },
  
  // コノ: 日向坂松田好花っぽい声
  kono: { 
    voiceId: "wcs09USXSN5Bl7FXohVZ",
    stability: 0.3,
    similarityBoost: 0.75,
    style: 0.6,
  },
};

export async function POST(request: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY is not configured. Please set it in .env.local" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { text, mcId } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const settings = voiceSettings[mcId || "hikaru"] || voiceSettings.hikaru;

    // ElevenLabs Text-to-Speech API
    const response = await fetch(
      \`https://api.elevenlabs.io/v1/text-to-speech/\${settings.voiceId}\`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarityBoost,
            style: settings.style,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      throw new Error(\`ElevenLabs API failed: \${response.status}\`);
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(Buffer.from(audioBuffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error("TTS generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate speech" },
      { status: 500 }
    );
  }
}
