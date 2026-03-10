/**
 * Coverage Note — Email HTML Fragment
 * Adds a coverage note line at the bottom of digest emails.
 * Uses inline CSS only + Crowe brand colors.
 */

/**
 * Generate the coverage note HTML for the email footer.
 * Only shown when web search was used in this digest.
 */
export function renderCoverageNote(webSearchUsed: boolean): string {
  if (!webSearchUsed) return '';

  return `
    <tr>
      <td style="padding: 24px 0 8px 0; border-top: 1px solid #E0E0E0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #828282; line-height: 1.4; text-align: center;">
        Coverage includes open sources from the last 7 days.
      </td>
    </tr>`;
}
