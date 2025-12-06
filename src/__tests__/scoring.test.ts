import { scoreCompany, CompanyProfile } from '../lib/scoring';

describe('scoreCompany', () => {
  it('awards a top score and positive markers for a stable blue-chip company', () => {
    const profile: CompanyProfile = {
      registrationDate: new Date('1995-01-10').toISOString(),
      stateStatus: 'ACTIVE',
      capital: 50_000_000,
      employees: 120,
      finance: {
        profit: 250_000_000,
        revenue: 1_200_000_000,
        netAssets: 900_000_000,
      },
      branchCount: 8,
      isPublicCompany: true,
      isPartOfHolding: true,
      isSystemicallyImportant: true,
    };

    const result = scoreCompany(profile);

    expect(result.finalScore).toBeGreaterThanOrEqual(95);
    expect(result.level).toBe('Наивысшая надёжность');
    expect(result.positives).toEqual(
      expect.arrayContaining([
        'Возраст компании более 20 лет',
        'Крупный уставный капитал',
        'Штат более 50 сотрудников',
        'Положительный финансовый результат',
        'Крупная выручка (≥100 млн ₽)',
        'Развитая сеть филиалов',
        'Публичное акционерное общество',
        'Принадлежность крупному холдингу',
        'Системно значимая компания',
      ]),
    );
    expect(result.negatives).toHaveLength(0);
  });

  it('returns a critical risk score for a distressed newcomer with heavy issues', () => {
    const monthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();
    const profile: CompanyProfile = {
      registrationDate: monthsAgo,
      stateStatus: 'LIQUIDATING',
      capital: 10_000,
      employees: 1,
      finance: {
        profit: -2_000_000,
        revenue: 500_000,
        netAssets: -3_000_000,
      },
      taxArrears: true,
      taxPenalties: true,
      bankAccountBlocked: true,
      enforcement: { count: 8, totalAmount: 2_500_000 },
      inRnp: true,
      arbitration: { casesAsDefendant: 12, lostCaseAmount: 2_000_000 },
      disqualifiedDirector: true,
      disqualifiedFounder: true,
      massManagerCount: 20,
      massFounderCount: 15,
      bankruptcyHistoryCount: 5,
    };

    const result = scoreCompany(profile);

    expect(result.finalScore).toBeLessThan(30);
    expect(result.level).toBe('Крайне высокий риск');
    expect(result.negatives.length).toBeGreaterThanOrEqual(10);
  });

  it('calculates a mid-risk profile when positives and negatives balance out', () => {
    const profile: CompanyProfile = {
      registrationDate: new Date('2014-05-01').toISOString(),
      stateStatus: 'ACTIVE',
      capital: 2_000_000,
      employees: 40,
      finance: {
        profit: 1_500_000,
        revenue: 55_000_000,
        netAssets: 5_000_000,
      },
      taxArrears: true,
      enforcement: { count: 2, totalAmount: 150_000 },
      arbitration: { casesAsDefendant: 1, lostCaseAmount: 200_000 },
    };

    const result = scoreCompany(profile);

    expect(result.finalScore).toBeGreaterThanOrEqual(50);
    expect(result.finalScore).toBeLessThanOrEqual(74);
    expect(['Средний риск', 'Умеренный риск']).toContain(result.level);
    expect(result.positives).toEqual(
      expect.arrayContaining([
        'Крупный уставный капитал',
        'Положительный финансовый результат',
        'Стабильная выручка 10-100 млн ₽',
      ]),
    );
    expect(result.negatives).toEqual(expect.arrayContaining(['Задолженность по налогам']));
  });
});
