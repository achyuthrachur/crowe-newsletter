/**
 * Cluster Section — Email HTML Fragment
 * Renders "Also covered by:" secondary links for clustered stories.
 * Uses inline CSS only + Crowe brand colors.
 */

import type { StoryCluster } from '../stage2/types';

/**
 * Generate HTML for a cluster's "Also covered by:" section.
 * Returns empty string if there are no secondary links.
 */
export function renderClusterSection(cluster: StoryCluster): string {
  if (cluster.secondaryLinks.length === 0) return '';

  const links = cluster.secondaryLinks
    .map(
      (link) =>
        `<a href="${escapeHtml(link.url)}" style="color: #FDB913; text-decoration: underline; font-size: 13px; font-family: Arial, Helvetica, sans-serif;">${escapeHtml(link.sourceName || link.title)}</a>`
    )
    .join(', ');

  return `
    <tr>
      <td style="padding: 4px 0 12px 16px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #828282; line-height: 1.4;">
        Also covered by: ${links}
      </td>
    </tr>`;
}

/**
 * Render a full digest item with optional cluster info.
 */
export function renderDigestItemWithCluster(
  cluster: StoryCluster,
  summary: { summary: string; whyItMatters: string }
): string {
  const article = cluster.primary.article;
  const publishDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return `
    <tr>
      <td style="padding: 16px 0 4px 0;">
        <a href="${escapeHtml(article.url)}" style="color: #002D62; text-decoration: none; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; line-height: 1.3;">
          ${escapeHtml(article.title)}
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding: 4px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333; line-height: 1.5;">
        ${escapeHtml(summary.summary)}
      </td>
    </tr>
    <tr>
      <td style="padding: 4px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #4F4F4F; line-height: 1.5;">
        <strong style="color: #002D62;">Why it matters:</strong> ${escapeHtml(summary.whyItMatters)}
      </td>
    </tr>
    <tr>
      <td style="padding: 2px 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #828282;">
        ${escapeHtml(article.sourceName)}${publishDate ? ` &middot; ${publishDate}` : ''}
      </td>
    </tr>${renderClusterSection(cluster)}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
