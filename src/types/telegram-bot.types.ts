/**
 * EvaRoomBot - Telegram Bot Types for N8N Workflow
 */

/**
 * Session states for the Finite State Machine (FSM)
 */
export enum SessionState {
  IDLE = 'IDLE',
  AWAITING_INN = 'AWAITING_INN',
  AWAITING_INDIVIDUAL_DATA = 'AWAITING_INDIVIDUAL_DATA',
  AWAITING_CONTRACT_DATA = 'AWAITING_CONTRACT_DATA',
  PROCESSING = 'PROCESSING',
}

/**
 * Input types for router
 */
export enum InputType {
  COMMAND = 'command',
  BUTTON = 'button',
  TEXT = 'text',
  UNKNOWN = 'unknown',
}

/**
 * Risk levels for scoring
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Check types
 */
export enum CheckType {
  COMPANY = 'company',
  INDIVIDUAL = 'individual',
  CONTRACT = 'contract',
}

/**
 * Session data structure
 */
export interface SessionData {
  state: SessionState;
  data: {
    checkType?: CheckType;
    inn_ogrn?: string;
    fullName?: string;
    birthDate?: string;
    inn?: string;
    contractNumber?: string;
    contractDate?: string;
    amount?: string;
  };
  timestamp: number;
}

/**
 * Company status types from DaData API
 */
export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  LIQUIDATING = 'LIQUIDATING',
  LIQUIDATED = 'LIQUIDATED',
  REORGANIZING = 'REORGANIZING',
}

/**
 * DaData company response structure
 */
export interface DaDataCompanyData {
  name?: {
    short_with_opf?: string;
    full?: string;
  };
  inn?: string;
  ogrn?: string;
  state?: {
    status?: CompanyStatus;
    registration_date?: string;
  };
  capital?: {
    value?: string;
  };
  okved?: string;
  management?: {
    name?: string;
  };
  address?: {
    value?: string;
    data?: {
      qc_geo?: string;
    };
  };
}

/**
 * DaData API response
 */
export interface DaDataResponse {
  suggestions?: Array<{
    data: DaDataCompanyData;
  }>;
}

/**
 * Scoring result
 */
export interface ScoringResult {
  score: number;
  riskLevel: RiskLevel;
  recommendations: string[];
  details: string[];
  companyName?: string;
  inn?: string;
  ogrn?: string;
}

/**
 * Contract validation data
 */
export interface ContractData {
  contractNumber: string;
  contractDate: string;
  amount: string;
}

/**
 * Individual data
 */
export interface IndividualData {
  fullName: string;
  birthDate: string;
  inn: string;
}

/**
 * Telegram inline keyboard button
 */
export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

/**
 * Bot command types
 */
export enum BotCommand {
  START = '/start',
  HELP = '/help',
  CHECK = '/check',
  STATUS = '/status',
}

/**
 * Bot callback data types
 */
export enum CallbackAction {
  CHECK_COMPANY = 'check_company',
  CHECK_INDIVIDUAL = 'check_individual',
  VALIDATE_CONTRACT = 'validate_contract',
  HELP = 'help',
  START = 'start',
}
