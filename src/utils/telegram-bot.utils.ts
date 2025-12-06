/**
 * EvaRoomBot - Utility functions for validation and formatting
 */

import {
  RiskLevel,
  ScoringResult,
  DaDataCompanyData,
  IndividualData,
  ContractData,
} from '../types/telegram-bot.types';

/**
 * Validates INN (Individual Taxpayer Number) format
 * INN can be 10 digits (for legal entities) or 12 digits (for individuals)
 */
export function validateINN(inn: string): boolean {
  const innPattern = /^\d{10}$|^\d{12}$/;
  return innPattern.test(inn.trim());
}

/**
 * Validates OGRN (Primary State Registration Number) format
 * OGRN can be 13 digits (for legal entities) or 15 digits (for individual entrepreneurs)
 */
export function validateOGRN(ogrn: string): boolean {
  const ogrnPattern = /^\d{13}$|^\d{15}$/;
  return ogrnPattern.test(ogrn.trim());
}

/**
 * Validates INN or OGRN
 */
export function validateInnOrOgrn(value: string): boolean {
  return validateINN(value) || validateOGRN(value);
}

/**
 * Validates date in DD.MM.YYYY format
 */
export function validateDate(date: string): boolean {
  const datePattern = /^\d{2}\.\d{2}\.\d{4}$/;
  if (!datePattern.test(date)) {
    return false;
  }

  const [day, month, year] = date.split('.').map(Number);
  const dateObj = new Date(year, month - 1, day);

  return (
    dateObj.getDate() === day &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getFullYear() === year
  );
}

/**
 * Validates full name (at least 2 words)
 */
export function validateFullName(name: string): boolean {
  const nameParts = name.trim().split(/\s+/);
  return nameParts.length >= 2 && nameParts.every((part) => part.length > 0);
}

/**
 * Parses individual data from text input
 */
export function parseIndividualData(text: string): IndividualData | null {
  const parts = text.split(',').map((p) => p.trim());
  if (parts.length !== 3) {
    return null;
  }

  const [fullName, birthDate, inn] = parts;

  if (!validateFullName(fullName) || !validateDate(birthDate) || !validateINN(inn)) {
    return null;
  }

  return { fullName, birthDate, inn };
}

/**
 * Parses contract data from text input
 */
export function parseContractData(text: string): ContractData | null {
  const parts = text.split(',').map((p) => p.trim());
  if (parts.length !== 3) {
    return null;
  }

  const [contractNumber, contractDate, amount] = parts;

  if (!contractNumber || !validateDate(contractDate) || !amount) {
    return null;
  }

  return { contractNumber, contractDate, amount };
}

/**
 * Calculates scoring based on company data from DaData
 */
export function calculateCompanyScoring(companyData: DaDataCompanyData): ScoringResult {
  let score = 100;
  let riskLevel: RiskLevel = RiskLevel.LOW;
  const recommendations: string[] = [];
  const details: string[] = [];

  // Check company status
  if (companyData.state?.status === 'LIQUIDATING') {
    score -= 50;
    riskLevel = RiskLevel.CRITICAL;
    recommendations.push('⛔ Компания находится в процессе ликвидации');
    details.push('Статус: Ликвидация');
  } else if (companyData.state?.status === 'LIQUIDATED') {
    score -= 70;
    riskLevel = RiskLevel.CRITICAL;
    recommendations.push('⛔ Компания ликвидирована');
    details.push('Статус: Ликвидирована');
  } else if (companyData.state?.status === 'REORGANIZING') {
    score -= 30;
    riskLevel = RiskLevel.HIGH;
    recommendations.push('⚠️ Компания в процессе реорганизации');
    details.push('Статус: Реорганизация');
  } else if (companyData.state?.status === 'ACTIVE') {
    details.push('Статус: ✅ Активна');
  } else {
    score -= 20;
    riskLevel = RiskLevel.MEDIUM;
    details.push('Статус: Неизвестен');
  }

  // Check registration date
  if (companyData.state?.registration_date) {
    const regDate = new Date(companyData.state.registration_date);
    const monthsSinceReg =
      (Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsSinceReg < 6) {
      score -= 25;
      if (riskLevel === RiskLevel.LOW) riskLevel = RiskLevel.MEDIUM;
      recommendations.push('⚠️ Компания зарегистрирована менее 6 месяцев назад');
    } else if (monthsSinceReg < 12) {
      score -= 15;
      if (riskLevel === RiskLevel.LOW) riskLevel = RiskLevel.MEDIUM;
      recommendations.push('⚠️ Компания зарегистрирована менее года назад');
    }

    details.push(`Дата регистрации: ${regDate.toLocaleDateString('ru-RU')}`);
  }

  // Check authorized capital
  if (companyData.capital?.value) {
    const capital = parseFloat(companyData.capital.value);
    if (capital < 10000) {
      score -= 15;
      if (riskLevel === RiskLevel.LOW) riskLevel = RiskLevel.MEDIUM;
      recommendations.push('⚠️ Низкий уставный капитал');
    }
    details.push(`Уставный капитал: ${capital.toLocaleString('ru-RU')} руб.`);
  }

  // Check OKVED
  if (companyData.okved) {
    details.push(`Основной ОКВЭД: ${companyData.okved}`);
  }

  // Check management
  if (companyData.management?.name) {
    details.push(`Руководитель: ${companyData.management.name}`);
  }

  // Check address
  if (companyData.address?.value) {
    details.push(`Адрес: ${companyData.address.value}`);

    // Mass registration address check
    const qcGeo = companyData.address?.data?.qc_geo;
    if (qcGeo === '4' || qcGeo === '5') {
      score -= 20;
      if (riskLevel === RiskLevel.LOW) riskLevel = RiskLevel.MEDIUM;
      recommendations.push('⚠️ Адрес массовой регистрации');
    }
  }

  // Final score adjustment
  score = Math.max(0, Math.min(100, score));

  // Determine final risk level based on score
  if (score >= 80) {
    riskLevel = RiskLevel.LOW;
  } else if (score >= 60) {
    riskLevel = RiskLevel.MEDIUM;
  } else if (score >= 40) {
    riskLevel = RiskLevel.HIGH;
  } else {
    riskLevel = RiskLevel.CRITICAL;
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Проверка пройдена успешно');
  }

  const companyName =
    companyData.name?.short_with_opf || companyData.name?.full || 'Неизвестная компания';
  const inn = companyData.inn || '';
  const ogrn = companyData.ogrn || '';

  return {
    score,
    riskLevel,
    recommendations,
    details,
    companyName,
    inn,
    ogrn,
  };
}

/**
 * Formats scoring result as Telegram message
 */
export function formatScoringResult(result: ScoringResult): string {
  const { score, riskLevel, recommendations, details, companyName, inn, ogrn } = result;

  const riskEmoji: Record<RiskLevel, string> = {
    [RiskLevel.LOW]: '🟢',
    [RiskLevel.MEDIUM]: '🟡',
    [RiskLevel.HIGH]: '🟠',
    [RiskLevel.CRITICAL]: '🔴',
    [RiskLevel.UNKNOWN]: '⚪',
  };

  const riskText: Record<RiskLevel, string> = {
    [RiskLevel.LOW]: 'Низкий',
    [RiskLevel.MEDIUM]: 'Средний',
    [RiskLevel.HIGH]: 'Высокий',
    [RiskLevel.CRITICAL]: 'Критический',
    [RiskLevel.UNKNOWN]: 'Неизвестен',
  };

  const scoreEmoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : score >= 40 ? '🟠' : '🔴';

  let message = '📊 **Результат проверки контрагента**\n\n';
  message += `🏢 **Компания:** ${companyName}\n`;
  if (inn) message += `🔢 **ИНН:** ${inn}\n`;
  if (ogrn) message += `🔢 **ОГРН:** ${ogrn}\n`;
  message += '\n━━━━━━━━━━━━━━━━━━━━\n\n';
  message += `${scoreEmoji} **Скоринговый балл:** ${score}/100\n`;
  message += `${riskEmoji[riskLevel]} **Уровень риска:** ${riskText[riskLevel]}\n`;
  message += '\n━━━━━━━━━━━━━━━━━━━━\n\n';

  if (details.length > 0) {
    message += '📋 **Детали:**\n';
    details.forEach((detail) => {
      message += `• ${detail}\n`;
    });
    message += '\n━━━━━━━━━━━━━━━━━━━━\n\n';
  }

  if (recommendations.length > 0) {
    message += '💡 **Рекомендации:**\n';
    recommendations.forEach((rec) => {
      message += `${rec}\n`;
    });
  }

  message += '\n━━━━━━━━━━━━━━━━━━━━\n';
  message += '\n🔄 Для новой проверки используйте /start';

  return message;
}

/**
 * Gets current timestamp
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Checks if session is expired (default: 30 minutes)
 */
export function isSessionExpired(timestamp: number, expiryMinutes = 30): boolean {
  const expiryTime = expiryMinutes * 60 * 1000;
  return Date.now() - timestamp > expiryTime;
}
