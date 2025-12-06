/**
 * Tests for Telegram Bot Utilities
 */

import {
  validateINN,
  validateOGRN,
  validateInnOrOgrn,
  validateDate,
  validateFullName,
  parseIndividualData,
  parseContractData,
  calculateCompanyScoring,
  formatScoringResult,
  isSessionExpired,
  getCurrentTimestamp,
} from '../utils/telegram-bot.utils';

import { RiskLevel, DaDataCompanyData } from '../types/telegram-bot.types';

describe('Telegram Bot Utilities', () => {
  describe('validateINN', () => {
    it('should validate 10-digit INN', () => {
      expect(validateINN('1234567890')).toBe(true);
    });

    it('should validate 12-digit INN', () => {
      expect(validateINN('123456789012')).toBe(true);
    });

    it('should reject invalid INN formats', () => {
      expect(validateINN('123')).toBe(false);
      expect(validateINN('12345678901')).toBe(false);
      expect(validateINN('1234567890123')).toBe(false);
      expect(validateINN('abc1234567890')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(validateINN(' 1234567890 ')).toBe(true);
    });
  });

  describe('validateOGRN', () => {
    it('should validate 13-digit OGRN', () => {
      expect(validateOGRN('1234567890123')).toBe(true);
    });

    it('should validate 15-digit OGRN', () => {
      expect(validateOGRN('123456789012345')).toBe(true);
    });

    it('should reject invalid OGRN formats', () => {
      expect(validateOGRN('123')).toBe(false);
      expect(validateOGRN('12345678901234')).toBe(false);
      expect(validateOGRN('abc1234567890123')).toBe(false);
    });
  });

  describe('validateInnOrOgrn', () => {
    it('should validate INN or OGRN', () => {
      expect(validateInnOrOgrn('1234567890')).toBe(true);
      expect(validateInnOrOgrn('123456789012')).toBe(true);
      expect(validateInnOrOgrn('1234567890123')).toBe(true);
      expect(validateInnOrOgrn('123456789012345')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateInnOrOgrn('123')).toBe(false);
      expect(validateInnOrOgrn('12345678901')).toBe(false);
    });
  });

  describe('validateDate', () => {
    it('should validate correct date format', () => {
      expect(validateDate('01.01.2024')).toBe(true);
      expect(validateDate('31.12.2023')).toBe(true);
      expect(validateDate('15.06.1990')).toBe(true);
    });

    it('should reject invalid date formats', () => {
      expect(validateDate('2024-01-01')).toBe(false);
      expect(validateDate('1/1/2024')).toBe(false);
      expect(validateDate('32.01.2024')).toBe(false);
      expect(validateDate('01.13.2024')).toBe(false);
      expect(validateDate('invalid')).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(validateDate('31.02.2024')).toBe(false);
      expect(validateDate('30.02.2024')).toBe(false);
    });
  });

  describe('validateFullName', () => {
    it('should validate full names with at least 2 words', () => {
      expect(validateFullName('Иванов Иван')).toBe(true);
      expect(validateFullName('Иванов Иван Иванович')).toBe(true);
      expect(validateFullName('Петров Петр Петрович Младший')).toBe(true);
    });

    it('should reject names with less than 2 words', () => {
      expect(validateFullName('Иванов')).toBe(false);
      expect(validateFullName('')).toBe(false);
    });

    it('should handle extra whitespace', () => {
      expect(validateFullName('  Иванов   Иван  ')).toBe(true);
    });
  });

  describe('parseIndividualData', () => {
    it('should parse valid individual data', () => {
      const result = parseIndividualData('Иванов Иван Иванович, 01.01.1990, 123456789012');
      expect(result).toEqual({
        fullName: 'Иванов Иван Иванович',
        birthDate: '01.01.1990',
        inn: '123456789012',
      });
    });

    it('should return null for invalid format', () => {
      expect(parseIndividualData('Invalid data')).toBeNull();
      expect(parseIndividualData('Name, Date')).toBeNull();
      expect(parseIndividualData('Name, 01.01.1990')).toBeNull();
    });

    it('should return null for invalid components', () => {
      expect(parseIndividualData('Name, invalid-date, 123456789012')).toBeNull();
      expect(parseIndividualData('Иванов Иван, 01.01.1990, 123')).toBeNull();
    });
  });

  describe('parseContractData', () => {
    it('should parse valid contract data', () => {
      const result = parseContractData('Д-12345, 01.12.2024, 100000');
      expect(result).toEqual({
        contractNumber: 'Д-12345',
        contractDate: '01.12.2024',
        amount: '100000',
      });
    });

    it('should return null for invalid format', () => {
      expect(parseContractData('Invalid data')).toBeNull();
      expect(parseContractData('Number, Date')).toBeNull();
    });

    it('should return null for invalid date', () => {
      expect(parseContractData('Д-12345, invalid-date, 100000')).toBeNull();
    });
  });

  describe('calculateCompanyScoring', () => {
    it('should calculate high score for active company', () => {
      const companyData: DaDataCompanyData = {
        name: { short_with_opf: 'ООО "Тест"' },
        inn: '1234567890',
        ogrn: '1234567890123',
        state: {
          status: 'ACTIVE',
          registration_date: '2020-01-01',
        },
        capital: { value: '100000' },
        okved: '62.01',
        management: { name: 'Иванов И.И.' },
        address: {
          value: 'г. Москва, ул. Тестовая, д. 1',
          data: { qc_geo: '0' },
        },
      };

      const result = calculateCompanyScoring(companyData);
      
      expect(result.score).toBeGreaterThan(70);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.companyName).toBe('ООО "Тест"');
      expect(result.inn).toBe('1234567890');
      expect(result.ogrn).toBe('1234567890123');
    });

    it('should calculate low score for liquidated company', () => {
      const companyData: DaDataCompanyData = {
        name: { short_with_opf: 'ООО "Ликвидация"' },
        inn: '1234567890',
        state: {
          status: 'LIQUIDATED',
        },
      };

      const result = calculateCompanyScoring(companyData);
      
      expect(result.score).toBeLessThan(50);
      expect(result.riskLevel).toBe(RiskLevel.CRITICAL);
      expect(result.recommendations).toContain('⛔ Компания ликвидирована');
    });

    it('should penalize newly registered companies', () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 3);

      const companyData: DaDataCompanyData = {
        name: { short_with_opf: 'ООО "Новая"' },
        state: {
          status: 'ACTIVE',
          registration_date: recentDate.toISOString().split('T')[0],
        },
      };

      const result = calculateCompanyScoring(companyData);
      
      expect(result.score).toBeLessThan(80);
      expect(result.recommendations.some((r) => r.includes('6 месяцев'))).toBe(true);
    });

    it('should penalize low authorized capital', () => {
      const companyData: DaDataCompanyData = {
        name: { short_with_opf: 'ООО "Малый капитал"' },
        state: { status: 'ACTIVE' },
        capital: { value: '5000' },
      };

      const result = calculateCompanyScoring(companyData);
      
      expect(result.recommendations.some((r) => r.includes('Низкий уставный капитал'))).toBe(true);
    });

    it('should penalize mass registration address', () => {
      const companyData: DaDataCompanyData = {
        name: { short_with_opf: 'ООО "Массовый адрес"' },
        state: { status: 'ACTIVE' },
        address: {
          value: 'г. Москва, ул. Массовая, д. 1',
          data: { qc_geo: '4' },
        },
      };

      const result = calculateCompanyScoring(companyData);
      
      expect(result.recommendations.some((r) => r.includes('массовой регистрации'))).toBe(true);
    });
  });

  describe('formatScoringResult', () => {
    it('should format scoring result correctly', () => {
      const result = {
        score: 85,
        riskLevel: RiskLevel.LOW,
        recommendations: ['✅ Проверка пройдена успешно'],
        details: ['Статус: ✅ Активна', 'ИНН: 1234567890'],
        companyName: 'ООО "Тест"',
        inn: '1234567890',
        ogrn: '1234567890123',
      };

      const formatted = formatScoringResult(result);
      
      expect(formatted).toContain('ООО "Тест"');
      expect(formatted).toContain('85/100');
      expect(formatted).toContain('Низкий');
      expect(formatted).toContain('✅ Проверка пройдена успешно');
      expect(formatted).toContain('1234567890');
    });

    it('should include all risk levels correctly', () => {
      const riskLevels = [
        RiskLevel.LOW,
        RiskLevel.MEDIUM,
        RiskLevel.HIGH,
        RiskLevel.CRITICAL,
      ];

      riskLevels.forEach((riskLevel) => {
        const result = {
          score: 50,
          riskLevel,
          recommendations: [],
          details: [],
          companyName: 'Test',
        };

        const formatted = formatScoringResult(result);
        expect(formatted).toBeTruthy();
        expect(formatted.length).toBeGreaterThan(0);
      });
    });
  });

  describe('isSessionExpired', () => {
    it('should return false for recent timestamp', () => {
      const recentTimestamp = getCurrentTimestamp();
      expect(isSessionExpired(recentTimestamp)).toBe(false);
    });

    it('should return true for old timestamp', () => {
      const oldTimestamp = getCurrentTimestamp() - 31 * 60 * 1000; // 31 minutes ago
      expect(isSessionExpired(oldTimestamp)).toBe(true);
    });

    it('should use custom expiry time', () => {
      const timestamp = getCurrentTimestamp() - 11 * 60 * 1000; // 11 minutes ago
      expect(isSessionExpired(timestamp, 10)).toBe(true);
      expect(isSessionExpired(timestamp, 20)).toBe(false);
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should return a valid timestamp', () => {
      const timestamp = getCurrentTimestamp();
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
    });

    it('should return current time', () => {
      const timestamp = getCurrentTimestamp();
      const now = Date.now();
      expect(Math.abs(timestamp - now)).toBeLessThan(100); // Within 100ms
    });
  });
});
