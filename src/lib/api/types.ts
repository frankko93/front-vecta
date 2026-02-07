// ==================== Common Types ====================

export interface PaginationInfo {
  page: number;
  size: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface ValidationErrorDetail {
  type: string;
  message: string;
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
  error?: string; // For validation errors
  details?: ValidationErrorDetail[]; // For validation error details
}

// ==================== Auth Types ====================

export type Permission = "admin" | "editor" | "viewer";
export type CompanyRole = "admin" | "editor" | "viewer";

// Role hierarchy levels for permission checking
export const ROLE_LEVELS: Record<CompanyRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export interface LoginRequest {
  dni: string;
  password: string;
}

// User's association with a company including their role
export interface UserCompany {
  company_id: number;
  company_name: string;
  role: CompanyRole;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  dni: string;
  birth_date?: string;
  work_area: string;
  active?: boolean;
  permissions: Permission[];
  companies: UserCompany[]; // Companies the user has access to
  created_at?: string;
  updated_at?: string;
}

// Auth state for the store
export interface AuthState {
  token: string | null;
  user: User | null;
  selectedCompanyId: number | null;
  isAuthenticated: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ==================== Company Types ====================

export interface Mineral {
  id: number;
  name: string;
  code: string;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type MiningType = "open_pit" | "underground" | "both";

export interface CompanySettings {
  company_id: number;
  mining_type: MiningType;
  country: string;
  royalty_percentage: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: number;
  name: string;
  legal_name: string;
  tax_id: string;
  address: string;
  contact_email: string;
  contact_phone: string | null; // Can be NULL from backend
  mining_type?: MiningType;
  active: boolean;
  created_at: string;
  updated_at: string;
  minerals?: Mineral[]; // Only in detail view
  settings?: CompanySettings; // Only in detail view
}

// CompanyDetail is the same as Company with minerals and settings
// (already included as optional in Company interface)
export type CompanyDetail = Company;

export interface CreateCompanyRequest {
  name: string;
  legal_name: string;
  tax_id: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  mining_type: MiningType;
  country: string;
  royalty_percentage: number;
}

// ==================== Data Import Types ====================

export type DataType = "actual" | "budget";
export type ImportType = "pbr" | "dore" | "opex" | "capex" | "financial" | "production" | "revenue";

export interface ImportResponse {
  success: boolean;
  type: ImportType;
  rows_total: number;
  rows_inserted: number;
  rows_failed: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  column: string;
  error: string;
}

export interface ImportParams {
  file: File;
  type: ImportType;
  data_type: DataType;
  company_id: number;
  version?: number;
  description?: string;
}

// Base data row interface
export interface BaseDataRow {
  id: number;
  company_id: number;
  date: string;
  version: number;
  description: string;
  created_at: string;
}

// PBR Data
export interface PBRData extends BaseDataRow {
  ore_mined_t: number;
  waste_mined_t: number;
  developments_m: number;
  total_tonnes_processed: number;
  feed_grade_silver_gpt: number;
  feed_grade_gold_gpt: number;
  recovery_rate_silver_pct: number;
  recovery_rate_gold_pct: number;
}

// Dore Data
export interface DoreData extends BaseDataRow {
  dore_produced_oz: number;
  silver_grade_pct: number;
  gold_grade_pct: number;
  pbr_price_silver: number;
  pbr_price_gold: number;
  realized_price_silver: number;
  realized_price_gold: number;
  silver_adjustment_oz: number;
  gold_adjustment_oz: number;
  ag_deductions_pct: number;
  au_deductions_pct: number;
  treatment_charge: number;
  refining_deductions_au: number;
}

// OPEX Data
export interface OPEXData extends BaseDataRow {
  cost_center: string;
  subcategory: string;
  expense_type: string;
  amount: number;
  currency: string;
}

// CAPEX Data
export interface CAPEXData extends BaseDataRow {
  category: string;
  car_number: string;
  project_name: string;
  type: "sustaining" | "project" | "leasing" | "accretion";
  amount: number;
  currency: string;
}

// Financial Data
export interface FinancialData extends BaseDataRow {
  shipping_selling: number;
  sales_taxes_royalties: number;
  other_adjustments: number;
  currency: string;
}

// Data list params
export interface DataListParams {
  company_id: number;
  year: number;
  data_type: DataType;
  version?: number;
}

// ==================== Report Types ====================

export interface MiningMetrics {
  // Ore Mined - totals and breakdown by pit type
  ore_mined_t: number;
  open_pit_ore_t?: number;
  underground_ore_t?: number;

  // Waste
  waste_mined_t: number;
  stripping_ratio?: number; // waste/ore for Open Pit

  // Mining Grades (before processing)
  mining_grade_silver_gpt?: number;
  mining_grade_gold_gpt?: number;
  open_pit_grade_silver_gpt?: number;
  underground_grade_silver_gpt?: number;
  open_pit_grade_gold_gpt?: number;
  underground_grade_gold_gpt?: number;

  // Developments - total and breakdown
  developments_m: number;
  primary_development_m?: number;
  secondary_development_opex_m?: number;
  expansionary_development_m?: number;

  // Headcount
  full_time_employees?: number;
  contractors?: number;
  total_headcount?: number;

  has_data: boolean;
}

export interface ProcessingMetrics {
  total_tonnes_processed: number;
  feed_grade_silver_gpt: number;
  feed_grade_gold_gpt: number;
  recovery_rate_silver_pct: number;
  recovery_rate_gold_pct: number;
  has_data: boolean;
}

export interface ProductionMetrics {
  total_production_silver_oz: number;
  total_production_gold_oz: number;
  payable_silver_oz: number;
  payable_gold_oz: number;
  dore_production_oz?: number; // Optional - from Dore report
  has_data: boolean;
}

export interface CostsMetrics {
  mine: number;
  processing: number;
  ga: number;
  transport_shipping: number;
  inventory_variations: number;
  production_based_costs: number;
  production_based_margin: number;
  has_data: boolean;
}

export interface NSRMetrics {
  nsr_dore: number;
  streaming: number; // Streaming agreement value (generally negative)
  pbr_revenue: number; // Calculated: nsr_dore + streaming
  shipping_selling: number;
  sales_taxes_royalties: number;
  smelting_refining_charges: number; // Smelting & refining charges
  net_smelter_return: number;
  gold_credit: number; // Gold credit as by-product (negative)
  nsr_per_tonne: number;
  total_cost_per_tonne: number;
  margin_per_tonne: number;
  has_data: boolean;
}

export interface CAPEXMetrics {
  sustaining: number;
  project: number;
  leasing: number;
  accretion_of_mine_closure_liability: number;
  total: number;
  production_based_margin: number;
  pbr_net_cash_flow: number;
  has_data: boolean;
}

export interface CashCostMetrics {
  cash_cost_per_oz_silver: number;
  aisc_per_oz_silver: number;
  gold_credit: number;
  has_data: boolean;
}

export interface MonthlyData {
  mining: MiningMetrics;
  processing: ProcessingMetrics;
  production: ProductionMetrics;
  costs: CostsMetrics;
  nsr: NSRMetrics;
  capex: CAPEXMetrics;
  cash_cost: CashCostMetrics;
}

// Variance structure for MonthlyReport
// Each section contains metrics with VarianceMetric values
export interface MonthlyVariance {
  mining: Record<string, VarianceMetric>;
  processing: Record<string, VarianceMetric>;
  production: Record<string, VarianceMetric>;
  costs: Record<string, VarianceMetric>;
  nsr: Record<string, VarianceMetric>;
  capex: Record<string, VarianceMetric>;
  cash_cost: Record<string, VarianceMetric>;
}

// YTD (Year-to-Date) data structure
// Same structure as MonthlyData but represents cumulative values from year start
export interface YTDData {
  actual: MonthlyData;
  budget: MonthlyData;
  variance?: MonthlyVariance; // Optional variance data for YTD
}

export interface MonthlyReport {
  month: string;
  actual: MonthlyData | null; // null if no actual data for this month
  budget: MonthlyData | null; // null if no budget data for this month
  variance?: MonthlyVariance; // Only present if both actual and budget have data
  ytd?: YTDData; // YTD calculated by backend
}

export interface SummaryReportCoverage {
  actual_months: number[]; // Array of month numbers (1-12) with actual data
  budget_months: number[]; // Array of month numbers (1-12) with budget data
  actual_last_month: number | null; // Last month with actual data (1-12) or null
  budget_last_month: number | null; // Last month with budget data (1-12) or null
  actual_is_partial: boolean; // true if actual data doesn't cover all 12 months
  budget_is_partial: boolean; // true if budget data doesn't cover all 12 months
  has_any_actual: boolean; // true if there's any actual data
  has_any_budget: boolean; // true if there's any budget data
  has_complete_actual: boolean; // true if actual data covers all 12 months
  has_complete_budget: boolean; // true if budget data covers all 12 months
}

// Company configuration for dynamic behavior
// MiningType is already defined above in Company Types section
export type MineralCode = "AG" | "AU" | "CU" | "ZN" | "PB" | "NI" | "CO" | string;

export interface CompanyConfig {
  mining_type: MiningType;
  minerals: MineralCode[];
}

// Helper constants for mineral display names
export const MINERAL_NAMES: Record<string, string> = {
  AG: "Silver",
  AU: "Gold",
  CU: "Copper",
  ZN: "Zinc",
  PB: "Lead",
  NI: "Nickel",
  CO: "Cobalt",
};

export interface SummaryReport {
  company_id: number;
  company_name: string;
  year: number;
  config?: CompanyConfig; // Company configuration (minerals, mining type)
  months: MonthlyReport[];
  coverage?: SummaryReportCoverage; // Metadata about data coverage (optional for backward compatibility)
}

export interface SummaryReportParams {
  company_id: number;
  year: number;
  months?: number[]; // Optional, defaults to all 12 months
  budget_version?: number; // Optional, defaults to 1
}

// ==================== Detailed Report Types ====================

// Variance metric structure (used in all detailed reports)
export interface VarianceMetric {
  actual: number;
  budget: number;
  variance: number; // Actual - Budget (Fav/Unf)
  variance_pct: number; // (Actual - Budget) / Budget * 100
}

// PBR Detailed Report
export interface PBRActual {
  ore_mined_t: number;
  waste_mined_t: number;
  developments_m: number;
  waste_ore_ratio: number; // Calculated
  total_moved: number; // Calculated (Ore + Waste)
  total_tonnes_processed: number;
  feed_grade_silver_gpt: number;
  feed_grade_gold_gpt: number;
  recovery_rate_silver_pct: number;
  recovery_rate_gold_pct: number;
  total_production_silver_oz: number; // Calculated
  total_production_gold_oz: number; // Calculated
  has_data: boolean;
}

export interface PBRVariance {
  ore_mined_t: VarianceMetric;
  waste_mined_t: VarianceMetric;
  developments_m: VarianceMetric;
  waste_ore_ratio: VarianceMetric;
  total_moved: VarianceMetric;
  total_tonnes_processed: VarianceMetric;
  feed_grade_silver_gpt: VarianceMetric;
  feed_grade_gold_gpt: VarianceMetric;
  recovery_rate_silver_pct: VarianceMetric;
  recovery_rate_gold_pct: VarianceMetric;
  total_production_silver_oz: VarianceMetric;
  total_production_gold_oz: VarianceMetric;
}

export interface PBRMonthlyData {
  month: string;
  actual: PBRActual;
  budget: PBRActual;
  variance: PBRVariance;
}

export interface PBRReport {
  company_id: number;
  company_name: string;
  year: number;
  config?: CompanyConfig;
  months: PBRMonthlyData[];
}

// Dore Detailed Report
export interface DoreActual {
  dore_produced_oz: number;
  silver_grade_pct: number;
  gold_grade_pct: number;
  metal_in_dore_silver_oz: number; // Calculated
  metal_in_dore_gold_oz: number; // Calculated
  silver_adjustment_oz: number;
  gold_adjustment_oz: number;
  metal_adjusted_silver_oz: number; // Calculated
  metal_adjusted_gold_oz: number; // Calculated
  ag_deductions_pct: number;
  au_deductions_pct: number;
  deductions_silver_oz: number; // Calculated
  deductions_gold_oz: number; // Calculated
  payable_silver_oz: number; // Calculated
  payable_gold_oz: number; // Calculated
  pbr_price_silver: number;
  pbr_price_gold: number;
  realized_price_silver: number;
  realized_price_gold: number;
  gross_revenue_silver: number; // Calculated
  gross_revenue_gold: number; // Calculated
  gross_revenue_total: number; // Calculated
  treatment_charge: number;
  refining_deductions_au: number;
  total_charges: number; // Calculated
  nsr_dore: number; // Calculated
  has_data: boolean;
}

export interface DoreVariance {
  dore_produced_oz: VarianceMetric;
  silver_grade_pct: VarianceMetric;
  gold_grade_pct: VarianceMetric;
  metal_in_dore_silver_oz: VarianceMetric;
  metal_in_dore_gold_oz: VarianceMetric;
  silver_adjustment_oz: VarianceMetric;
  gold_adjustment_oz: VarianceMetric;
  metal_adjusted_silver_oz: VarianceMetric;
  metal_adjusted_gold_oz: VarianceMetric;
  ag_deductions_pct: VarianceMetric;
  au_deductions_pct: VarianceMetric;
  deductions_silver_oz: VarianceMetric;
  deductions_gold_oz: VarianceMetric;
  payable_silver_oz: VarianceMetric;
  payable_gold_oz: VarianceMetric;
  pbr_price_silver: VarianceMetric;
  pbr_price_gold: VarianceMetric;
  realized_price_silver: VarianceMetric;
  realized_price_gold: VarianceMetric;
  gross_revenue_silver: VarianceMetric;
  gross_revenue_gold: VarianceMetric;
  gross_revenue_total: VarianceMetric;
  treatment_charge: VarianceMetric;
  refining_deductions_au: VarianceMetric;
  total_charges: VarianceMetric;
  nsr_dore: VarianceMetric;
}

export interface DoreMonthlyData {
  month: string;
  actual: DoreActual;
  budget: DoreActual;
  variance: DoreVariance;
}

export interface DoreReport {
  company_id: number;
  company_name: string;
  year: number;
  config?: CompanyConfig;
  months: DoreMonthlyData[];
}

// OPEX Detailed Report
export interface OPEXActual {
  mine: number;
  processing: number;
  ga: number;
  transport_shipping: number;
  inventory_variations: number;
  total: number; // Calculated
  by_subcategory?: Record<string, number>; // Subcategory breakdown at month level
  by_expense_type?: Record<string, number>; // Expense type breakdown at month level
  has_data: boolean;
}

export interface OPEXBreakdown {
  actual: number;
  budget: number;
  variance: number;
  variance_pct: number;
}

export interface OPEXCostCenterBreakdown extends OPEXBreakdown {
  cost_center: string;
}

export interface OPEXSubcategoryBreakdown extends OPEXBreakdown {
  subcategory: string;
  cost_center: string;
}

export interface OPEXExpenseTypeBreakdown extends OPEXBreakdown {
  expense_type: string;
}

export interface OPEXMonthlyData {
  month: string;
  actual: OPEXActual;
  budget: OPEXActual;
  variance: {
    mine: VarianceMetric;
    processing: VarianceMetric;
    ga: VarianceMetric;
    transport_shipping: VarianceMetric;
    inventory_variations: VarianceMetric;
    total: VarianceMetric;
  };
  by_cost_center?: Record<string, OPEXBreakdown>;
  by_subcategory?: Record<string, OPEXBreakdown>;
}

export interface OPEXReport {
  company_id: number;
  company_name: string;
  year: number;
  config?: CompanyConfig;
  months: OPEXMonthlyData[];
  // Report-level aggregations
  by_cost_center?: Record<string, OPEXCostCenterBreakdown>;
  by_subcategory?: Record<string, OPEXSubcategoryBreakdown>;
  by_expense_type?: Record<string, OPEXExpenseTypeBreakdown>;
}

// CAPEX Detailed Report
export interface CAPEXActual {
  sustaining: number;
  project: number;
  leasing: number;
  accretion_of_mine_closure_liability: number;
  total: number; // Calculated
  by_category?: Record<string, number>; // Category breakdown at month level
  by_project?: Record<string, number>; // Project breakdown at month level (CAR numbers)
  has_data: boolean;
}

export interface CAPEXBreakdown {
  actual: number;
  budget: number;
  variance: number;
  variance_pct: number;
}

export interface CAPEXCategoryBreakdown extends CAPEXBreakdown {
  category: string;
  type?: string; // sustaining, project, leasing
}

export interface CAPEXProjectBreakdown extends CAPEXBreakdown {
  car_number: string;
  project_name: string;
  category?: string;
  type?: string;
}

export interface CAPEXMonthlyData {
  month: string;
  actual: CAPEXActual;
  budget: CAPEXActual;
  variance: {
    sustaining: VarianceMetric;
    project: VarianceMetric;
    leasing: VarianceMetric;
    accretion_of_mine_closure_liability: VarianceMetric;
    total: VarianceMetric;
  };
  by_type?: Record<string, CAPEXBreakdown>;
  by_category?: Record<string, CAPEXBreakdown>;
}

export interface CAPEXReport {
  company_id: number;
  company_name: string;
  year: number;
  config?: CompanyConfig;
  months: CAPEXMonthlyData[];
  // Report-level aggregations
  by_type?: Record<string, CAPEXBreakdown>;
  by_category?: Record<string, CAPEXCategoryBreakdown>;
  by_project?: Record<string, CAPEXProjectBreakdown>;
}

// Financial Detailed Report
export interface FinancialActual {
  shipping_selling: number;
  sales_taxes_royalties: number;
  other_adjustments: number;
  currency: string;
  has_data: boolean;
}

export interface FinancialMonthlyData {
  month: string;
  actual: FinancialActual;
  budget: FinancialActual;
  variance: {
    shipping_selling: VarianceMetric;
    sales_taxes_royalties: VarianceMetric;
    other_adjustments: VarianceMetric;
  };
}

export interface FinancialReport {
  company_id: number;
  company_name: string;
  year: number;
  months: FinancialMonthlyData[];
}

// Production Detailed Report
export interface ProductionActual {
  total_production_silver_oz: number; // From PBR
  total_production_gold_oz: number; // From PBR
  dore_produced_oz: number; // From Dore
  payable_silver_oz: number; // From Dore
  payable_gold_oz: number; // From Dore
  has_data: boolean;
}

export interface ProductionByMineral {
  mineral_name: string;
  unit: string;
  actual: number;
  budget: number;
  variance: number;
  variance_pct: number;
}

export interface ProductionMonthlyData {
  month: string;
  actual: ProductionActual;
  budget: ProductionActual;
  variance: {
    total_production_silver_oz: VarianceMetric;
    total_production_gold_oz: VarianceMetric;
    dore_produced_oz: VarianceMetric;
    payable_silver_oz: VarianceMetric;
    payable_gold_oz: VarianceMetric;
  };
  by_mineral: Record<string, ProductionByMineral>;
}

export interface ProductionReport {
  company_id: number;
  company_name: string;
  year: number;
  months: ProductionMonthlyData[];
}

// Revenue Detailed Report
export interface RevenueMineralDetail {
  mineral_code: string;
  mineral_name: string;
  quantity_sold: number;
  unit_price: number;
  revenue: number; // quantity_sold * unit_price
  currency: string;
}

export interface RevenueDetail {
  by_mineral?: Record<string, RevenueMineralDetail>;
  total_revenue: number;
  total_quantity_sold: number;
  average_unit_price: number;
  has_data: boolean;
}

export interface RevenueVariance {
  total_revenue: VarianceMetric;
  total_quantity_sold: VarianceMetric;
  average_unit_price: VarianceMetric;
}

export interface RevenueMonthlyData {
  month: string; // Format "YYYY-MM"
  actual: RevenueDetail | null; // Can be null from backend
  budget: RevenueDetail | null; // Can be null from backend
  variance?: RevenueVariance; // Only present if both actual and budget have data
}

export interface RevenueMineralData {
  mineral_code: string;
  mineral_name: string;
  currency: string;
  actual: number; // Total revenue actual (sum of all months)
  budget: number; // Total revenue budget (sum of all months)
  variance: VarianceMetric;
}

export interface RevenueReport {
  company_id: number;
  company_name: string;
  year: number;
  months: RevenueMonthlyData[];
  by_mineral?: Record<string, RevenueMineralData>; // Aggregated by mineral across all months
}

// ==================== Scenario Types ====================

export interface SaveScenarioRequest {
  name: string;
  description: string;
  company_id: number;
  year: number;
  budget_version: number;
}

export interface SavedScenario {
  id: number;
  name: string;
  description: string;
  company_id: number;
  year: number;
  budget_version: number;
  created_by: number;
  created_at: string;
}

// SavedReport - Full report with report_data (used in compare response)
export interface SavedReport {
  id: number;
  company_id: number;
  name: string;
  description?: string;
  year: number;
  budget_version: number;
  report_data: SummaryReport; // Complete report with all 12 months
  created_by: number;
  created_at: string; // ISO 8601
}

// KeyMetric - Aggregated metrics for comparison
export interface KeyMetric {
  report_id: number;
  report_name: string;
  budget_version: number;

  // Mining
  ore_mined: number;
  waste_mined?: number;
  developments_m?: number;

  // Processing
  tonnes_processed?: number;
  avg_recovery_silver_pct?: number;
  avg_recovery_gold_pct?: number;

  // Production
  silver_production: number;
  gold_production: number;
  payable_silver_oz?: number;
  payable_gold_oz?: number;

  // Revenue & NSR
  nsr: number;
  nsr_per_tonne?: number;
  streaming?: number;

  // Costs
  production_costs: number;
  mine_opex?: number;
  processing_opex?: number;
  ga_opex?: number;
  total_cost_per_tonne?: number;

  // CAPEX
  capex_sustaining?: number;
  capex_project?: number;
  capex_total?: number;

  // Margins & Cash
  production_margin: number;
  margin_per_tonne?: number;
  net_cash_flow: number;

  // Per-ounce metrics
  cash_cost_per_oz: number;
  aisc_per_oz: number;
}

export interface CompareScenarioRequest {
  report_ids: number[]; // Minimum 2, maximum 5
}

export interface CompareScenarioResponse {
  reports: SavedReport[]; // Array of complete saved reports
  comparison: {
    key_metrics: KeyMetric[]; // Array of aggregated metrics per report
    count: number; // Number of reports compared
  };
}

// ==================== Config Types ====================

export interface Unit {
  value: string;
  label: string;
}

export interface UnitsResponse {
  data: Unit[];
}

// ==================== Health Types ====================

export interface HealthResponse {
  status: "ok" | "error";
  timestamp: string;
}

export interface VersionResponse {
  version: string;
}

// ==================== User Management Types ====================

// System-level permissions
export type SystemPermission = "super_admin" | "admin" | "editor" | "viewer";

// Request to create a new user (Super Admin)
export interface CreateUserRequest {
  first_name: string;
  last_name: string;
  dni: string;
  birth_date: string;
  work_area: string;
  password: string;
  permissions?: SystemPermission[];
}

// Request to create a user in a company context (Company Admin)
export interface CreateCompanyUserRequest {
  first_name: string;
  last_name: string;
  dni: string;
  birth_date: string;
  work_area: string;
  password: string;
}

// Request to update a user
export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  work_area?: string;
}

// Request to assign user to company
export interface AssignUserToCompanyRequest {
  user_id: number;
  company_id: number;
  role: CompanyRole;
}

// Request to update user role in company
export interface UpdateUserRoleRequest {
  role: CompanyRole;
}

// Request to assign permissions
export interface AssignPermissionsRequest {
  user_id: number;
  permissions: SystemPermission[];
}

// Paginated users response from admin endpoints
export interface AdminUsersResponse {
  users: User[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

// Simple message response
export interface MessageResponse {
  message: string;
}

// Request to set user password (Super Admin only - no current password required)
export interface SetUserPasswordRequest {
  new_password: string;
}

// Request to change own password (authenticated user)
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
