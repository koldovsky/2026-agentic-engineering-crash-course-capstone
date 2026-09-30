import { baseAdminPanelExtendedTest as test } from '@/tests/specs/regression/admin-panel/base-admin-panel-extended';
import { AUTOTEST_ALLURE, AUTOTEST_PLAYWRIGHT_TAGS } from '@/utils/constants/autotest-labels';
import { linkTestCase } from '@/utils/helpers/allure-helper';
import { DateHelper } from '@/utils/helpers/date-helper';
import { labelSuite } from '@/utils/helpers/label-suite';
import { TestUserRegistry } from '@/utils/helpers/test-user-registry';
import { createStudentWithPendingHomework } from '@/tests/specs/regression/admin-panel/mentor-stats/helpers/mentor-stats-calculation';

// TODO: not automated — TC steps 9–10 (A→B→A), 17–18 (courses only, no ЖС), 19–21 (mentor inbox),
// 25–26 (group reassignment); question («Вопрос») variants of steps 3–16 — homework only here.
// TC steps 8 and 22–24 contradict story PRJ-2288 AC3 and stage; test 2 asserts AC3 (see docs/reviews).
// TC steps 13–14 (previous month frozen): not automated, by the human's decision of 2026-09-30.

const LONG_REPLY = '<p>Домашнее задание проверено, всё верно</p>';
/** Messages of 10 characters or more count (PRJ-6789): exactly 10 must count, 9 must not. */
const REPLY_10_CHARS = '<p>Дякую, ок!</p>';
const REPLY_9_CHARS = '<p>Дякую, ок</p>';

const testUserRegistry = new TestUserRegistry();

test.use({ adminUserKey: 'user_TC_69_admin' });

test.beforeEach(async () => {
  await labelSuite({ feature: AUTOTEST_ALLURE.feature.mentors });
  await linkTestCase(69, 114);
});

test.afterEach(async ({ runnerAdminApi, courseSetupHelper }) => {
  await testUserRegistry.cleanup({
    adminApi: runnerAdminApi,
    courseSetupHelper,
  });
});

test.describe(
  'Верифікація статистики менторів',
  {
    tag: [
      AUTOTEST_PLAYWRIGHT_TAGS.adminPanel,
      AUTOTEST_PLAYWRIGHT_TAGS.capability.mentors,
      AUTOTEST_PLAYWRIGHT_TAGS.capability.homework,
    ],
  },
  () => {
    test.describe.configure({ mode: 'default' });

    test('1. Первинний ментор: ДЗ рахується у відкритих, після закриття — у закритих', async ({
      adminUser,
      adminLoginPage,
      adminHomePage,
      userManager,
      adminApi,
      runnerAdminApi,
      courseSetupHelper,
      createLmsContext,
      adminAppealsApi,
      createAdminAppealsApiAs,
      mentorStatsPage,
      browser,
      envManager,
    }) => {
      const currentPeriod = DateHelper.getKyivCurrentPeriod();
      const mentor = userManager.getAdminUser('user_TC_69_mentor_a');
      const mentorId = await adminApi.getAdminIdByEmail(mentor.email);
      const otherMentorId = await adminApi.getAdminIdByEmail(
        userManager.getAdminUser('user_TC_69_mentor_b').email,
      );
      const mentorApi = await createAdminAppealsApiAs(mentor);

      const homework =
        await test.step('Precondition: студент здав ДЗ, адмін відкрив статистику', async () => {
          const pending = await createStudentWithPendingHomework({
            runnerAdminApi,
            courseSetupHelper,
            testUserRegistry,
            createLmsContext,
            adminAppealsApi,
            browser,
            lmsUrl: envManager.lmsUrl,
          });
          await adminLoginPage.authenticate(adminUser);
          await adminHomePage.shouldSeePage();
          return pending;
        });

      const [baseline, otherBaseline] =
        await test.step('Зчитати показники ментора та іншого ментора', async () => {
          await mentorStatsPage.openForMentor({
            adminId: mentorId,
            period: currentPeriod,
          });
          const own = await mentorStatsPage.readStatsForMentor();
          await mentorStatsPage.openForMentor({
            adminId: otherMentorId,
            period: currentPeriod,
          });
          return [own, await mentorStatsPage.readStatsForMentor()];
        });

      await test.step('Ментор відповідає першим — чат у «Откр. ДЗ», не в «Закр. ДЗ»', async () => {
        await mentorApi.postMentorHomeworkReply({
          ...homework,
          htmlText: LONG_REPLY,
        });
        await mentorStatsPage.deltas.shouldSeeStatsDelta({
          adminId: mentorId,
          period: currentPeriod,
          baseline,
          delta: { openHomework: 1, closedHomework: 0 },
        });
      });

      await test.step('Ментор закриває чат — чат у «Закр. ДЗ» тільки в нього', async () => {
        await mentorApi.closeHomeworkChat(homework.chatId);
        await mentorStatsPage.deltas.shouldSeeStatsDelta({
          adminId: mentorId,
          period: currentPeriod,
          baseline,
          delta: { openHomework: 0, closedHomework: 1 },
        });
        await mentorStatsPage.deltas.shouldSeeStatsDelta({
          adminId: otherMentorId,
          period: currentPeriod,
          baseline: otherBaseline,
          delta: { openHomework: 0, closedHomework: 0 },
        });
      });
    });

    test('2. Чат переназначений іншому ментору до закриття — рахується обом', async ({
      adminUser,
      adminLoginPage,
      adminHomePage,
      userManager,
      adminApi,
      runnerAdminApi,
      courseSetupHelper,
      createLmsContext,
      adminAppealsApi,
      createAdminAppealsApiAs,
      mentorStatsPage,
      browser,
      envManager,
    }) => {
      const currentPeriod = DateHelper.getKyivCurrentPeriod();
      const mentorA = userManager.getAdminUser('user_TC_69_mentor_a');
      const mentorB = userManager.getAdminUser('user_TC_69_mentor_b');
      const idA = await adminApi.getAdminIdByEmail(mentorA.email);
      const idB = await adminApi.getAdminIdByEmail(mentorB.email);
      const mentorAApi = await createAdminAppealsApiAs(mentorA);
      const mentorBApi = await createAdminAppealsApiAs(mentorB);

      const homework =
        await test.step('Precondition: студент здав ДЗ, адмін відкрив статистику', async () => {
          const pending = await createStudentWithPendingHomework({
            runnerAdminApi,
            courseSetupHelper,
            testUserRegistry,
            createLmsContext,
            adminAppealsApi,
            browser,
            lmsUrl: envManager.lmsUrl,
          });
          await adminLoginPage.authenticate(adminUser);
          await adminHomePage.shouldSeePage();
          return pending;
        });

      const [baselineA, baselineB] =
        await test.step('Зчитати показники обох менторів', async () => {
          await mentorStatsPage.openForMentor({
            adminId: idA,
            period: currentPeriod,
          });
          const a = await mentorStatsPage.readStatsForMentor();
          await mentorStatsPage.openForMentor({
            adminId: idB,
            period: currentPeriod,
          });
          return [a, await mentorStatsPage.readStatsForMentor()];
        });

      await test.step('Ментор A відповідає першим', async () => {
        await mentorAApi.postMentorHomeworkReply({
          ...homework,
          htmlText: LONG_REPLY,
        });
        await mentorStatsPage.deltas.shouldSeeStatsDelta({
          adminId: idA,
          period: currentPeriod,
          baseline: baselineA,
          delta: { openHomework: 1, closedHomework: 0, answersHomework: 1 },
        });
      });

      await test.step('Чат переназначено ментору B — у «Откр. ДЗ» в обох (PRJ-2288, user flow п.4)', async () => {
        await adminAppealsApi.reassignHomeworkAppealsToMentor({
          appealIds: [homework.appealId],
          courseId: homework.courseId,
          userManagerId: idB,
        });
        await mentorStatsPage.deltas.shouldSeeStatsDelta({
          adminId: idB,
          period: currentPeriod,
          baseline: baselineB,
          delta: { openHomework: 1 },
        });
        await mentorStatsPage.deltas.shouldSeeStatsDelta({
          adminId: idA,
          period: currentPeriod,
          baseline: baselineA,
          delta: { openHomework: 1 },
        });
      });

      await test.step('Ментор B закриває чат — у «Закр. ДЗ» в обох (PRJ-2288 AC3; кроки 8 і 22–24 кейсу суперечать)', async () => {
        await mentorBApi.closeHomeworkChat(homework.chatId);
        await mentorStatsPage.deltas.shouldSeeStatsDelta({
          adminId: idA,
          period: currentPeriod,
          baseline: baselineA,
          delta: { openHomework: 0, closedHomework: 1, answersHomework: 1 },
        });
        await mentorStatsPage.deltas.shouldSeeStatsDelta({
          adminId: idB,
          period: currentPeriod,
          baseline: baselineB,
          delta: { openHomework: 0, closedHomework: 1, answersHomework: 0 },
        });
      });
    });

    test('3. У «Ответы ДЗ» рахуються тільки повідомлення від 10 символів', async ({
      adminUser,
      adminLoginPage,
      adminHomePage,
      userManager,
      adminApi,
      runnerAdminApi,
      courseSetupHelper,
      createLmsContext,
      adminAppealsApi,
      createAdminAppealsApiAs,
      mentorStatsPage,
      browser,
      envManager,
    }) => {
      const currentPeriod = DateHelper.getKyivCurrentPeriod();
      const mentor = userManager.getAdminUser('user_TC_69_mentor_a');
      const mentorId = await adminApi.getAdminIdByEmail(mentor.email);
      const mentorApi = await createAdminAppealsApiAs(mentor);

      const homework =
        await test.step('Precondition: студент здав ДЗ, адмін відкрив статистику', async () => {
          const pending = await createStudentWithPendingHomework({
            runnerAdminApi,
            courseSetupHelper,
            testUserRegistry,
            createLmsContext,
            adminAppealsApi,
            browser,
            lmsUrl: envManager.lmsUrl,
          });
          await adminLoginPage.authenticate(adminUser);
          await adminHomePage.shouldSeePage();
          return pending;
        });

      const baseline = await test.step('Зчитати показники ментора', async () => {
        await mentorStatsPage.openForMentor({
          adminId: mentorId,
          period: currentPeriod,
        });
        return mentorStatsPage.readStatsForMentor();
      });

      await test.step('Ментор надсилає рівно 10 символів — повідомлення зараховано', async () => {
        await mentorApi.postMentorHomeworkReply({
          ...homework,
          htmlText: REPLY_10_CHARS,
        });
        await mentorStatsPage.deltas.shouldSeeStatsDelta({
          adminId: mentorId,
          period: currentPeriod,
          baseline,
          delta: { answersHomework: 1 },
          explain: 'Повідомлення рівно з 10 символів («Дякую, ок!») НЕ зараховано у «Ответы ДЗ»',
        });
      });

      await test.step('Ментор надсилає 9 символів — повідомлення не зараховано', async () => {
        await mentorApi.postMentorHomeworkReply({
          ...homework,
          htmlText: REPLY_9_CHARS,
        });
        await mentorStatsPage.deltas.shouldSeeStatsHold({
          adminId: mentorId,
          period: currentPeriod,
          baseline,
          delta: { answersHomework: 1 },
          explain: 'Повідомлення з 9 символів («Дякую, ок») ЗАРАХОВАНО у «Ответы ДЗ»',
        });
      });

      await test.step('Ментор надсилає 37 символів — повідомлення зараховано', async () => {
        await mentorApi.postMentorHomeworkReply({
          ...homework,
          htmlText: LONG_REPLY,
        });
        await mentorStatsPage.deltas.shouldSeeStatsDelta({
          adminId: mentorId,
          period: currentPeriod,
          baseline,
          delta: { answersHomework: 2 },
          explain: 'Довге повідомлення (37 символів) НЕ зараховано у «Ответы ДЗ»',
        });
      });

      await test.step('Postcondition: ментор закриває чат', async () => {
        await mentorApi.closeHomeworkChat(homework.chatId);
      });
    });
  },
);
