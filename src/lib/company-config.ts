/**
 * Company Configuration Helpers
 *
 * These helpers allow the application to dynamically show/hide
 * sections based on company configuration (minerals mined, mining type).
 */

import type { CompanyConfig, MineralCode } from "./api/types";

// Default configuration when none is provided (backward compatibility)
export const DEFAULT_CONFIG: CompanyConfig = {
  mining_type: "both",
  minerals: ["AG", "AU"],
};

/**
 * Get effective configuration (with fallback to default)
 */
export function getEffectiveConfig(config?: CompanyConfig): CompanyConfig {
  if (!config) return DEFAULT_CONFIG;
  return {
    mining_type: config.mining_type || DEFAULT_CONFIG.mining_type,
    minerals: config.minerals?.length > 0 ? config.minerals : DEFAULT_CONFIG.minerals,
  };
}

// ==================== Mining Type Helpers ====================

/**
 * Check if Open Pit mining sections should be shown
 */
export function showOpenPit(config?: CompanyConfig): boolean {
  const effective = getEffectiveConfig(config);
  return effective.mining_type === "open_pit" || effective.mining_type === "both";
}

/**
 * Check if Underground mining sections should be shown
 */
export function showUnderground(config?: CompanyConfig): boolean {
  const effective = getEffectiveConfig(config);
  return effective.mining_type === "underground" || effective.mining_type === "both";
}

/**
 * Check if both mining types are active (for combined views)
 */
export function hasBothMiningTypes(config?: CompanyConfig): boolean {
  const effective = getEffectiveConfig(config);
  return effective.mining_type === "both";
}

/**
 * Get mining type display label
 */
export function getMiningTypeLabel(config?: CompanyConfig): string {
  const effective = getEffectiveConfig(config);
  switch (effective.mining_type) {
    case "open_pit":
      return "Open Pit";
    case "underground":
      return "Underground";
    case "both":
      return "Open Pit & Underground";
    default:
      return "Mixed";
  }
}

// ==================== Mineral Helpers ====================

/**
 * Check if a specific mineral is mined by the company
 */
export function hasMineralCode(config: CompanyConfig | undefined, mineral: MineralCode): boolean {
  const effective = getEffectiveConfig(config);
  return effective.minerals.includes(mineral);
}

/**
 * Check if Silver (AG) is mined
 */
export function hasSilver(config?: CompanyConfig): boolean {
  return hasMineralCode(config, "AG");
}

/**
 * Check if Gold (AU) is mined
 */
export function hasGold(config?: CompanyConfig): boolean {
  return hasMineralCode(config, "AU");
}

/**
 * Check if Copper (CU) is mined
 */
export function hasCopper(config?: CompanyConfig): boolean {
  return hasMineralCode(config, "CU");
}

/**
 * Check if Zinc (ZN) is mined
 */
export function hasZinc(config?: CompanyConfig): boolean {
  return hasMineralCode(config, "ZN");
}

/**
 * Check if multiple minerals are mined (for combined/equivalent views)
 */
export function hasMultipleMinerals(config?: CompanyConfig): boolean {
  const effective = getEffectiveConfig(config);
  return effective.minerals.length > 1;
}

/**
 * Get the primary mineral (first in the list)
 */
export function getPrimaryMineral(config?: CompanyConfig): MineralCode {
  const effective = getEffectiveConfig(config);
  return effective.minerals[0] || "AG";
}

/**
 * Get mineral display name
 */
export function getMineralName(code: MineralCode): string {
  const names: Record<string, string> = {
    AG: "Silver",
    AU: "Gold",
    CU: "Copper",
    ZN: "Zinc",
    PB: "Lead",
    NI: "Nickel",
    CO: "Cobalt",
  };
  return names[code] || code;
}

/**
 * Get mineral display name in Spanish
 */
export function getMineralNameEs(code: MineralCode): string {
  const names: Record<string, string> = {
    AG: "Plata",
    AU: "Oro",
    CU: "Cobre",
    ZN: "Zinc",
    PB: "Plomo",
    NI: "Níquel",
    CO: "Cobalto",
  };
  return names[code] || code;
}

/**
 * Get all minerals as display string
 */
export function getMineralsDisplay(config?: CompanyConfig): string {
  const effective = getEffectiveConfig(config);
  return effective.minerals.map(getMineralNameEs).join(", ");
}

// ==================== Metric Filtering ====================

/**
 * Filter metrics based on company configuration
 * Returns true if the metric should be shown
 */
export function shouldShowMetric(metricKey: string, config?: CompanyConfig): boolean {
  const effective = getEffectiveConfig(config);

  // Mining type filters
  if (metricKey.includes("open_pit") || metricKey.includes("openpit")) {
    if (!showOpenPit(effective)) return false;
  }
  if (metricKey.includes("underground") || metricKey.includes("ug_")) {
    if (!showUnderground(effective)) return false;
  }
  if (metricKey.includes("stripping_ratio")) {
    // Stripping ratio only applies to open pit
    if (!showOpenPit(effective)) return false;
  }

  // Mineral filters
  if (metricKey.includes("silver") || metricKey.includes("_ag") || metricKey.endsWith("_ag")) {
    if (!hasSilver(effective)) return false;
  }
  if (metricKey.includes("gold") || metricKey.includes("_au") || metricKey.endsWith("_au")) {
    if (!hasGold(effective)) return false;
  }
  if (metricKey.includes("copper") || metricKey.includes("_cu") || metricKey.endsWith("_cu")) {
    if (!hasCopper(effective)) return false;
  }
  if (metricKey.includes("zinc") || metricKey.includes("_zn") || metricKey.endsWith("_zn")) {
    if (!hasZinc(effective)) return false;
  }

  return true;
}

/**
 * Filter an array of metrics based on configuration
 * Generic helper that works with any metric structure that has a 'key' property
 */
export function filterMetricsByConfig<T extends { key: string }>(metrics: T[], config?: CompanyConfig): T[] {
  return metrics.filter((m) => shouldShowMetric(m.key, config));
}

/**
 * Filter categories and their metrics based on configuration
 * Works with category structures that have metrics with 'key' property
 */
export function filterCategoriesByConfig<
  TMetric extends { key: string },
  TCategory extends { key: string; metrics: TMetric[] },
>(categories: TCategory[], config?: CompanyConfig): TCategory[] {
  return categories
    .map((category) => ({
      ...category,
      metrics: filterMetricsByConfig(category.metrics, config),
    }))
    .filter((category) => category.metrics.length > 0);
}
