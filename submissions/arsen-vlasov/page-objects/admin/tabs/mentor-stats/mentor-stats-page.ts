import { expect, Locator, Page } from '@playwright/test';
import { step } from '@/utils/step-decorator';
import { AdminBasePage } from '@/page-objects/admin/admin-base-page';
import { BaseTableComponent } from '@/page-objects/admin/components/table/base-table.component';
import {
  MentorStatsFiltersComponent,
  MentorStatsRange,
} from '@/page-objects/admin/tabs/mentor-stats/mentor-stats-filters.component';
import { MentorStatsDeltasComponent } from '@/page-objects/admin/tabs/mentor-stats/mentor-stats-deltas.component';
import {
  ADMIN_MENTOR_STATS,
  MENTOR_STATS_COLUMN,
  MENTOR_STATS_MONTH_YEAR,
} from '@/utils/constants/admin/mentor-stats';
import { AdminSidebarTab } from '@/utils/constants/admin/admin-sidebar-navigation';
import { EnvManager } from '@/config/managers/env-manager';
import { DateHelper } from '@/utils/helpers/date-helper';
import { expectContainText } from '@/utils/assertions/ui-assertions';
import type { MentorPeriod, MentorRowStats } from '@/utils/types/api/admin/mentor-chat-stats';

type MentorSortRow = {
  mentor: string;
  monthLabel: string;
  periodKey: number;
  closedHomework: number;
};

/** Mentors without a filled-in profile render as «null null» and sort before the named ones. */
const UNNAMED_MENTOR = 'null null';

/** A mentor with no activity in the period simply has no row in the table. */
const NO_ACTIVITY: MentorRowStats = {
  openQuestions: 0,
  closedQuestions: 0,
  openHomework: 0,
  closedHomework: 0,
  answersHomework: 0,
};

export class MentorStatsPage extends AdminBasePage {
  readonly table: BaseTableComponent;
  readonly filters: MentorStatsFiltersComponent;
  readonly deltas = new MentorStatsDeltasComponent(this);

  private readonly card: Locator;
  private readonly heading: Locator;

  constructor(page: Page) {
    super(page);
    this.card = page.getByTestId(ADMIN_MENTOR_STATS.TEST_ID.CARD);
    this.heading = page.getByTestId(ADMIN_MENTOR_STATS.TEST_ID.TITLE);
    this.table = new BaseTableComponent(page, this.card.locator('.v-data-table').first());
    this.filters = new MentorStatsFiltersComponent(page, this.card);
  }

  @step
  async shouldSeePage(): Promise<void> {
    await expectContainText(this.heading, ADMIN_MENTOR_STATS.HEADING, 'Mentor stats heading');
    await this.filters.shouldSeeFiltersVisible();
    await this.table.waitForTableLoad();
  }

  @step
  async shouldSeeTableColumns(): Promise<void> {
    await this.table.shouldSeeColumnHeaders(...ADMIN_MENTOR_STATS.COLUMNS);
  }

  @step
  async shouldSeeTableStructure(): Promise<void> {
    await this.shouldSeeTableColumns();
    const rows = await this.readSortRows();
    expect(rows.length, 'Mentor stats table should have at least one row').toBeGreaterThan(0);

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      expect(
        MENTOR_STATS_MONTH_YEAR.test(row.monthLabel),
        `Period cell "${row.monthLabel}" should look like «Май 2025»`,
      ).toBe(true);
      expect(row.mentor.length, `Mentor cell should contain a name (got "${row.mentor}")`).toBeGreaterThan(
        0,
      );

      for (const column of METRIC_COLUMNS) {
        const text = (await this.table.getCellText(index, column)).trim();
        expect(/^\d+$/.test(text), `Row ${index} column ${column} should be a number (got "${text}")`).toBe(
          true,
        );
      }
    }
  }

  /**
   * Backend contract for /mentor-chat-stats:
   * year DESC → month DESC → «Закр. ДЗ» DESC → mentor first name ASC.
   */
  @step
  async shouldSeeSortedByPeriodThenMentor(): Promise<void> {
    const rows = await this.readSortRows();
    expect(rows.length, 'Mentor stats table should have at least one row').toBeGreaterThan(0);

    for (let index = 1; index < rows.length; index += 1) {
      const prev = rows[index - 1];
      const curr = rows[index];

      if (prev.periodKey !== curr.periodKey) {
        expect(
          prev.periodKey > curr.periodKey,
          `Row ${index}: period "${curr.monthLabel}" should follow "${prev.monthLabel}" in descending order`,
        ).toBe(true);
        continue;
      }

      if (prev.closedHomework !== curr.closedHomework) {
        expect(
          prev.closedHomework > curr.closedHomework,
          `Row ${index}: closed homework ${curr.closedHomework} should follow ${prev.closedHomework} in descending order`,
        ).toBe(true);
        continue;
      }

      if (prev.mentor === UNNAMED_MENTOR || curr.mentor === UNNAMED_MENTOR) {
        continue;
      }

      expect(
        compareMentorFirstName(prev.mentor, curr.mentor),
        `Row ${index}: mentor "${curr.mentor}" should sort at or after "${prev.mentor}"`,
      ).toBeLessThanOrEqual(0);
    }
  }

  /**
   * The page reads its filters from the query string, and `filter.mentor.adminId` narrows the
   * table to a single row. The «Ментор» combobox in the UI cannot do this: it offers only the
   * first 20 mentors, with no search and no lazy loading.
   */
  @step
  async openForMentor(params: { adminId: string; period: MentorPeriod }): Promise<void> {
    const { adminId, period } = params;
    const baseUrl = EnvManager.getInstance().adminUrl.replace(/\/+$/, '');
    const query = [
      'page=1',
      `limit=${ADMIN_MENTOR_STATS.PAGE_SIZE}`,
      `filter.year=$btw:${period.year},${period.year}`,
      `filter.month=$btw:${period.month},${period.month}`,
      `filter.mentor.adminId=$eq:${adminId}`,
    ].join('&');

    await this.page.goto(
      `${baseUrl}${AdminSidebarTab.RESOURCES.MENTOR_STATS.href}?${query}`,
    );
    await this.shouldSeePage();
  }

  @step
  async readStatsForMentor(): Promise<MentorRowStats> {
    if ((await this.table.getRowsCount()) === 0) {
      return NO_ACTIVITY;
    }

    const row = this.table.getRowByIndex(0);

    return {
      openQuestions: await readCellNumber(row, MENTOR_STATS_COLUMN.OPEN_QUESTIONS),
      closedQuestions: await readCellNumber(row, MENTOR_STATS_COLUMN.CLOSED_QUESTIONS),
      openHomework: await readCellNumber(row, MENTOR_STATS_COLUMN.OPEN_HOMEWORK),
      closedHomework: await readCellNumber(row, MENTOR_STATS_COLUMN.CLOSED_HOMEWORK),
      answersHomework: await readCellNumber(row, MENTOR_STATS_COLUMN.ANSWERS_HOMEWORK),
    };
  }

  @step
  async shouldSeeOpenQuestionsDelta(params: {
    adminId: string;
    period: MentorPeriod;
    baseline: MentorRowStats;
    delta: number;
  }): Promise<void> {
    const { adminId, period, baseline, delta } = params;

    await expect(async () => {
      await this.openForMentor({ adminId, period });
      const current = await this.readStatsForMentor();

      expect(
        current.openQuestions - baseline.openQuestions,
        `Open questions should change by ${delta} (baseline ${baseline.openQuestions}, current ${current.openQuestions})`,
      ).toBe(delta);
    }).toPass({ timeout: DateHelper.secondsToMs(30) });
  }

  @step
  async shouldSeeClosedQuestionsDelta(params: {
    adminId: string;
    period: MentorPeriod;
    baseline: MentorRowStats;
    delta: number;
  }): Promise<void> {
    const { adminId, period, baseline, delta } = params;

    await expect(async () => {
      await this.openForMentor({ adminId, period });
      const current = await this.readStatsForMentor();

      expect(
        current.closedQuestions - baseline.closedQuestions,
        `Closed questions should change by ${delta} (baseline ${baseline.closedQuestions}, current ${current.closedQuestions})`,
      ).toBe(delta);
      expect(
        current.openQuestions - baseline.openQuestions,
        `Open questions should change by ${-delta} (baseline ${baseline.openQuestions}, current ${current.openQuestions})`,
      ).toBe(-delta);
    }).toPass({ timeout: DateHelper.secondsToMs(30) });
  }

  @step
  async filterByPeriod(range: MentorStatsRange): Promise<void> {
    await this.filters.setRange(range);
    await this.filters.clickApply();
    await this.table.waitForTableLoad();
  }

  @step
  async shouldSeeMentorRowsInRange(range: {
    yearFrom: number;
    yearTo: number;
    monthFrom: number;
    monthTo: number;
  }): Promise<void> {
    const rows = await this.readSortRows();
    expect(rows.length, 'Filter should keep at least one row visible').toBeGreaterThan(0);

    const fromKey = range.yearFrom * 12 + range.monthFrom;
    const toKey = range.yearTo * 12 + range.monthTo;

    for (const row of rows) {
      expect(
        row.periodKey >= fromKey && row.periodKey <= toKey,
        `Row "${row.mentor} / ${row.monthLabel}" should be within the selected period`,
      ).toBe(true);
    }
  }

  private async readSortRows(): Promise<MentorSortRow[]> {
    const rowsCount = await this.table.getRowsCount();
    const rows: MentorSortRow[] = [];

    for (let index = 0; index < rowsCount; index += 1) {
      const monthLabel = (await this.table.getCellText(index, MENTOR_STATS_COLUMN.MONTH)).trim();
      const mentor = (await this.table.getCellText(index, MENTOR_STATS_COLUMN.MENTOR)).trim();
      const closedHomework = toNumber(
        await this.table.getCellText(index, MENTOR_STATS_COLUMN.CLOSED_HOMEWORK),
      );

      rows.push({ mentor, monthLabel, periodKey: parsePeriodKey(monthLabel), closedHomework });
    }

    return rows;
  }
}

async function readCellNumber(row: Locator, columnIndex: number): Promise<number> {
  return toNumber(await row.locator('td').nth(columnIndex).innerText());
}

const METRIC_COLUMNS = [
  MENTOR_STATS_COLUMN.OPEN_HOMEWORK,
  MENTOR_STATS_COLUMN.CLOSED_HOMEWORK,
  MENTOR_STATS_COLUMN.OPEN_QUESTIONS,
  MENTOR_STATS_COLUMN.CLOSED_QUESTIONS,
  MENTOR_STATS_COLUMN.ANSWERS_HOMEWORK,
  MENTOR_STATS_COLUMN.ANSWERS_QUESTIONS,
] as const;

function toNumber(text: string): number {
  const value = Number.parseInt(text.replace(/\D/g, ''), 10);
  return Number.isFinite(value) ? value : 0;
}

function compareMentorFirstName(left: string, right: string): number {
  const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';
  return firstName(left).localeCompare(firstName(right), 'ru', { sensitivity: 'base' });
}

/** The month cell renders as «Сентябрь 2026» — normalise to a comparable `year * 12 + month` key. */
function parsePeriodKey(label: string): number {
  const [monthName, year] = label.split(/\s+/);
  const monthIndex = ADMIN_MENTOR_STATS.MONTHS.findIndex(
    (name) => name.toLowerCase() === monthName?.toLowerCase(),
  );
  const parsedYear = Number.parseInt(year ?? '', 10);

  if (monthIndex < 0 || !Number.isFinite(parsedYear)) {
    throw new Error(`Unexpected month cell format: "${label}"`);
  }

  return parsedYear * 12 + (monthIndex + 1);
}
