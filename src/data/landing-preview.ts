export interface PreviewArticle {
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  whyItMatters: string;
  section: string;
}

export interface PreviewSection {
  section: string;
  articles: PreviewArticle[];
}

export interface PreviewDigest {
  date: string;
  greeting: string;
  sections: PreviewSection[];
}

export const LANDING_PREVIEW_DIGEST: PreviewDigest = {
  date: "Wednesday, March 11",
  greeting: "Good morning. Here's what matters today.",
  sections: [
    {
      section: "AI",
      articles: [
        {
          title: "OCC Issues Guidance on AI Model Risk in Credit Decisions",
          source: "American Banker",
          publishedAt: "Today, 6:45am",
          summary:
            "The OCC released supplemental guidance clarifying SR 11-7 application to large language models used in credit underwriting, requiring institutions to document training data governance and benchmark testing against traditional scorecards.",
          whyItMatters:
            "Any bank using AI in credit decisions faces new documentation requirements — MRM teams will need updated validation templates before the next examination cycle.",
          section: "AI",
        },
        {
          title: "Fed Examiners Flag LLM Hallucination Risk in Model Validation Programs",
          source: "Risk.net",
          publishedAt: "Today, 5:20am",
          summary:
            "Federal Reserve examiners have begun questioning whether existing model validation frameworks adequately address hallucination and confabulation risks in large language models used for internal analysis and customer-facing applications.",
          whyItMatters:
            "MRM teams that haven't updated their SR 11-7 validation templates to address generative AI outputs are likely to receive findings in the next examination cycle.",
          section: "AI",
        },
        {
          title: "FDIC Proposes AI Transparency Standards for Consumer Lending",
          source: "Banking Dive",
          publishedAt: "Yesterday, 4:15pm",
          summary:
            "The FDIC issued a proposed rule requiring institutions using AI in consumer lending decisions to provide plain-language explanations of adverse action reasons, with specific disclosure requirements for model-driven denials.",
          whyItMatters:
            "Institutions using AI scorecards or hybrid models for credit decisions will need updated adverse action notice workflows before the comment period closes.",
          section: "AI",
        },
      ],
    },
    {
      section: "BSA / AML",
      articles: [
        {
          title: "FinCEN Issues Alert on Deepfake-Enabled Identity Fraud in Account Opening",
          source: "FinCEN.gov",
          publishedAt: "Today, 7:00am",
          summary:
            "FinCEN issued a financial trend analysis alert warning that deepfake technology is increasingly being used to defeat video-based KYC verification at account opening, with a notable increase in suspicious activity reports from digital banks.",
          whyItMatters:
            "BSA/AML programs relying solely on video verification for CDD will need to layer additional controls — this alert signals examiner scrutiny is coming.",
          section: "BSA / AML",
        },
        {
          title: "OCC Examination Findings Show Transaction Monitoring Tuning Gaps at Mid-Size Banks",
          source: "American Banker",
          publishedAt: "Yesterday, 2:30pm",
          summary:
            "OCC examination findings released for Q1 2026 show that mid-size banks continue to struggle with documented tuning methodology for transaction monitoring systems, with 34% of institutions receiving observations related to alert threshold justification.",
          whyItMatters:
            "If your TMS tuning documentation doesn't include a backtesting methodology and documented threshold rationale, it's a likely finding in your next BSA exam.",
          section: "BSA / AML",
        },
      ],
    },
    {
      section: "Model Risk Management",
      articles: [
        {
          title: "SR 11-7 Guidance Expansion Expected to Cover Third-Party AI Models",
          source: "Reuters",
          publishedAt: "Today, 6:00am",
          summary:
            "Federal regulators are expected to issue expanded guidance extending SR 11-7 model risk management principles to third-party AI and machine learning models, closing a gap that allowed many vendor-supplied models to bypass independent validation requirements.",
          whyItMatters:
            "Institutions using vendor AI models for credit, fraud, or compliance decisions without formal validation will face new documentation and oversight requirements under the proposed guidance.",
          section: "Model Risk Management",
        },
      ],
    },
  ],
};
