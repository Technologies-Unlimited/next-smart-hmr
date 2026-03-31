export function InfoBox({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warning" | "note" }) {
  const colors = {
    info: { bg: "#eff6ff", border: "#3b82f6" },
    warning: { bg: "#fef3c7", border: "#f59e0b" },
    note: { bg: "#f0fdf4", border: "#22c55e" },
  };
  const c = colors[variant];
  return (
    <div style={{
      padding: "12px 16px",
      borderLeft: `4px solid ${c.border}`,
      background: c.bg,
      borderRadius: 4,
      marginBottom: 16,
      fontSize: "0.875rem",
      lineHeight: 1.6,
    }}>
      {children}
    </div>
  );
}
