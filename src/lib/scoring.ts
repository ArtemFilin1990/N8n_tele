export type RiskLevel =
  | 'Наивысшая надёжность'
  | 'Высокая надёжность'
  | 'Невысокий риск'
  | 'Умеренный риск'
  | 'Средний риск'
  | 'Высокий риск'
  | 'Крайне высокий риск';

export interface EnforcementData {
  count?: number;
  totalAmount?: number;
}

export interface ArbitrationData {
  casesAsDefendant?: number;
  lostCaseAmount?: number;
}

export interface FinanceData {
  profit?: number;
  revenue?: number;
  netAssets?: number;
}

export interface CompanyProfile {
  registrationDate?: string;
  stateStatus?: string;
  hasUnreliableInfo?: boolean;
  isMassAddress?: boolean;
  managementChangeDate?: string;
  addressChangeDate?: string;
  capital?: number;
  employees?: number;
  finance?: FinanceData;
  taxArrears?: boolean;
  taxPenalties?: boolean;
  bankAccountBlocked?: boolean;
  enforcement?: EnforcementData;
  inRnp?: boolean;
  arbitration?: ArbitrationData;
  disqualifiedDirector?: boolean;
  disqualifiedFounder?: boolean;
  massManagerCount?: number;
  massFounderCount?: number;
  bankruptcyHistoryCount?: number;
  branchCount?: number;
  isPartOfHolding?: boolean;
  isSystemicallyImportant?: boolean;
  isPublicCompany?: boolean;
}

export interface ScoringResult {
  baseScore: number;
  finalScore: number;
  level: RiskLevel;
  recommendation: string;
  paymentTerms: string;
  positives: string[];
  negatives: string[];
}

const BASE_SCORE = 50;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const ENFORCEMENT_SERIOUS_AMOUNT = 1_000_000;

const RISK_BANDS: Array<{
  min: number;
  max: number;
  level: RiskLevel;
  recommendation: string;
  paymentTerms: string;
}> = [
  {
    min: 95,
    max: 100,
    level: 'Наивысшая надёжность',
    recommendation: 'Контрагент заслуживает максимального доверия.',
    paymentTerms: 'Отсрочка до 60 дней',
  },
  {
    min: 85,
    max: 94,
    level: 'Высокая надёжность',
    recommendation: 'Риск минимален, можно работать на льготных условиях.',
    paymentTerms: 'Отсрочка до 45 дней',
  },
  {
    min: 75,
    max: 84,
    level: 'Невысокий риск',
    recommendation: 'Рекомендуется работа на стандартных условиях.',
    paymentTerms: 'Отсрочка до 30 дней',
  },
  {
    min: 65,
    max: 74,
    level: 'Умеренный риск',
    recommendation: 'Возможна работа с контролем расчётов.',
    paymentTerms: 'Отсрочка до 14 дней',
  },
  {
    min: 50,
    max: 64,
    level: 'Средний риск',
    recommendation: 'Допустима короткая отсрочка при тщательном контроле.',
    paymentTerms: 'Отсрочка до 7 дней',
  },
  {
    min: 30,
    max: 49,
    level: 'Высокий риск',
    recommendation: 'Ограниченные условия работы.',
    paymentTerms: 'Предоплата минимум 40%, остаток до отгрузки',
  },
  {
    min: 0,
    max: 29,
    level: 'Крайне высокий риск',
    recommendation: 'Работа только по полной предоплате.',
    paymentTerms: '100% предоплата',
  },
];

const clampScore = (score: number): number => {
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
};

const calculateYearsInOperation = (registrationDate?: string): number | null => {
  if (!registrationDate) return null;
  const registeredAt = new Date(registrationDate).getTime();
  if (Number.isNaN(registeredAt)) return null;
  const diff = Date.now() - registeredAt;
  return diff < 0 ? null : diff / ONE_YEAR_MS;
};

const wasChangedWithinYear = (changeDate?: string): boolean => {
  if (!changeDate) return false;
  const changedAt = new Date(changeDate).getTime();
  if (Number.isNaN(changedAt)) return false;
  return Date.now() - changedAt <= ONE_YEAR_MS;
};

const resolveBand = (score: number) => {
  return RISK_BANDS.find((band) => score >= band.min && score <= band.max) ?? RISK_BANDS.at(-1)!;
};

/**
 * Рассчитывает скоринговый балл и рекомендацию по профилю компании.
 * Функция реализует правила из технического задания: базовый балл 50,
 * взвешенные корректировки по возрасту, статусу, финансам, судебной и
 * управленческой активности, а также структурным признакам.
 */
export const scoreCompany = (profile: CompanyProfile): ScoringResult => {
  let score = BASE_SCORE;
  const positives: string[] = [];
  const negatives: string[] = [];

  const years = calculateYearsInOperation(profile.registrationDate);

  // Юридический статус
  const status = profile.stateStatus?.toUpperCase();
  if (status === 'LIQUIDATED' || status === 'LIQUIDATING' || status === 'BANKRUPT') {
    score -= 25;
    negatives.push('Компания в ликвидации/банкротстве');
  } else if (status && status !== 'ACTIVE') {
    score -= 10;
    negatives.push(`Статус: ${status}`);
  }

  if (profile.hasUnreliableInfo) {
    score -= 20;
    negatives.push('Недостоверность сведений (ФНС)');
  }

  // Возраст компании
  if (years !== null) {
    if (years < 1) {
      score -= 15;
      negatives.push('Возраст компании менее 1 года');
    } else if (years < 3) {
      score -= 5;
      negatives.push('Возраст компании 1-3 года');
    } else if (years >= 10 && years < 20) {
      score += 5;
      positives.push('Возраст компании 10-20 лет');
    } else if (years >= 20) {
      score += 10;
      positives.push('Возраст компании более 20 лет');
    }
  }

  // Юридический адрес и изменения
  if (profile.isMassAddress) {
    score -= 10;
    negatives.push('Массовый юридический адрес');
  }

  if (years && years > 1 && wasChangedWithinYear(profile.managementChangeDate)) {
    score -= 5;
    negatives.push('Смена директора в последний год');
  }

  if (years && years > 1 && wasChangedWithinYear(profile.addressChangeDate)) {
    score -= 5;
    negatives.push('Смена юридического адреса в последний год');
  }

  // Капитал
  if (typeof profile.capital === 'number') {
    if (profile.capital <= 10_000) {
      score -= 5;
      negatives.push('Минимальный уставный капитал');
    } else if (profile.capital >= 1_000_000) {
      score += 5;
      positives.push('Крупный уставный капитал');
    }
  }

  // Численность сотрудников
  if (typeof profile.employees === 'number') {
    if (profile.employees <= 1) {
      score -= 10;
      negatives.push('0-1 сотрудник');
    } else if (profile.employees > 50) {
      score += 5;
      positives.push('Штат более 50 сотрудников');
    }
  }

  // Финансовые показатели
  const finance = profile.finance;
  if (finance) {
    if (typeof finance.profit === 'number') {
      if (finance.profit < 0) {
        score -= 5;
        negatives.push('Отрицательный финансовый результат');
      } else if (finance.profit > 0) {
        score += 5;
        positives.push('Положительный финансовый результат');
      }
    }

    if (typeof finance.revenue === 'number') {
      if (finance.revenue < 1_000_000) {
        score -= 5;
        negatives.push('Низкая выручка (<1 млн ₽)');
      } else if (finance.revenue >= 10_000_000 && finance.revenue < 100_000_000) {
        score += 3;
        positives.push('Стабильная выручка 10-100 млн ₽');
      } else if (finance.revenue >= 100_000_000) {
        score += 5;
        positives.push('Крупная выручка (≥100 млн ₽)');
      }
    }

    if (typeof finance.netAssets === 'number' && finance.netAssets < 0) {
      score -= 10;
      negatives.push('Отрицательные чистые активы');
    }
  }

  // Долги и задолженность
  if (profile.taxArrears) {
    score -= 10;
    negatives.push('Задолженность по налогам');
  }

  if (profile.taxPenalties) {
    score -= 5;
    negatives.push('Штрафы и пени');
  }

  if (profile.bankAccountBlocked) {
    score -= 20;
    negatives.push('Блокировка счетов (ФНС)');
  }

  const enforcement = profile.enforcement;
  if (enforcement) {
    const count = enforcement.count ?? 0;
    const totalAmount = enforcement.totalAmount ?? 0;
    if (count > 0) {
      score -= 5;
      negatives.push('Есть исполнительные производства');
      if (count > 5 || totalAmount > ENFORCEMENT_SERIOUS_AMOUNT) {
        score -= 5;
        negatives.push('Множественные или крупные исполнительные производства');
      }
    }
  }

  if (profile.inRnp) {
    score -= 20;
    negatives.push('Включена в РНП');
  }

  // Судебная активность
  const arbitration = profile.arbitration;
  if (arbitration) {
    const casesAsDefendant = arbitration.casesAsDefendant ?? 0;
    if (casesAsDefendant > 5) {
      score -= 10;
      negatives.push('Множество арбитражных дел (>5)');
    } else if (casesAsDefendant === 0 && years && years >= 3) {
      score += 5;
      positives.push('Нет арбитражных дел (компания старше 3 лет)');
    }

    if (arbitration.lostCaseAmount && arbitration.lostCaseAmount > ENFORCEMENT_SERIOUS_AMOUNT) {
      score -= 10;
      negatives.push('Крупные проигранные арбитражные дела');
    }
  }

  // Менеджмент и управление
  if (profile.disqualifiedDirector) {
    score -= 25;
    negatives.push('Дисквалифицированный директор');
  }

  if (profile.disqualifiedFounder) {
    score -= 25;
    negatives.push('Дисквалифицированный учредитель');
  }

  if (profile.massManagerCount && profile.massManagerCount > 10) {
    score -= 15;
    negatives.push('Массовый руководитель (>10 компаний)');
  }

  if (profile.massFounderCount && profile.massFounderCount > 10) {
    score -= 15;
    negatives.push('Массовый учредитель (>10 компаний)');
  }

  if (profile.bankruptcyHistoryCount && profile.bankruptcyHistoryCount >= 3) {
    score -= 10;
    negatives.push('Связанные лица участвовали в множественных ликвидациях');
  }

  // Структура и репутация
  if (profile.branchCount && profile.branchCount > 3) {
    score += 5;
    positives.push('Развитая сеть филиалов');
  }

  if (profile.isPartOfHolding) {
    score += 5;
    positives.push('Принадлежность крупному холдингу');
  }

  if (profile.isSystemicallyImportant) {
    score += 5;
    positives.push('Системно значимая компания');
  }

  if (profile.isPublicCompany) {
    score += 5;
    positives.push('Публичное акционерное общество');
  }

  // Отсутствие негативных маркеров
  if (!negatives.length && status === 'ACTIVE') {
    score += 5;
    positives.push('Не выявлено негативных маркеров');
  }

  const finalScore = clampScore(score);
  const band = resolveBand(finalScore);

  return {
    baseScore: BASE_SCORE,
    finalScore,
    level: band.level,
    recommendation: band.recommendation,
    paymentTerms: band.paymentTerms,
    positives,
    negatives,
  };
};
