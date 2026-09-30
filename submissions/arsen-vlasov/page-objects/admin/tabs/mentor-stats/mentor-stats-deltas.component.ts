import { expect } from '@playwright/test';
import { step } from '@/utils/step-decorator';
import { DateHelper } from '@/utils/helpers/date-helper';
import type { MentorStatsPage } from '@/page-objects/admin/tabs/mentor-stats/mentor-stats-page';
import type { MentorPeriod, MentorRowStats } from '@/utils/types/api/admin/mentor-chat-stats';

type RowRef = { adminId: string; period: MentorPeriod };

/**
 * Counter changes of one mentor's row on the stats page. The backend recalculates asynchronously,
 * so a delta check reopens the row until it matches or 30 s pass.
 */
export class MentorStatsDeltasComponent {
  constructor(private readonly statsPage: MentorStatsPage) {}

  /**
   * Every counter named in `delta` changed by exactly that much; the others are not checked.
   * `explain` goes first in the failure message: say what the check means for the product.
   */
  @step
  async shouldSeeStatsDelta(
    params: RowRef & {
      baseline: MentorRowStats;
      delta: Partial<MentorRowStats>;
      explain?: string;
    },
  ): Promise<void> {
    const { baseline, delta, explain } = params;
    if (Object.keys(delta).length === 0) {
      throw new Error(
        'shouldSeeStatsDelta needs at least one counter; an empty delta checks nothing',
      );
    }

    await expect(async () => {
      const current = await this.readRow(params);

      for (const [counter, change] of Object.entries(delta) as [keyof MentorRowStats, number][]) {
        expect(
          current[counter] - baseline[counter],
          `${explain ? `${explain}. ` : ''}${counter} should change by ${change} (baseline ${baseline[counter]}, current ${current[counter]})`,
        ).toBe(change);
      }
    }).toPass({ timeout: DateHelper.secondsToMs(30) });
  }

  /**
   * The counters stay at `baseline + delta` for the whole window — the check for an action that
   * must NOT count. `toPass` cannot prove an absence: it would pass before the backend recalculates.
   * Fails on the first read that differs.
   */
  @step
  async shouldSeeStatsHold(
    params: RowRef & {
      baseline: MentorRowStats;
      delta: Partial<MentorRowStats>;
      explain: string;
    },
  ): Promise<void> {
    const { baseline, delta, explain } = params;
    const deadline = Date.now() + DateHelper.secondsToMs(15);

    do {
      const current = await this.readRow(params);
      for (const [counter, change] of Object.entries(delta) as [keyof MentorRowStats, number][]) {
        const actual = current[counter] - baseline[counter];
        expect(
          actual,
          `${explain}. ${counter} changed by ${actual}, expected ${change} (baseline ${baseline[counter]}, current ${current[counter]})`,
        ).toBe(change);
      }
    } while (Date.now() < deadline);
  }

  private async readRow(params: RowRef): Promise<MentorRowStats> {
    await this.statsPage.openForMentor({
      adminId: params.adminId,
      period: params.period,
    });
    return this.statsPage.readStatsForMentor();
  }
}
