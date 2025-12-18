import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 記事一覧を取得
export async function GET(request: NextRequest) {
  try {
    // Supabaseが設定されていない場合はエラーを返す（フロントエンドでlocalStorageにフォールバック）
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured', useLocalStorage: true },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message, useLocalStorage: true },
        { status: 500 }
      );
    }

    return NextResponse.json({ articles: data || [] });
  } catch (error: any) {
    console.error('Articles fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch articles', useLocalStorage: true },
      { status: 500 }
    );
  }
}

// 記事を保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, theme, content, wordCount, image, imageMimeType, conversationHistory, elapsedTime, tone } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Supabaseが設定されていない場合はエラーを返す（フロントエンドでlocalStorageにフォールバック）
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured', useLocalStorage: true },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from('articles')
      .insert({
        title,
        theme: theme || title,
        content,
        word_count: wordCount || 0,
        image: image || null,
        image_mime_type: imageMimeType || null,
        conversation_history: conversationHistory || null,
        elapsed_time: elapsedTime || 0,
        tone: tone || 'first',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message, useLocalStorage: true },
        { status: 500 }
      );
    }

    return NextResponse.json({ article: data });
  } catch (error: any) {
    console.error('Article save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save article', useLocalStorage: true },
      { status: 500 }
    );
  }
}
