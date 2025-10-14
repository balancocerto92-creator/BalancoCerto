import dayjs from 'dayjs';

// src/utils/trial.ts
// Utilitários para cálculo de status do período de teste (trial)

export const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type TrialStatus = {
  expired: boolean;
  remainingDays: number; // 0 quando expirado
  trialEnd: Date;
};

export function getTrialStatus(createdAtISO: string, trialEndsAtISO: string | null, trialDays: number = 7): TrialStatus {
  const now = dayjs();

  let trialEndDate: dayjs.Dayjs;

  if (trialEndsAtISO) {
    trialEndDate = dayjs(trialEndsAtISO);
  } else {
    const createdAt = dayjs(createdAtISO);
    trialEndDate = createdAt.add(trialDays, 'day');
  }

  const expired = now.isAfter(trialEndDate);
  const remainingDays = Math.max(0, trialEndDate.diff(now, 'day'));

  return { expired, remainingDays, trialEnd: trialEndDate.toDate() };
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}