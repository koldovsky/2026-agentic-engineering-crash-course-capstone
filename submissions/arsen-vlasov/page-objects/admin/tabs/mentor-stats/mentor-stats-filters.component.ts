import { Locator, Page } from '@playwright/test';
import { step } from '@/utils/step-decorator';
import { BaseFiltersComponent } from '@/page-objects/admin/components/table/base-filters.component';
import { expectContainText, expectVisible } from '@/utils/assertions/ui-assertions';
import { ADMIN_MENTOR_STATS } from '@/utils/constants/admin/mentor-stats';
import { AdminMonolithRoutes } from '@/utils/constants/routes';
import { DateHelper } from '@/utils/helpers/date-helper';

export type MentorStatsRange = {
  yearFrom: string;
  yearTo: string;
  monthFrom: string;
  monthTo: string;
};

export class MentorStatsFiltersComponent extends BaseFiltersComponent {
  private readonly yearFromField: Locator;
  private readonly yearToField: Locator;
  private readonly monthFromField: Locator;
  private readonly monthToField: Locator;
  private readonly mentorField: Locator;
  private readonly itemsPerPageField: Locator;

  constructor(page: Page, container?: Locator) {
    super(page, container);
    this.yearFromField = this.filtersRoot.getByTestId(ADMIN_MENTOR_STATS.TEST_ID.YEAR_FROM);
    this.yearToField = this.filtersRoot.getByTestId(ADMIN_MENTOR_STATS.TEST_ID.YEAR_TO);
    this.monthFromField = this.filtersRoot.getByTestId(ADMIN_MENTOR_STATS.TEST_ID.MONTH_FROM);
    this.monthToField = this.filtersRoot.getByTestId(ADMIN_MENTOR_STATS.TEST_ID.MONTH_TO);
    this.mentorField = this.filtersRoot.getByTestId(ADMIN_MENTOR_STATS.TEST_ID.MENTOR).first();
    this.itemsPerPageField = this.filtersRoot.getByTestId(ADMIN_MENTOR_STATS.TEST_ID.ITEMS_PER_PAGE).first();
  }

  protected get applyButton(): Locator {
    return this.filtersRoot.getByTestId(ADMIN_MENTOR_STATS.TEST_ID.APPLY);
  }

  @step
  async clickApply(): Promise<void> {
    const pending = this.page.waitForResponse(
      (response) =>
        response.url().includes(AdminMonolithRoutes.MentorChatStats) &&
        response.request().method() === 'GET' &&
        response.ok(),
      { timeout: DateHelper.secondsToMs(15) },
    );
    await super.clickApply();
    await pending;
  }

  private async pickOption(field: Locator, option: string, description: string): Promise<void> {
    await expectVisible(field, description);
    await field.click();

    const listOption = this.page
      .locator('.v-overlay-container .v-list-item')
      .filter({ hasText: new RegExp(`^\\s*${option}\\s*$`) })
      .first();

    await expectVisible(listOption, `${description} option "${option}"`);
    await listOption.click();
    await expectContainText(field, option, `${description} should show "${option}"`);
  }

  /**
   * Year/month + Apply are the controls every mentor-stats spec needs on load.
   * Mentor and items-per-page live in the same block; TC-84 asserts them via
   * `shouldSeeMentorAndPageSizeFilters` (the combobox lists only the first 20 mentors).
   */
  @step
  async shouldSeeFiltersVisible(): Promise<void> {
    await expectVisible(this.yearFromField, 'Year from filter');
    await expectVisible(this.yearToField, 'Year to filter');
    await expectVisible(this.monthFromField, 'Month from filter');
    await expectVisible(this.monthToField, 'Month to filter');
    await expectVisible(this.applyButton, 'Apply filters button');
  }

  @step
  async shouldSeeMentorAndPageSizeFilters(): Promise<void> {
    await expectVisible(this.mentorField, 'Mentor filter');
    await expectVisible(this.itemsPerPageField, 'Items per page filter');
  }

  @step
  async selectListedMentor(preferredNames: string[]): Promise<string> {
    await expectVisible(this.mentorField, 'Mentor filter');
    await this.mentorField.click();

    const items = this.page.locator('.v-overlay-container .v-list-item');
    await expectVisible(items.first(), 'Mentor filter options');

    const options = (await items.allTextContents())
      .map((text) => text.replace(/\s+/g, ' ').trim())
      .filter((text) => text.length > 0 && text !== 'null null');
    const selected = preferredNames.find((name) => options.includes(name)) ?? options[0];
    if (!selected) {
      throw new Error('Mentor combobox should list at least one named mentor');
    }

    const option = items.filter({ hasText: new RegExp(`^\\s*${escapeRegExp(selected)}\\s*$`) }).first();
    await expectVisible(option, `Mentor option "${selected}"`);
    await option.click();
    await expectContainText(this.mentorField, selected, `Mentor filter should show "${selected}"`);

    return selected;
  }

  @step
  async clearMentor(): Promise<void> {
    await expectVisible(this.mentorField, 'Mentor filter');
    const clearButton = this.mentorField.getByRole('button', { name: /Clear/i }).first();
    await expectVisible(clearButton, 'Mentor filter clear button');
    await clearButton.click();
  }

  @step
  async setRange(range: MentorStatsRange): Promise<void> {
    await this.pickOption(this.yearFromField, range.yearFrom, 'Year from');
    await this.pickOption(this.yearToField, range.yearTo, 'Year to');
    await this.pickOption(this.monthFromField, range.monthFrom, 'Month from');
    await this.pickOption(this.monthToField, range.monthTo, 'Month to');
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
