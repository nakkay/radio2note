// プラン定義とユーティリティ関数

export type PlanType = 'free' | 'premium';

export interface PlanLimits {
  planType: PlanType;
  maxArticlesPerWeek: number;
  imageGenerationEnabled: boolean;
  price: number; // 月額料金（円）
}

export const PLANS: Record<PlanType, PlanLimits> = {
  free: {
    planType: 'free',
    maxArticlesPerWeek: 1, // 週1記事
    imageGenerationEnabled: false,
    price: 0,
  },
  premium: {
    planType: 'premium',
    maxArticlesPerWeek: 7, // 週7記事
    imageGenerationEnabled: true,
    price: 1280, // 月額1,280円
  },
};

// ユーザーのプランを取得（デフォルトはfree）
export async function getUserPlan(userId: string | null): Promise<PlanType> {
  if (!userId) return 'free';

  try {
    const response = await fetch(`/api/user/plan?userId=${userId}`);
    if (response.ok) {
      const data = await response.json();
      return data.planType || 'free';
    }
  } catch (error) {
    console.error('Failed to fetch user plan:', error);
  }

  return 'free';
}

// プランの制限を取得
export function getPlanLimits(planType: PlanType): PlanLimits {
  return PLANS[planType] || PLANS.free;
}

// 週の開始日を取得（月曜日を週の開始とする）
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日を週の開始
  return new Date(d.setDate(diff));
}

// 週の終了日を取得
export function getWeekEnd(date: Date = new Date()): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

