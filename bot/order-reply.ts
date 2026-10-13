import { translate } from "../src/shared/messages";
import { buildOrderLink, escapeHtml, formatPrice, type OrderPayload } from "../src/shared/order";

/** Telegram HTML reply. Product text is escaped. Photos are never included. */
export function formatOrderReply(payload: OrderPayload, orderBaseUrl?: string): string {
  const lines = [
    `<b>${escapeHtml(translate("botOrderTitle"))}</b>`,
    escapeHtml(payload.shop),
    "",
  ];

  payload.items.forEach((item, index) => {
    const variant = item.variant ? ` (${Object.values(item.variant).join(", ")})` : "";
    const qty = item.qty > 1 ? ` × ${item.qty}` : "";
    lines.push(
      `${index + 1}. ${escapeHtml(item.title)}${escapeHtml(qty)}${escapeHtml(variant)} — ${escapeHtml(formatPrice(payload.currency, item.price, item.offerPrice))}`,
    );
  });

  const link = buildOrderLink(payload.items, orderBaseUrl);
  if (link) {
    lines.push("", `<a href="${escapeHtml(link)}">${escapeHtml(translate("botComplete"))}</a>`);
  }

  lines.push("");
  if (payload.shareResults && payload.summary) {
    lines.push(escapeHtml(translate("botShared")));
    if (payload.summary.skinAge != null) {
      lines.push(escapeHtml(translate("botSkinAge", { value: payload.summary.skinAge })));
    }
    if (payload.summary.damagePercentage != null) {
      lines.push(escapeHtml(translate("botSkinDamage", { value: payload.summary.damagePercentage })));
    }
    for (const problem of payload.summary.problems) {
      const label = problem.title || problem.key;
      const score = problem.score != null ? `: ${problem.score}` : "";
      lines.push(`• ${escapeHtml(label)}${escapeHtml(score)}`);
    }
    lines.push(escapeHtml(translate("botNotDiagnosis")));
  } else if (payload.shareResults) {
    lines.push(escapeHtml(translate("botSharedEmpty")));
  } else {
    lines.push(escapeHtml(translate("botNoPhoto")));
  }

  return lines.join("\n");
}
