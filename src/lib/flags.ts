/**
 * Centralized feature flags — all read from process.env via getters.
 * Import `flags` elsewhere instead of checking process.env directly.
 */
export const flags = {
  /** Stage 2 — web search expansion */
  get websearchEnabled(): boolean {
    return process.env.WEBSEARCH_ENABLED === 'true';
  },

  /** Stage 3 — deep dive weekly reports */
  get deepResearchEnabled(): boolean {
    return process.env.DEEP_RESEARCH_ENABLED === 'true';
  },

  /** Stage 4 — user feedback collection */
  get feedbackEnabled(): boolean {
    return process.env.FEEDBACK_ENABLED === 'true';
  },

  /** Stage 4 — personalized content ranking */
  get personalizationEnabled(): boolean {
    return process.env.PERSONALIZATION_ENABLED === 'true';
  },
};
