import { useState, useEffect, useCallback } from "react";

interface ScoreBreakdown {
  pipeline: number;
  followUp: number;
  outreach: number;
  taskCompletion: number;
}

interface MarieScoreResult {
  score: number | null;
  breakdown: ScoreBreakdown | null;
  trend: "up" | "down" | "stable";
  loading: boolean;
  refresh: () => void;
}

const PREV_SCORE_KEY = "marie_score_prev";

export function useMarieScore(token: string | null): MarieScoreResult {
  const [score, setScore] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [trend, setTrend] = useState<"up" | "down" | "stable">("stable");
  const [loading, setLoading] = useState(true);

  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const compute = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const [contactsRes, tasksRes, notificationsRes] = await Promise.all([
        fetch("/api/contacts", { headers }).then((r) =>
          r.ok ? r.json() : { contacts: [] }
        ),
        fetch("/api/tasks", { headers }).then((r) =>
          r.ok ? r.json() : { tasks: [] }
        ),
        fetch("/api/notifications", { headers }).then((r) =>
          r.ok ? r.json() : { notifications: [] }
        ),
      ]);

      const contacts: Array<{
        stage: string;
        last_contacted_at: string | null;
      }> = contactsRes.contacts || [];
      const tasks: Array<{ done: boolean }> = tasksRes.tasks || [];
      const _notifications = notificationsRes.notifications || [];

      // --- Pipeline (0-25) ---
      const activeStages = ["pitched", "negotiating", "closed"];
      const activeCount = contacts.filter((c) =>
        activeStages.includes(c.stage)
      ).length;
      const totalContacts = contacts.length;
      let pipeline = 0;
      if (totalContacts > 0) {
        const activeRatio = activeCount / totalContacts;
        // Bonus weight for negotiating/pitched specifically
        const negotiatingOrPitched = contacts.filter(
          (c) => c.stage === "negotiating" || c.stage === "pitched"
        ).length;
        if (negotiatingOrPitched > 0) {
          pipeline = Math.min(25, Math.round(activeRatio * 20 + 5));
        } else {
          pipeline = Math.min(25, Math.round(activeRatio * 15));
        }
      }

      // --- Follow-up (0-25) ---
      const now = Date.now();
      const fourteenDays = 14 * 24 * 60 * 60 * 1000;
      const staleContacts = contacts.filter((c) => {
        if (!c.last_contacted_at) return true;
        return now - new Date(c.last_contacted_at).getTime() > fourteenDays;
      });
      // Only penalize if there are contacts at all
      let followUp = 25;
      if (totalContacts > 0) {
        followUp = Math.max(0, 25 - staleContacts.length * 5);
      }

      // --- Outreach (0-25) ---
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const recentlyContacted = contacts.filter((c) => {
        if (!c.last_contacted_at) return false;
        return now - new Date(c.last_contacted_at).getTime() <= sevenDays;
      });
      let outreach = 0;
      if (totalContacts > 0) {
        outreach = Math.round((recentlyContacted.length / totalContacts) * 25);
      }

      // --- Task Completion (0-25) ---
      let taskCompletion = 0;
      if (tasks.length > 0) {
        const completed = tasks.filter((t) => t.done).length;
        taskCompletion = Math.round((completed / tasks.length) * 25);
      }

      const newBreakdown: ScoreBreakdown = {
        pipeline,
        followUp,
        outreach,
        taskCompletion,
      };
      const newScore = pipeline + followUp + outreach + taskCompletion;

      // Trend calculation
      const prevRaw = localStorage.getItem(PREV_SCORE_KEY);
      const prevScore = prevRaw !== null ? parseInt(prevRaw, 10) : null;
      let newTrend: "up" | "down" | "stable" = "stable";
      if (prevScore !== null && !isNaN(prevScore)) {
        if (newScore > prevScore) newTrend = "up";
        else if (newScore < prevScore) newTrend = "down";
      }

      // Store current score for next comparison
      localStorage.setItem(PREV_SCORE_KEY, String(newScore));

      setScore(newScore);
      setBreakdown(newBreakdown);
      setTrend(newTrend);
    } catch {
      // If APIs fail, leave score as null
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    compute();
  }, [token]);

  return { score, breakdown, trend, loading, refresh: compute };
}
