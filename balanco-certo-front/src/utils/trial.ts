// src/utils/trial.ts
// Utilitários para cálculo de status do período de teste (trial)

export const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type TrialStatus = {
  expired: boolean;
  remainingDays: number; // 0 quando expirado
  trialEnd: Date;
};

export function getTrialStatus(createdAtISO: string, trialDays: number = 7): TrialStatus {
  const createdAt = new Date(createdAtISO);
  const trialEnd = new Date(createdAt.getTime() + trialDays * MS_PER_DAY);
  const now = new Date();

  const diffDays = Math.ceil((trialEnd.getTime() - now.getTime()) / MS_PER_DAY);
  const remainingDays = Math.max(0, diffDays);
  const expired = now.getTime() >= trialEnd.getTime();

  return { expired, remainingDays, trialEnd };
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}