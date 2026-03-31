import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GSS NSX Training & Link Audit Tracker",
  description: "Training content tracker and broken link audit for GSS NSX Confluence pages",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <nav style={{
            width: 260,
            borderRight: "1px solid var(--border)",
            padding: "24px 16px",
            position: "sticky",
            top: 0,
            height: "100vh",
            overflowY: "auto",
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 24 }}>
              GSS NSX Tracker
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <NavLink href="/">Overview</NavLink>
              <NavSection title="Part 1 — Pending Trainings">
                <NavLink href="/trainings/nsx">NSX</NavLink>
                <NavLink href="/trainings/hcx">HCX</NavLink>
                <NavLink href="/trainings/core-networking">Core Networking</NavLink>
                <NavLink href="/trainings/vrni">vRNI</NavLink>
                <NavLink href="/trainings/compute">Compute Cross-Skilling</NavLink>
              </NavSection>
              <NavSection title="Part 2 — Broken Link Audit">
                <NavLink href="/audit/docs-vmware">docs.vmware.com</NavLink>
                <NavLink href="/audit/ikb-vmware">ikb.vmware.com</NavLink>
                <NavLink href="/audit/bugzilla">Bugzilla</NavLink>
                <NavLink href="/audit/zoom-recordings">Zoom Recordings</NavLink>
                <NavLink href="/audit/kb-vmware">kb.vmware.com</NavLink>
                <NavLink href="/audit/confluence-eng">confluence.eng</NavLink>
                <NavLink href="/audit/via-vmw">via.vmw.com</NavLink>
                <NavLink href="/audit/gitlab-eng">gitlab.eng</NavLink>
                <NavLink href="/audit/sharepoint">SharePoint</NavLink>
                <NavLink href="/audit/communities">Communities</NavLink>
                <NavLink href="/audit/wolken-kb">Wolken KB</NavLink>
                <NavLink href="/audit/dead-tools">Dead Internal Tools</NavLink>
                <NavLink href="/audit/external">External Links</NavLink>
                <NavLink href="/audit/email-aliases">Email Aliases</NavLink>
              </NavSection>
              <NavSection title="Part 3 — Content Inventory">
                <NavLink href="/inventory">Page Inventory</NavLink>
              </NavSection>
              <NavSection title="Part 4 — Deletion Candidates">
                <NavLink href="/deletion">Deletion Candidates</NavLink>
              </NavSection>
            </div>
          </nav>
          <main style={{ flex: 1, padding: "32px 40px", maxWidth: 1200, overflowX: "auto" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 4, paddingLeft: 8 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {children}
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      display: "block",
      padding: "6px 8px",
      borderRadius: 6,
      fontSize: "0.8125rem",
      color: "var(--fg)",
      textDecoration: "none",
    }}>
      {children}
    </Link>
  );
}
