export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>{title}</h1>
      {description && <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{description}</p>}
    </div>
  );
}
