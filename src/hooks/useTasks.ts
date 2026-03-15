import { useState, useEffect, useCallback } from "react";
import type { Task } from "../types";

export function useTasks(token: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  useEffect(() => {
    if (!token) return;
    fetch("/api/tasks", { headers })
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const addTask = useCallback(async (text: string, priority: Task["priority"]) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers,
      body: JSON.stringify({ text, priority }),
    });
    const data = await res.json();
    if (data.task) setTasks((prev) => [...prev, data.task]);
  }, [token]);

  const toggleTask = useCallback(async (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ done: !task.done }),
    });
    const data = await res.json();
    if (data.task) setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
  }, [token, tasks]);

  const deleteTask = useCallback(async (id: number) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE", headers });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, [token]);

  return { tasks, loading, addTask, toggleTask, deleteTask };
}
