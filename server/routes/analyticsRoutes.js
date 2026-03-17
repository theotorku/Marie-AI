export function registerAnalyticsRoutes(app, { authenticateToken, requireTier, getDb }) {
  app.get("/api/analytics", authenticateToken, requireTier("proactiveAgent"), async (req, res) => {
    const db = getDb();
    const userId = req.user.id;
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const { count: totalMessages } = await db
      .from("messages").select("*", { count: "exact", head: true })
      .eq("user_id", userId).eq("role", "user");

    const { count: todayMessages } = await db
      .from("messages").select("*", { count: "exact", head: true })
      .eq("user_id", userId).eq("role", "user")
      .gte("created_at", todayStart.toISOString());

    const { count: weekMessages } = await db
      .from("messages").select("*", { count: "exact", head: true })
      .eq("user_id", userId).eq("role", "user")
      .gte("created_at", weekStart.toISOString());

    const byDay = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const { count } = await db
        .from("messages").select("*", { count: "exact", head: true })
        .eq("user_id", userId).eq("role", "user")
        .gte("created_at", dayStart.toISOString())
        .lt("created_at", dayEnd.toISOString());

      byDay.push({ date: dayStart.toISOString().split("T")[0], count: count || 0 });
    }

    const { data: tasks } = await db
      .from("tasks").select("done, priority")
      .eq("user_id", userId);

    const taskList = tasks || [];
    const taskStats = {
      total: taskList.length,
      completed: taskList.filter((t) => t.done).length,
      pending: taskList.filter((t) => !t.done).length,
      byPriority: {
        high: taskList.filter((t) => t.priority === "high").length,
        medium: taskList.filter((t) => t.priority === "medium").length,
        low: taskList.filter((t) => t.priority === "low").length,
      },
    };

    const { count: templateCount } = await db
      .from("email_templates").select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: notifs } = await db
      .from("notifications").select("type, read")
      .eq("user_id", userId);

    const notifList = notifs || [];
    const byType = {};
    for (const n of notifList) {
      byType[n.type] = (byType[n.type] || 0) + 1;
    }

    res.json({
      messages: {
        total: totalMessages || 0,
        today: todayMessages || 0,
        week: weekMessages || 0,
        byDay,
      },
      tasks: taskStats,
      templates: templateCount || 0,
      notifications: {
        total: notifList.length,
        unread: notifList.filter((n) => !n.read).length,
        byType,
      },
    });
  });
}