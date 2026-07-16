export function calculateAssetRisk(asset, { hasOverdueAssignment = false, hasOpenMaintenance = false, today = new Date() } = {}) {
  let score = 0;
  if (asset.condition === 'poor') score += 30;
  if (asset.condition === 'fair') score += 14;
  if (asset.status === 'lost') score += 55;
  if (hasOverdueAssignment) score += 30;
  if (hasOpenMaintenance) score += 18;
  if (asset.nextMaintenanceDate && new Date(asset.nextMaintenanceDate) < today) score += 16;
  if (asset.warrantyExpiry && new Date(asset.warrantyExpiry) < today) score += 8;
  return Math.min(score, 100);
}

export function classifyRisk(score) {
  if (score >= 60) return 'critical';
  if (score >= 35) return 'high';
  if (score >= 15) return 'watch';
  return 'healthy';
}
