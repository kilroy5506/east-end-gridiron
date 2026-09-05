export function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-loss/30 bg-loss/10 px-5 py-4">
      <p className="font-heading font-semibold text-sm text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
    </div>
  );
}
