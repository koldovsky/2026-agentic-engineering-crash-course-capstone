/**
 * Setup for the mentor-stats calculation spec: a fresh student on «Трейдинг основы» submits one
 * homework, so each scenario gets its own pending appeal and never touches real students' chats.
 */
import { expect, type APIRequestContext, type Browser } from '@playwright/test';
import { AdminAppealsApiClient } from '@/core/api/admin/admin-appeals-api';
import { AdminUserApiClient } from '@/core/api/admin/admin-user-api';
import { CourseSetupHelper } from '@/fixtures/api-helpers.fixture';
import { CYCLES } from '@/test-data/admin/cycle-data';
import { getRequiredProductAccessConfig } from '@/test-data/courses/product-access-config';
import { Package } from '@/test-data/courses/product-catalog';
import { LmsLoginPage } from '@/page-objects/lms/lms-login-page';
import { Courses } from '@/utils/constants/course/product-names';
import { CourseApiClient } from '@/core/api/lms/course-api';
import { ApiHelper } from '@/utils/helpers/api-helper';
import { DateHelper } from '@/utils/helpers/date-helper';
import { TestUserRegistry } from '@/utils/helpers/test-user-registry';
import type { User } from '@/utils/types/user-interfaces';

const TRADING_BASICS = getRequiredProductAccessConfig({
  productName: Courses.TRADING_BASICS,
  packageName: Package.Extended,
});

export type PendingHomework = { appealId: string; chatId: string; courseId: string };

export async function createStudentWithPendingHomework(params: {
  runnerAdminApi: AdminUserApiClient;
  courseSetupHelper: CourseSetupHelper;
  testUserRegistry: TestUserRegistry;
  createLmsContext: (user: User) => Promise<APIRequestContext>;
  adminAppealsApi: AdminAppealsApiClient;
  browser: Browser;
  lmsUrl: string;
}): Promise<PendingHomework> {
  const courseId = TRADING_BASICS.courseId!;
  const student = await params.testUserRegistry.createStudent(params.runnerAdminApi);
  await params.testUserRegistry.grantCourseAccess(params.courseSetupHelper, {
    email: student.email,
    accessId: TRADING_BASICS.accessId,
    cycleId: CYCLES.TRADING_BASICS_V2.id,
  });

  // The course progress is created on the student's first LMS visit, not by the access grant.
  const studentContext = await params.browser.newContext();
  try {
    const home = await new LmsLoginPage(await studentContext.newPage(), params.lmsUrl).authenticate(student);
    await home.shouldSeePage();
  } finally {
    await studentContext.close();
  }

  const lmsContext = await params.createLmsContext(student);
  // ...and it appears a few seconds after that visit, not at once.
  await expect(async () => {
    await new CourseApiClient(lmsContext).getCourseProgress(courseId);
  }).toPass({ timeout: DateHelper.secondsToMs(30) });
  // Block 1 of «Трейдинг основы» is video only; the first homework is in block 2, which this
  // helper passes in full (the same path the trading-basics homework specs use).
  await ApiHelper.completeFirstAvailableCourseBlock(lmsContext, courseId, student);
  const [appeal] = await params.adminAppealsApi.listHomeworkAppealChats({
    limit: 5,
    'filter.course.id': `$eq:${courseId}`,
    'filter.student.email': `$ilike:${student.email}`,
  });
  expect(appeal, `A pending homework appeal should exist for ${student.email}`).toBeTruthy();

  return { appealId: appeal.id, chatId: appeal.chatId, courseId };
}
