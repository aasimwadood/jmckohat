"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export function NotificationBell({ userId, initialNotifications }: { userId: string; initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${userId}` },
        (payload) => {
          const notif = payload.new as Notification;
          setNotifications((prev) => [notif, ...prev].slice(0, 20));
          toast(notif.title, { description: notif.body ?? undefined });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAllRead = async () => {
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
  };

  return (
    <Popover onOpenChange={(open) => open && markAllRead()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 justify-center px-1 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-2 text-sm font-medium">Notifications</p>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {notifications.length === 0 && <p className="py-4 text-center text-sm text-gray-500">No notifications yet.</p>}
          {notifications.map((n) => (
            <div key={n.id} className="rounded-md border p-2 text-sm">
              <p className="font-medium text-gray-900">{n.title}</p>
              {n.body && <p className="text-gray-600">{n.body}</p>}
              <p className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
