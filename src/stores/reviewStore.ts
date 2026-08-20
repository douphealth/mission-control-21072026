// Review ritual state — last weekly review + last daily shutdown.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ReviewState {
  lastWeeklyReview: string | null;   // YYYY-MM-DD
  lastShutdown: string | null;       // YYYY-MM-DD
  markWeeklyReview: (day: string) => void;
  markShutdown: (day: string) => void;
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set) => ({
      lastWeeklyReview: null,
      lastShutdown: null,
      markWeeklyReview: (day) => set({ lastWeeklyReview: day }),
      markShutdown: (day) => set({ lastShutdown: day }),
    }),
    { name: 'mc-review-v1' },
  ),
);
