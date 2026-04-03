import React from "react";
import { Link } from "react-router-dom";

const DOCUMENTS = {
  sop: {
    title: "SOP Documentation",
    badge: "Standard Operating Procedure",
    intro: "Operational steps followed across order handling, vendor workflows, customer support, and stock management.",
    sections: [
      {
        heading: "Order Flow",
        items: [
          "Approve and publish products only after review.",
          "Deduct stock after successful order placement.",
          "Restore stock when an order is cancelled or reversed.",
          "Trigger stock alerts whenever inventory falls below threshold.",
        ],
      },
      {
        heading: "Vendor Operations",
        items: [
          "Keep product details, stock, and media accurate before publishing.",
          "Use the bulk CSV import template for controlled uploads.",
          "Review stock alerts promptly and acknowledge them after action.",
        ],
      },
      {
        heading: "Support & Escalation",
        items: [
          "Verify the customer or vendor identity before making changes.",
          "Log order issues, refunds, and replacements through the relevant dashboard.",
          "Escalate payment, fulfilment, or policy disputes to the admin team.",
        ],
      },
    ],
  },
  policy: {
    title: "Policy Documentation",
    badge: "Platform Policy",
    intro: "Rules that govern privacy, content, fulfilment, refunds, and acceptable marketplace usage.",
    sections: [
      {
        heading: "Marketplace Rules",
        items: [
          "Only approved products are visible to customers.",
          "Vendors are responsible for accurate pricing, stock, and product information.",
          "Abusive or fraudulent activity may be blocked or suspended by the admin team.",
        ],
      },
      {
        heading: "Customer Policy",
        items: [
          "Orders are fulfilled based on available stock and serviceability.",
          "Refunds, replacements, and cancellations follow the active order policy.",
          "Customers must provide accurate delivery and contact information.",
        ],
      },
      {
        heading: "Data & Compliance",
        items: [
          "Personal data is used only for order processing, support, and account management.",
          "Policy changes are managed centrally by the admin dashboard.",
          "Always refer to the latest published policy content for current rules.",
        ],
      },
    ],
  },
};

export default function DocumentationPage({ type }) {
  const doc = DOCUMENTS[type] || DOCUMENTS.sop;

  return (
    <div style={{ minHeight: "100vh", background: "var(--ek-bg)", color: "var(--ek-text)", padding: "32px 20px 120px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, border: "1px solid var(--ek-border)", background: "var(--ek-surface)", color: "var(--ek-muted)", fontSize: 12, fontWeight: 700 }}>
            {doc.badge}
          </div>
          <h1 style={{ margin: "14px 0 10px", fontSize: 34, lineHeight: 1.15, letterSpacing: -0.02, fontWeight: 900 }}>{doc.title}</h1>
          <p style={{ margin: 0, color: "var(--ek-muted)", fontSize: 15, lineHeight: 1.7, maxWidth: 760 }}>{doc.intro}</p>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {doc.sections.map(section => (
            <section key={section.heading} style={{ background: "var(--ek-surface)", border: "1px solid var(--ek-border)", borderRadius: 18, padding: 22, boxShadow: "var(--ek-shadow)" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 800 }}>{section.heading}</h2>
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ek-muted)", lineHeight: 1.8, fontSize: 14 }}>
                {section.items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ))}
        </div>

        <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/auth" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "11px 18px", borderRadius: 12, border: "1px solid var(--ek-border)", background: "var(--ek-surface)", color: "var(--ek-text)", textDecoration: "none", fontWeight: 700 }}>
            Back to login
          </Link>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "11px 18px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", textDecoration: "none", fontWeight: 700 }}>
            Go to home
          </Link>
        </div>
      </div>
    </div>
  );
}
