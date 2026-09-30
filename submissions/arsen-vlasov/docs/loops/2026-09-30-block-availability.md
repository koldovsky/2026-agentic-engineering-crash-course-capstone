# Stabilize loop: block-availability.spec.ts

- Target: `tests/specs/regression/lms/courses/investment-and-capital/block-availability.spec.ts`, grep `(11\|14)\. `.
- Command: `npm run loop:stabilize -- tests/specs/regression/lms/courses/investment-and-capital/block-availability.spec.ts --grep "(11|14)\. " --workers 5`.
- Start: 2026-09-30 08:53 UTC. Wall time: 16.7 min.
- Limits: 3 attempts, 20 min, 3.00 USD, stall 2. Repeats in each run: 5. Model: `opus`.
- Stop reason: **GREEN**.
- Agent cost: 2.96 USD in 2 attempt(s).

The spec passed every repeat after the fix, and `npm run check` is green. Review the diff. Then give the spec to `spec-reviewer`, and commit by hand.

## Runs

The same failure id in two rows means the same failure signature.

| Run | Passed | Failure | Time |
|---|---|---|---|
| 0 | 2 of 3 | F1 | 1.8 min |
| 1 | 5 of 6 | F2 | 3.6 min |
| 2 | 10 of 10 | — | 4.1 min |

Failure signatures (digits folded to `#`):

```text
F1:
#. Пройти всі уроки блоку #, #, # :: Error: Incorrect general course progress. Expected: #%. UI sidebar may not reflect lessons already completed via API.

F2:
#. Пройти усі блоки і уроки :: Error: Incorrect progress for 'Уроки'. Expected: #/#
```

## Attempts

| Attempt | Cost | Turns | Session | Changed files |
|---|---|---|---|---|
| 1 | 1.49 USD | 22 | `269d2566-a877-4734-ac3e-0ebd4b569fa1` | `utils/helpers/api-helper.ts` |
| 2 | 1.47 USD | 13 | `054a3688-2105-48b6-be9e-37884e9d5732` | `utils/helpers/api-helper.ts` |

Verdict lines of the agent:

```text
attempt 1: VERDICT: FIXED — `ApiHelper.completeFirstAvailableCourseBlock` returned before the backend reflected the block's `isCompleted: true`, so the next loop iteration re-picked the already-completed block and never completed the second one; now it polls `getCourseProgress` until the target block shows `isCompleted: true` before returning.
attempt 2: VERDICT: FIXED — `completeAllAvailableCourseBlocksInOrder` exited as soon as `progress.isCompleted` flipped true, before the aggregate `lessons.completed` counter caught up on the server, so the LMS UI still read 59/60 after reload; the helper now polls the course progress until the aggregate lessons/quizzes/homeworks counters reach their totals before returning.
```

## Diff

```diff
diff --git a/utils/helpers/api-helper.ts b/utils/helpers/api-helper.ts
index a1845cf..6c8b88a 100644
--- a/utils/helpers/api-helper.ts
+++ b/utils/helpers/api-helper.ts
@@ -20,6 +20,7 @@ import { ACTIVITY_TYPES, type ActivityType } from '@/utils/types/api/admin/activ
 import { AdminMentorsData } from '@/test-data/admin/mentors-data';
 import { AdminStudentDealsApiClient } from '@/core/api/admin/admin-student-deals-api';
 import { CourseProgressHelper } from '@/utils/helpers/course-progress-helper';
+import { DateHelper } from '@/utils/helpers/date-helper';
 
 export type CourseRunContext = {
   lmsContext: APIRequestContext;
@@ -164,6 +165,22 @@ export class ApiHelper {
     const blockIds = await this.getAvailableBlockIds(courseApiClient, courseID);
     const targetBlockId = blockIds.length === 1 ? blockIds[0] : blockIds[1];
     await courseApiClient.completeFullBlock(targetBlockId, { skipHomework });
+    await this.waitForBlockCompletionInCourseProgress(courseApiClient, courseID, targetBlockId);
+  }
+
+  private static async waitForBlockCompletionInCourseProgress(
+    courseApiClient: CourseApiClient,
+    courseID: string,
+    blockId: string,
+  ): Promise<void> {
+    await expect(async () => {
+      const progress = await courseApiClient.getCourseProgress(courseID);
+      const block = progress.blockProgresses.find((entry) => entry.blockId === blockId);
+      expect(
+        block?.isCompleted,
+        `Course progress did not mark block "${blockId}" as completed for course "${courseID}"`,
+      ).toBe(true);
+    }).toPass({ timeout: DateHelper.secondsToMs(30) });
   }
 
   /**
@@ -218,7 +235,37 @@ export class ApiHelper {
       );
     }
 
-    return latestProgress;
+    return await ApiHelper.waitForCourseAggregateCountersToCatchUp(
+      courseApiClient,
+      courseId,
+      { skipHomework },
+    );
+  }
+
+  private static async waitForCourseAggregateCountersToCatchUp(
+    courseApiClient: CourseApiClient,
+    courseId: string,
+    options: { skipHomework: boolean },
+  ): Promise<CourseProgressResponse> {
+    let progress!: CourseProgressResponse;
+    await expect(async () => {
+      progress = await courseApiClient.getCourseProgress(courseId);
+      expect(
+        progress.lessons.completed,
+        `Course "${courseId}" aggregate lessons counter still lags after all blocks completed`,
+      ).toBeGreaterThanOrEqual(progress.lessons.total);
+      expect(
+        progress.quizzes.completed,
+        `Course "${courseId}" aggregate quizzes counter still lags after all blocks completed`,
+      ).toBeGreaterThanOrEqual(progress.quizzes.total);
+      if (!options.skipHomework && progress.homeworks.total > 0) {
+        expect(
+          progress.homeworks.completed,
+          `Course "${courseId}" aggregate homeworks counter still lags after all blocks completed`,
+        ).toBeGreaterThanOrEqual(progress.homeworks.total);
+      }
+    }).toPass({ timeout: DateHelper.secondsToMs(30) });
+    return progress;
   }
 
   private static hasCompletedAllCourseContentByProgressSnapshot(

```
