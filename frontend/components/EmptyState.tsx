import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
export default function EmptyState({ title, message, icon: Icon = Inbox, action }: { title: string; message?: string; icon?: LucideIcon; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface px-6 py-12 text-center">
      <Icon className="h-10 w-10 text-secondary" />
      <h3 className="text-base font-semibold text-heading">{title}</h3>
      {message && <p className="max-w-md text-sm text-body">{message}</p>}
      {action}
    </div>
  );
}
