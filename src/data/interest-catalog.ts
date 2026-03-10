export const INTEREST_CATALOG: Record<string, string[]> = {
  AI: [
    "AI in financial services",
    "AI model risk",
    "Generative AI in audit",
    "Machine learning regulation",
    "AI governance frameworks",
  ],
  "BSA / AML": [
    "Transaction monitoring",
    "SAR filing trends",
    "KYC/CDD compliance",
    "FinCEN guidance",
    "BSA examination findings",
  ],
  "Model Risk Management": [
    "SR 11-7 compliance",
    "Model validation",
    "CECL model performance",
    "Vendor model assessment",
    "Model inventory management",
  ],
  "Credit Risk": [
    "CECL forecasting",
    "PD/LGD modeling",
    "Loan-level reconciliation",
    "Credit stress testing",
    "Consumer credit trends",
  ],
  Regulatory: [
    "Federal Reserve guidance",
    "OCC examinations",
    "FFIEC updates",
    "MRA remediation",
    "Basel IV implementation",
  ],
  Audit: [
    "Internal audit AI",
    "Statistical sampling",
    "Workpaper standards",
    "Risk-based audit planning",
    "SOX compliance",
  ],
  "FP&A": [
    "Rolling forecast methodology",
    "Variance analysis",
    "Cash flow monitoring",
    "Scenario modeling",
    "CFO reporting",
  ],
  Cybersecurity: [
    "Bank cybersecurity regulation",
    "Third-party risk",
    "Incident response",
    "CISA advisories",
    "Ransomware in financial services",
  ],
};

export const INTEREST_CATALOG_SECTIONS = Object.keys(INTEREST_CATALOG);
