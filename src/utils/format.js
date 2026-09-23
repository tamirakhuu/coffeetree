

export const money = (n) => Math.round(n || 0).toLocaleString("mn-MN") + "₮";

export const discountPercent = (option) => {
  if (!option || !option.price || !option.originalPrice || option.originalPrice <= option.price) return null;
  return Math.round((1 - option.price / option.originalPrice) * 100);
};

export const initials = (str) => (str || "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export const formatCountdown = (endsAt) => {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (days > 0) return `${days} өдөр ${hours} цаг`;
  if (hours > 0) return `${hours} цаг ${mins} мин`;
  if (mins > 0) return `${mins} мин`;
  return `${secs} сек`;
};

export function formatMnDate(d) {
  return `${d.getFullYear()} оны ${d.getMonth() + 1}-р сарын ${d.getDate()}`;
}
