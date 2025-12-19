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

    // ユーザーIDをクエリパラメータから取得（オプション）
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let query = supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    // ユーザーIDが指定されている場合は、そのユーザーの記事のみ取得
    // RLSが有効な場合、認証済みユーザーは自動的に自分の記事のみ見ることができる
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      // ユーザーIDがない場合は、user_idがnullの記事（未認証ユーザーの記事）のみ取得
      query = query.is('user_id', null);
    }

    const { data, error } = await query;

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
    const { title, theme, content, wordCount, image, imageMimeType, conversationHistory, elapsedTime, tone, userId } = body;

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
        user_id: userId || null, // ユーザーID（ログインしている場合）
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

