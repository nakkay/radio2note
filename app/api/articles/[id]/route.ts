import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 記事を取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Article ID is required' },
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
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message, useLocalStorage: true },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Article not found', useLocalStorage: true },
        { status: 404 }
      );
    }

    return NextResponse.json({ article: data });
  } catch (error: any) {
    console.error('Article fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch article', useLocalStorage: true },
      { status: 500 }
    );
  }
}

// 記事を削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Article ID is required' },
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

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message, useLocalStorage: true },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Article delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete article', useLocalStorage: true },
      { status: 500 }
    );
  }
}

