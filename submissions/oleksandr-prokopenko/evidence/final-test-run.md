# Final verification run of 2026-10-01

Base: main 8803004 in a clean worktree (fast-forward, nothing to merge). Host: macOS, Docker Desktop, local stack at 127.0.0.1:8000. Live target: https://example-app.example.com.
Each section holds the command, its exit code, its duration and the raw tail of its output. The Maven integration tail is Spring teardown log noise; its counts are in the failsafe summary below it.

## Summary

| Layer | Result | Count | Duration |
|---|---|---|---|
| lint | exit 0 | - | 4 s |
| typecheck | exit 0 | - | 4 s |
| build (frontend + backend jar) | exit 0 | - | 12 s |
| test:run | exit 0 | frontend 990/990 (94 files), backend unit 1003/1003 (90 classes), scripts 163/163, deploy 489/489 | 74 s |
| test:integration (with PhotoQualityIT, 47 photos incl. the photographer's 36 private samples) | exit 0 | failsafe 554 tests, 0 failures, 0 errors, 13 skipped, 79 IT classes | 2511 s (PhotoQualityIT alone 1619 s) |
| test:e2e (chromium, webkit, firefox, all projects) | exit 0 | 954 passed, 4 skipped, 0 failed | 1031 s wall, 16.3 min of Playwright |
| gates | every requested gate exit 0; gate-status exit 1 | see sections 5a to 5j | |
| check:deploy (live) | exit 1: NFR-18 FAIL in both runs | see sections 6a and 6b | 176 s and 175 s |

## 1a. npm run lint

```
command: npm run lint
exit code: 0
duration: 4 s
--- tail -30 ---

> lint
> npm --prefix frontend run lint


> frontend@0.1.0 lint
> eslint

```

## 1b. npm run typecheck

```
command: npm run typecheck
exit code: 0
duration: 4 s
--- tail -30 ---

> typecheck
> npm --prefix frontend run typecheck


> frontend@0.1.0 typecheck
> next typegen && tsc --noEmit

Generating route types...
✓ Types generated successfully
```

## 1c. npm run build

```
command: npm run build
exit code: 0
duration: 12 s
--- tail -40 ---
✓ Compiled successfully in 2.4s
  Running TypeScript ...
  Finished TypeScript in 1929ms ...
  Collecting page data using 10 workers ...
  Generating static pages using 10 workers (0/11) ...
  Generating static pages using 10 workers (2/11) 
  Generating static pages using 10 workers (5/11) 
  Generating static pages using 10 workers (8/11) 
✓ Generating static pages using 10 workers (11/11) in 79ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /_not-found
├ ƒ /[lang]
├ ƒ /[lang]/about
├ ƒ /[lang]/internal/test-errors/action
├ ƒ /[lang]/internal/test-errors/render
├ ƒ /[lang]/internal/test-errors/route
├ ƒ /[lang]/order
├ ƒ /[lang]/privacy
├ ƒ /[lang]/sessions
├ ƒ /[lang]/sessions/[slug]
├ ƒ /admin
├ ƒ /admin/about
├ ƒ /admin/access-denied
├ ƒ /admin/overview
├ ƒ /admin/requests
├ ƒ /admin/requests/[id]
├ ƒ /admin/requests/gone
├ ƒ /admin/sessions
├ ƒ /admin/sessions/[id]
├ ƒ /admin/sessions/new
├ ƒ /healthz
└ ƒ /preview/[sessionId]


ƒ Proxy (Middleware)

ƒ  (Dynamic)  server-rendered on demand

```

## 2. npm run test:run

```
command: npm run test:run
exit code: 0
duration: 74 s
--- tail -60 ---
  ✔ every ssh and scp call goes to the deploy-target entry (2.976625ms)
✔ the pinned host key (5.4825ms)
▶ which ci runs start deploy.yml
  ✔ workflow_run lists branches: [main], so a ci run for another branch creates no deploy run (2.173333ms)
✔ which ci runs start deploy.yml (2.234ms)
▶ the publish lookup
  ✔ lists deploy.yml runs in a created window taken from the SHA's ci run, with no other filter GitHub caps at 1,000 runs (3.344791ms)
✔ the publish lookup (3.499125ms)
▶ the publish lookup has one definition
  ✔ the dispatch check and the newest-green check hold the same published() function, byte for byte (3.035625ms)
✔ the publish lookup has one definition (3.116417ms)
▶ orphan containers
  ✔ every docker compose up in deploy.yml passes --remove-orphans (0.233166ms)
✔ orphan containers (0.264583ms)
▶ ci.yml
  ✔ runs on push to main (13.549042ms)
  ✔ the verify job runs its checks in the order the spec lists (3.009709ms)
  ✔ the verify job needs the tag job, runs under the verify job's condition and has a timeout of 4 minutes or less (4.083833ms)
  ✔ the backend-unit job runs its checks in the order the spec lists (3.149125ms)
  ✔ the backend-unit job needs the tag job, runs under the verify job's condition and has a timeout of 4 minutes or less (2.518834ms)
  ✔ the deploy-config job runs its checks in the order the spec lists (3.514ms)
  ✔ the deploy-config job needs the tag job, runs under the verify job's condition and has a timeout of 4 minutes or less (2.577875ms)
  ✔ the verify job checks out the whole history, because the trajectory freshness check counts slice commits (1.378083ms)
  ✔ ci runs no slow suite: they run on the Mac before a push (1.617625ms)
  ✔ the trajectory step is the only one with --warn-only (2.713834ms)
✔ ci.yml (39.166375ms)
▶ no step or job can hide a failure
  ✔ ci.yml has no continue-on-error (1.3645ms)
  ✔ deploy.yml has no continue-on-error (1.839125ms)
✔ no step or job can hide a failure (3.298542ms)
▶ deploy.yml triggers
  ✔ starts only on workflow_run of ci (completed) and on workflow_dispatch with a sha input (1.772625ms)
✔ deploy.yml triggers (1.82275ms)
▶ deploy.yml publish job
  ✔ runs only for a successful ci run of a push to main (1.408083ms)
  ✔ has packages: write and checks out the run's head_sha (1.912333ms)
  ✔ logs in to ghcr.io with GITHUB_TOKEN (1.26725ms)
  ✔ runs docker compose build for backend, frontend and caddy with IMAGE_TAG = head_sha and a ghcr.io prefix (1.608333ms)
  ✔ runs docker compose push for backend, frontend and caddy with IMAGE_TAG = head_sha and a ghcr.io prefix (1.259208ms)
✔ deploy.yml publish job (7.572ms)
▶ deploy.yml deploy job
  ✔ needs publish, and runs only when publish succeeded or on a manual dispatch (2.334375ms)
  ✔ deploys one at a time: a concurrency group with cancel-in-progress false (3.235208ms)
  ✔ runs "docker compose pull && docker compose up -d" over SSH after set -e (2.084625ms)
  ✔ SSH pins the host key: StrictHostKeyChecking=yes, never anything else (0.930209ms)
  ✔ a health step after the deploy polls DEPLOY_URL for at most 5 minutes (1.164625ms)
✔ deploy.yml deploy job (10.13275ms)
▶ deploy.yml time limits
  ✔ the publish job is cut off after at most 7 minutes (2.020208ms)
  ✔ the deploy job is cut off after at most 7 minutes (1.044ms)
  ✔ the deploy job's own waits fit inside its time limit (1.8785ms)
✔ deploy.yml time limits (5.022208ms)
ℹ tests 489
ℹ suites 107
ℹ pass 489
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 32103.841875
```

## 3. npm run test:integration (tail of the Maven output)

```
command: npm run test:integration
exit code: 0
duration: 2511 s
--- tail -80 ---
2026-10-01T15:31:01.389+03:00 DEBUG 48098 --- [portfolio-backend] [           main] req= job= org.hibernate.SQL                        : select p1_0.id,p1_0.attempts,p1_0.claimed_until,p1_0.created_at,p1_0.description_en,p1_0.description_uk,p1_0.failure_cause,p1_0.height,p1_0.original_path,p1_0.over
2026-10-01T15:31:01.391+03:00 DEBUG 48098 --- [portfolio-backend] [           main] req= job= org.hibernate.SQL                        : update photo p1_0 set status=?,failure_cause=?,claimed_until=null where p1_0.id=?
2026-10-01T15:31:02.015+03:00  WARN 48098 --- [portfolio-backend] [pring-session-1] req= job= org.hibernate.orm.jdbc.error             : HHH000247: ErrorCode: 0, SQLState: 08001
2026-10-01T15:31:02.015+03:00  WARN 48098 --- [portfolio-backend] [pring-session-1] req= job= org.hibernate.orm.jdbc.error             : HikariPool-35 - Connection is not available, request timed out after 2010ms (total=0, active=0, idle=0, waiting=0)
2026-10-01T15:31:02.015+03:00  WARN 48098 --- [portfolio-backend] [pring-session-1] req= job= org.hibernate.orm.jdbc.error             : HHH000247: ErrorCode: 0, SQLState: 08001
2026-10-01T15:31:02.015+03:00  WARN 48098 --- [portfolio-backend] [pring-session-1] req= job= org.hibernate.orm.jdbc.error             : HikariPool-35 - Connection is not available, request timed out after 2010ms (total=0, active=0, idle=0, waiting=0)
2026-10-01T15:31:02.015+03:00 ERROR 48098 --- [portfolio-backend] [pring-session-1] req= job= o.s.s.s.TaskUtils$LoggingErrorHandler    : Unexpected error occurred in scheduled task

org.springframework.transaction.CannotCreateTransactionException: Could not open JPA EntityManager for transaction
	at org.springframework.orm.jpa.JpaTransactionManager.doBegin(JpaTransactionManager.java:457) ~[spring-orm-7.0.9.jar:7.0.9]
	at org.springframework.transaction.support.AbstractPlatformTransactionManager.startTransaction(AbstractPlatformTransactionManager.java:532) ~[spring-tx-7.0.9.jar:7.0.9]
	at org.springframework.transaction.support.AbstractPlatformTransactionManager.getTransaction(AbstractPlatformTransactionManager.java:405) ~[spring-tx-7.0.9.jar:7.0.9]
	at org.springframework.transaction.support.TransactionTemplate.execute(TransactionTemplate.java:134) ~[spring-tx-7.0.9.jar:7.0.9]
	at org.springframework.session.jdbc.JdbcIndexedSessionRepository.cleanUpExpiredSessions(JdbcIndexedSessionRepository.java:649) ~[spring-session-jdbc-4.1.1.jar:4.1.1]
	at org.springframework.scheduling.support.DelegatingErrorHandlingRunnable.run(DelegatingErrorHandlingRunnable.java:54) ~[spring-context-7.0.9.jar:7.0.9]
	at org.springframework.scheduling.concurrent.ReschedulingRunnable.run(ReschedulingRunnable.java:94) ~[spring-context-7.0.9.jar:7.0.9]
	at java.base/java.util.concurrent.Executors$RunnableAdapter.call(Executors.java:545) ~[na:na]
	at java.base/java.util.concurrent.FutureTask.run(FutureTask.java:328) ~[na:na]
	at java.base/java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.run(ScheduledThreadPoolExecutor.java:309) ~[na:na]
	at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1090) ~[na:na]
	at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:614) ~[na:na]
	at java.base/java.lang.Thread.run(Thread.java:1474) ~[na:na]
Caused by: org.hibernate.exception.JDBCConnectionException: Unable to acquire JDBC Connection [HikariPool-35 - Connection is not available, request timed out after 2010ms (total=0, active=0, idle=0, waiting=0)] [n/a]
	at org.hibernate.exception.internal.SQLExceptionTypeDelegate.convert(SQLExceptionTypeDelegate.java:49) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	at org.hibernate.exception.internal.StandardSQLExceptionConverter.convert(StandardSQLExceptionConverter.java:34) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	at org.hibernate.engine.jdbc.spi.SqlExceptionHelper.convert(SqlExceptionHelper.java:115) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	at org.hibernate.engine.jdbc.spi.SqlExceptionHelper.convert(SqlExceptionHelper.java:101) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	at org.hibernate.resource.jdbc.internal.LogicalConnectionManagedImpl.acquire(LogicalConnectionManagedImpl.java:190) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	at org.hibernate.resource.jdbc.internal.LogicalConnectionManagedImpl.acquireConnectionIfNeeded(LogicalConnectionManagedImpl.java:87) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	at org.hibernate.resource.jdbc.internal.LogicalConnectionManagedImpl.getPhysicalConnection(LogicalConnectionManagedImpl.java:126) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	at org.hibernate.resource.jdbc.internal.LogicalConnectionManagedImpl.getConnectionForTransactionManagement(LogicalConnectionManagedImpl.java:281) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	at org.hibernate.resource.jdbc.internal.LogicalConnectionManagedImpl.begin(LogicalConnectionManagedImpl.java:290) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	at org.hibernate.resource.transaction.backend.jdbc.internal.JdbcResourceLocalTransactionCoordinatorImpl$TransactionDriverControlImpl.begin(JdbcResourceLocalTransactionCoordinatorImpl.java:226) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	at org.hibernate.engine.transaction.internal.TransactionImpl.begin(TransactionImpl.java:75) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	at org.springframework.orm.jpa.vendor.HibernateJpaDialect.beginTransaction(HibernateJpaDialect.java:147) ~[spring-orm-7.0.9.jar:7.0.9]
	at org.springframework.orm.jpa.JpaTransactionManager.doBegin(JpaTransactionManager.java:411) ~[spring-orm-7.0.9.jar:7.0.9]
	... 12 common frames omitted
Caused by: java.sql.SQLTransientConnectionException: HikariPool-35 - Connection is not available, request timed out after 2010ms (total=0, active=0, idle=0, waiting=0)
	at com.zaxxer.hikari.pool.HikariPool.createTimeoutException(HikariPool.java:714) ~[HikariCP-7.0.2.jar:na]
	at com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:184) ~[HikariCP-7.0.2.jar:na]
	at com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:142) ~[HikariCP-7.0.2.jar:na]
	at com.zaxxer.hikari.HikariDataSource.getConnection(HikariDataSource.java:127) ~[HikariCP-7.0.2.jar:na]
	at org.hibernate.engine.jdbc.connections.internal.DataSourceConnectionProvider.getConnection(DataSourceConnectionProvider.java:149) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	at org.hibernate.internal.NonContextualJdbcConnectionAccess.obtainConnection(NonContextualJdbcConnectionAccess.java:62) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	at org.hibernate.resource.jdbc.internal.LogicalConnectionManagedImpl.acquire(LogicalConnectionManagedImpl.java:187) ~[hibernate-core-7.4.5.Final.jar:7.4.5.Final]
	... 20 common frames omitted
Caused by: org.postgresql.util.PSQLException: Connection to localhost:54449 refused. Check that the hostname and port are correct and that the postmaster is accepting TCP/IP connections.
	at org.postgresql.core.v3.ConnectionFactoryImpl.openConnectionImpl(ConnectionFactoryImpl.java:427) ~[postgresql-42.7.13.jar:42.7.13]
	at org.postgresql.core.ConnectionFactory.openConnection(ConnectionFactory.java:52) ~[postgresql-42.7.13.jar:42.7.13]
	at org.postgresql.jdbc.PgConnection.<init>(PgConnection.java:295) ~[postgresql-42.7.13.jar:42.7.13]
	at org.postgresql.Driver.makeConnection(Driver.java:437) ~[postgresql-42.7.13.jar:42.7.13]
	at org.postgresql.Driver.connect(Driver.java:305) ~[postgresql-42.7.13.jar:42.7.13]
	at com.zaxxer.hikari.util.DriverDataSource.getConnection(DriverDataSource.java:144) ~[HikariCP-7.0.2.jar:na]
	at com.zaxxer.hikari.pool.PoolBase.newConnection(PoolBase.java:373) ~[HikariCP-7.0.2.jar:na]
	at com.zaxxer.hikari.pool.PoolBase.newPoolEntry(PoolBase.java:210) ~[HikariCP-7.0.2.jar:na]
	at com.zaxxer.hikari.pool.HikariPool.createPoolEntry(HikariPool.java:488) ~[HikariCP-7.0.2.jar:na]
	at com.zaxxer.hikari.pool.HikariPool$PoolEntryCreator.call(HikariPool.java:752) ~[HikariCP-7.0.2.jar:na]
	at com.zaxxer.hikari.pool.HikariPool$PoolEntryCreator.call(HikariPool.java:731) ~[HikariCP-7.0.2.jar:na]
	at java.base/java.util.concurrent.FutureTask.run(FutureTask.java:328) ~[na:na]
	... 3 common frames omitted
Caused by: java.net.ConnectException: Connection refused
	at java.base/sun.nio.ch.Net.pollConnect(Native Method) ~[na:na]
	at java.base/sun.nio.ch.Net.pollConnectNow(Net.java:639) ~[na:na]
	at java.base/sun.nio.ch.NioSocketImpl.timedFinishConnect(NioSocketImpl.java:550) ~[na:na]
	at java.base/sun.nio.ch.NioSocketImpl.connect(NioSocketImpl.java:594) ~[na:na]
	at java.base/java.net.SocksSocketImpl.connect(SocksSocketImpl.java:284) ~[na:na]
	at java.base/java.net.Socket.connect(Socket.java:659) ~[na:na]
	at org.postgresql.core.PGStream.createSocket(PGStream.java:270) ~[postgresql-42.7.13.jar:42.7.13]
	at org.postgresql.core.PGStream.<init>(PGStream.java:131) ~[postgresql-42.7.13.jar:42.7.13]
	at org.postgresql.core.v3.ConnectionFactoryImpl.tryConnect(ConnectionFactoryImpl.java:221) ~[postgresql-42.7.13.jar:42.7.13]
	at org.postgresql.core.v3.ConnectionFactoryImpl.openConnectionImpl(ConnectionFactoryImpl.java:367) ~[postgresql-42.7.13.jar:42.7.13]
	... 14 common frames omitted

--- seed --seed=<local path> 925790951390833 exited 0; its output lines that are not log lines:
[session 10 cherha-925790951390833 "Черга 925790951390833" created as a draft, photo 12 imported from a-400x300.jpg, photo 13 imported from b-2000x1500.jpg, photo 14 imported from c-photo.jpg, 3 photos imported, 0 files skipped, session 10 published]
--- seed --seed=<local path> 925795503758208 exited 0; its output lines that are not log lines:
[session 11 cherha-925795503758208 "Черга 925795503758208" created as a draft, photo 15 imported from a-400x300.jpg, 1 photos imported, 0 files skipped, session 11 published]
2026-10-01T15:31:10.901+03:00  INFO 48098 --- [portfolio-backend] [           main] req= job= j.LocalContainerEntityManagerFactoryBean : Closing JPA EntityManagerFactory for persistence unit 'default'
2026-10-01T15:31:10.903+03:00  INFO 48098 --- [portfolio-backend] [           main] req= job= com.zaxxer.hikari.HikariDataSource       : HikariPool-68 - Shutdown initiated...
2026-10-01T15:31:10.905+03:00  INFO 48098 --- [portfolio-backend] [           main] req= job= com.zaxxer.hikari.HikariDataSource       : HikariPool-68 - Shutdown completed.
```

### Failsafe summary of the integration run (backend/target/failsafe-reports)

```
IT classes: 79, tests: 554, failures: 0, errors: 0, skipped: 13
-------------------------------------------------------------------------------
Test set: com.example.app.image.quality.PhotoQualityIT
-------------------------------------------------------------------------------
Tests run: 8, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1619 s -- in com.example.app.image.quality.PhotoQualityIT
```

## 4. npm run test:e2e (tail)

```
command: npm run test:e2e
exit code: 0
duration: 1031 s
--- tail -150 ---
  ✓  815 [firefox] › tests/e2e/public-viewer.spec.ts:203:1 › the viewer loads the widest copy: 3200 px for a large photo and 1600 px for a photo whose widest copy is 1600 (479ms)
  ✓  814 [firefox] › tests/e2e/public-sessions.spec.ts:129:1 › the middle session links to both neighbours, skipping drafts and hidden sessions, in each language (1.4s)
  ✓  816 [firefox] › tests/e2e/public-viewer.spec.ts:220:1 › only the viewer's own controls sit over the open photo, and none shows a name, a logo or a © sign (515ms)
  ✓  817 [firefox] › tests/e2e/public-sessions.spec.ts:144:1 › the first session has a next link and no previous link (392ms)
  ✓  818 [firefox] › tests/e2e/public-viewer.spec.ts:257:5 › the open photo 1 takes almost all of a 1000 x 575 window below a 56 px top bar (592ms)
  ✓  820 [firefox] › tests/e2e/public-viewer.spec.ts:257:5 › the open photo 3 takes almost all of a 1000 x 575 window below a 56 px top bar (747ms)
  ✓  821 [firefox] › tests/e2e/public-viewer.spec.ts:257:5 › the open photo 1 takes almost all of a 1440 x 900 window below a 56 px top bar (559ms)
  ✓  822 [firefox] › tests/e2e/public-viewer.spec.ts:257:5 › the open photo 3 takes almost all of a 1440 x 900 window below a 56 px top bar (538ms)
  ✓  812 [firefox] › tests/e2e/public-photos.spec.ts:248:1 › no public photo lacks a description (4.8s)
  ✓  823 [firefox] › tests/e2e/public-photos.spec.ts:261:1 › the photo markup lists every copy and no width without one (173ms)
  ✓  824 [firefox] › tests/e2e/public-photos.spec.ts:278:1 › a browser that can show AVIF loads an AVIF copy (798ms)
  ✓  825 [firefox] › tests/e2e/public-photos.spec.ts:300:1 › public pages link only to copies (295ms)
  ✓  819 [firefox] › tests/e2e/public-sessions.spec.ts:152:1 › a folder the seed command publishes shows on the public site, and a new session appears on the next load (14.1s)
  ✓  768 [firefox] › tests/e2e/public-overview.spec.ts:82:1 › marked photos appear in the set order, C then A, and the unmarked one stays off (495ms)
  ✓  826 [firefox] › tests/e2e/public-overview.spec.ts:93:1 › a session seeded later comes after an earlier one, in both languages, row by row (353ms)
  ✓  827 [firefox] › tests/e2e/public-overview.spec.ts:103:1 › a marked photo of a draft, a marked failed photo and an unmarked photo stay off the page, and the page never asks for the failed one (728ms)
  ✓  828 [firefox] › tests/e2e/public-overview.spec.ts:118:1 › a session seeded after the first load shows on the next load (10.0s)
  ✓  829 [firefox] › tests/e2e/public-overview.spec.ts:135:1 › a click opens the session page in the page's language (512ms)
  ✓  830 [firefox] › tests/e2e/public-overview.spec.ts:149:1 › Tab reaches the photos in order with a visible focus mark, and Enter opens the second photo's session (556ms)
  ✓  831 [firefox] › tests/e2e/public-overview.spec.ts:177:1 › the links are in the HTML the server sends, before any script runs (55ms)
  ✓  832 [firefox] › tests/e2e/public-overview.spec.ts:194:1 › the link names are the descriptions: the photographer's text, or the generated one, in the page's language (339ms)
  ✓  833 [firefox] › tests/e2e/public-overview.spec.ts:207:1 › rows at 1440 px follow the pattern, share a height, fill 64 to 1376 and sit 12 px apart (333ms)
  ✓  834 [firefox] › tests/e2e/public-overview.spec.ts:224:1 › every photo keeps its own shape at 1440 and 360 px (304ms)
  ✓  835 [firefox] › tests/e2e/public-overview.spec.ts:239:1 › one column at 360 px: x = 16 to 344 and 8 px between photos (213ms)
  ✓  836 [firefox] › tests/e2e/public-overview.spec.ts:254:1 › a wide window keeps the content column: rows run from x = 624 to 1936 (225ms)
  ✓  837 [firefox] › tests/e2e/public-overview.spec.ts:262:1 › the page never scrolls sideways at 360 and 2560 px, in both languages (452ms)
  ✓  838 [firefox] › tests/e2e/public-overview.spec.ts:274:1 › photos show at full strength, hovering changes nothing and nothing sits over them (458ms)
  ✓  839 [firefox] › tests/e2e/public-overview.spec.ts:298:1 › the first two photos are eager with a high priority, every other is lazy, all with their upright size (179ms)
  ✓  840 [firefox] › tests/e2e/public-overview.spec.ts:322:1 › the last photo of a long Overview is not requested before a scroll and is requested after it (926ms)
  ✓  841 [firefox] › tests/e2e/public-overview.spec.ts:338:1 › every photo whose box starts inside the window is requested before any scroll (2.2s)
  -  842 [firefox] › tests/e2e/public-overview.spec.ts:363:1 › each loaded copy fits its slot: at least as wide as shown, and the next smaller one narrower
  ✓  843 [firefox] › tests/e2e/public-overview.spec.ts:400:1 › opening the Overview starts no request for a session page (2.4s)
  ✓  844 [firefox] › tests/e2e/public-overview.spec.ts:412:1 › the Overview of the shared sessions lists the autumn photos in the photographer's order and links them to their session (300ms)
  ✓  848 [admin-data-chromium] › tests/e2e/admin-overview.spec.ts:38:1 › the Overview screen lists a draft's marked photo with the tag «Чернетка» and the title of its session, and removing it keeps it in the session (1.6s)
  ✓  847 [admin-data-chromium] › tests/e2e/admin-publish.spec.ts:29:1 › the preview of a draft opens in a new tab in the public layout with the banner, the draft's photos from the admin copy address and no language switcher (3.2s)
  ✓  845 [admin-data-chromium] › tests/e2e/admin-photos.spec.ts:50:1 › a photo moves with the keyboard: Space, two ArrowLeft and Space put C first, and a reload shows it (5.8s)
  ✓  850 [admin-data-chromium] › tests/e2e/admin-publish.spec.ts:58:1 › a visitor, an unknown id and a non-numeric id all get the same public page not found, and the English preview does not exist (3.8s)
  ✓  849 [admin-data-chromium] › tests/e2e/admin-overview.spec.ts:58:1 › marking in the options dialog puts the photo at the end of the Overview order (6.6s)
  ✓  846 [admin-data-chromium] › tests/e2e/admin-owner-flow.spec.ts:13:1 › a session goes from nothing to live through the admin pages alone (10.1s)
  ✓  851 [admin-data-chromium] › tests/e2e/admin-photos.spec.ts:64:1 › Esc puts a held photo back and sends no save call (5.6s)
  ✓  852 [admin-data-chromium] › tests/e2e/admin-publish.spec.ts:78:1 › a draft's copies are not served, publishing serves them and unpublishing stops it, with the copies moving between data/drafts and data/media (4.5s)
  ✓  853 [admin-data-chromium] › tests/e2e/admin-overview.spec.ts:76:1 › photos of two published sessions alternate in the photographer's order: dragging P2 to the place of P1 reaches the public Overview (3.7s)
  ✓  855 [admin-data-chromium] › tests/e2e/admin-publish.spec.ts:111:1 › publishing a session with no ready photo shows the message and the session stays a draft (717ms)
  ✓  854 [admin-data-chromium] › tests/e2e/admin-photos.spec.ts:84:1 › one pointer drag puts a photo in the place of the photo it is dropped on (4.9s)
  ✓  857 [admin-data-chromium] › tests/e2e/admin-publish.spec.ts:123:1 › the old address of a published session answers 301 in both languages, and 404 while it is a draft (4.5s)
  ✓  856 [admin-data-chromium] › tests/e2e/admin-overview.spec.ts:96:1 › a stale Overview screen shows why the order was not saved and then the current list (5.7s)
  ✓  860 [admin-data-chromium] › tests/e2e/admin-overview.spec.ts:115:1 › unpublishing takes the photos off the public Overview, and the admin screen still lists them as a draft (1.8s)
  ✓  859 [admin-data-chromium] › tests/e2e/admin-publish.spec.ts:154:1 › a draft keeps no redirect when its address changes (4.4s)
  ✓  858 [admin-data-chromium] › tests/e2e/admin-photos.spec.ts:106:1 › a failed save puts the order back and says the data changed (5.5s)
  ✓  861 [admin-data-chromium] › tests/e2e/admin-overview.spec.ts:129:1 › a deleted photo and then a deleted session leave the admin and the public Overview (2.5s)
  ✓  862 [admin-data-chromium] › tests/e2e/admin-publish.spec.ts:169:1 › publishing again moves a session up among the sessions of the same shoot date (2.1s)
  ✓  864 [admin-data-chromium] › tests/e2e/admin-overview.spec.ts:149:1 › an Overview tile has a drag handle that is a button named «Перемістити фото» (3.8s)
  ✓  865 [admin-data-chromium] › tests/e2e/admin-publish.spec.ts:199:1 › deleting a session asks first, and a confirmed delete removes its address, its photos and every file (2.6s)
  ✓  863 [admin-data-chromium] › tests/e2e/admin-photos.spec.ts:120:1 › a stale tab shows why the order was not saved and then the current photos (6.2s)
  ✓  866 [admin-data-chromium] › tests/e2e/admin-publish.spec.ts:228:1 › a published session shows the texts, the order, the cover and the descriptions on the next load (4.6s)
  ✓  868 [admin-data-chromium] › tests/e2e/admin-publish.spec.ts:257:1 › the editor writes the publish time as a Kyiv time (1.3s)
  ✓  867 [admin-data-chromium] › tests/e2e/admin-photos.spec.ts:138:1 › the first photo is the cover until another is picked, and a picked cover stays after a reorder (5.6s)
  ✓  869 [admin-data-chromium] › tests/e2e/admin-photos.spec.ts:157:1 › descriptions and the Overview mark are saved together in the options dialog and the photo shows on the admin Overview screen (2.6s)
  ✓  870 [admin-data-chromium] › tests/e2e/admin-photos.spec.ts:182:1 › the options dialog keeps focus inside, Esc closes it, and focus goes back to the «Параметри» button that opened it (2.4s)
  ✓  871 [admin-data-chromium] › tests/e2e/admin-photos.spec.ts:201:1 › deleting a photo asks first, cancelling keeps it, and a confirmed delete removes its files (2.5s)
  ✓  872 [admin-data-chromium] › tests/e2e/admin-photos.spec.ts:225:1 › the editor of a session shows «Перемістити фото» as a button on each ready tile and a number under each photo (4.4s)
  ✓  875 [admin-data-webkit] › tests/e2e/admin-overview.spec.ts:38:1 › the Overview screen lists a draft's marked photo with the tag «Чернетка» and the title of its session, and removing it keeps it in the session (2.9s)
  ✓  876 [admin-data-webkit] › tests/e2e/admin-publish.spec.ts:29:1 › the preview of a draft opens in a new tab in the public layout with the banner, the draft's photos from the admin copy address and no language switcher (5.6s)
  ✓  874 [admin-data-webkit] › tests/e2e/admin-photos.spec.ts:50:1 › a photo moves with the keyboard: Space, two ArrowLeft and Space put C first, and a reload shows it (6.1s)
  ✓  878 [admin-data-webkit] › tests/e2e/admin-publish.spec.ts:58:1 › a visitor, an unknown id and a non-numeric id all get the same public page not found, and the English preview does not exist (832ms)
  ✓  877 [admin-data-webkit] › tests/e2e/admin-overview.spec.ts:58:1 › marking in the options dialog puts the photo at the end of the Overview order (4.6s)
  ✓  873 [admin-data-webkit] › tests/e2e/admin-owner-flow.spec.ts:13:1 › a session goes from nothing to live through the admin pages alone (10.7s)
  ✓  880 [admin-data-webkit] › tests/e2e/admin-publish.spec.ts:78:1 › a draft's copies are not served, publishing serves them and unpublishing stops it, with the copies moving between data/drafts and data/media (4.5s)
  ✓  882 [admin-data-webkit] › tests/e2e/admin-publish.spec.ts:111:1 › publishing a session with no ready photo shows the message and the session stays a draft (848ms)
  ✓  879 [admin-data-webkit] › tests/e2e/admin-photos.spec.ts:64:1 › Esc puts a held photo back and sends no save call (5.8s)
  ✓  881 [admin-data-webkit] › tests/e2e/admin-overview.spec.ts:76:1 › photos of two published sessions alternate in the photographer's order: dragging P2 to the place of P1 reaches the public Overview (5.4s)
  ✓  883 [admin-data-webkit] › tests/e2e/admin-publish.spec.ts:123:1 › the old address of a published session answers 301 in both languages, and 404 while it is a draft (1.7s)
  ✓  884 [admin-data-webkit] › tests/e2e/admin-photos.spec.ts:84:1 › one pointer drag puts a photo in the place of the photo it is dropped on (4.6s)
  ✓  886 [admin-data-webkit] › tests/e2e/admin-publish.spec.ts:154:1 › a draft keeps no redirect when its address changes (4.5s)
  ✓  885 [admin-data-webkit] › tests/e2e/admin-overview.spec.ts:96:1 › a stale Overview screen shows why the order was not saved and then the current list (5.5s)
  ✓  889 [admin-data-webkit] › tests/e2e/admin-overview.spec.ts:115:1 › unpublishing takes the photos off the public Overview, and the admin screen still lists them as a draft (850ms)
  ✓  888 [admin-data-webkit] › tests/e2e/admin-publish.spec.ts:169:1 › publishing again moves a session up among the sessions of the same shoot date (3.8s)
  ✓  890 [admin-data-webkit] › tests/e2e/admin-overview.spec.ts:129:1 › a deleted photo and then a deleted session leave the admin and the public Overview (2.9s)
  ✓  887 [admin-data-webkit] › tests/e2e/admin-photos.spec.ts:106:1 › a failed save puts the order back and says the data changed (5.8s)
  ✓  892 [admin-data-webkit] › tests/e2e/admin-overview.spec.ts:149:1 › an Overview tile has a drag handle that is a button named «Перемістити фото» (2.2s)
  ✓  891 [admin-data-webkit] › tests/e2e/admin-publish.spec.ts:199:1 › deleting a session asks first, and a confirmed delete removes its address, its photos and every file (3.1s)
  ✓  893 [admin-data-webkit] › tests/e2e/admin-photos.spec.ts:120:1 › a stale tab shows why the order was not saved and then the current photos (6.8s)
  ✓  894 [admin-data-webkit] › tests/e2e/admin-publish.spec.ts:228:1 › a published session shows the texts, the order, the cover and the descriptions on the next load (5.1s)
  ✓  896 [admin-data-webkit] › tests/e2e/admin-publish.spec.ts:257:1 › the editor writes the publish time as a Kyiv time (2.5s)
  ✓  895 [admin-data-webkit] › tests/e2e/admin-photos.spec.ts:138:1 › the first photo is the cover until another is picked, and a picked cover stays after a reorder (5.8s)
  ✓  897 [admin-data-webkit] › tests/e2e/admin-photos.spec.ts:157:1 › descriptions and the Overview mark are saved together in the options dialog and the photo shows on the admin Overview screen (2.8s)
  ✓  898 [admin-data-webkit] › tests/e2e/admin-photos.spec.ts:182:1 › the options dialog keeps focus inside, Esc closes it, and focus goes back to the «Параметри» button that opened it (2.6s)
  ✓  899 [admin-data-webkit] › tests/e2e/admin-photos.spec.ts:201:1 › deleting a photo asks first, cancelling keeps it, and a confirmed delete removes its files (2.6s)
  ✓  900 [admin-data-webkit] › tests/e2e/admin-photos.spec.ts:225:1 › the editor of a session shows «Перемістити фото» as a button on each ready tile and a number under each photo (4.5s)
  ✓  902 [admin-data-firefox] › tests/e2e/admin-overview.spec.ts:38:1 › the Overview screen lists a draft's marked photo with the tag «Чернетка» and the title of its session, and removing it keeps it in the session (5.5s)
  ✓  903 [admin-data-firefox] › tests/e2e/admin-publish.spec.ts:29:1 › the preview of a draft opens in a new tab in the public layout with the banner, the draft's photos from the admin copy address and no language switcher (6.0s)
  ✓  904 [admin-data-firefox] › tests/e2e/admin-photos.spec.ts:50:1 › a photo moves with the keyboard: Space, two ArrowLeft and Space put C first, and a reload shows it (6.4s)
  ✓  906 [admin-data-firefox] › tests/e2e/admin-publish.spec.ts:58:1 › a visitor, an unknown id and a non-numeric id all get the same public page not found, and the English preview does not exist (2.1s)
  ✓  905 [admin-data-firefox] › tests/e2e/admin-overview.spec.ts:58:1 › marking in the options dialog puts the photo at the end of the Overview order (3.3s)
  ✓  901 [admin-data-firefox] › tests/e2e/admin-owner-flow.spec.ts:13:1 › a session goes from nothing to live through the admin pages alone (8.9s)
  ✓  908 [admin-data-firefox] › tests/e2e/admin-publish.spec.ts:78:1 › a draft's copies are not served, publishing serves them and unpublishing stops it, with the copies moving between data/drafts and data/media (4.9s)
  ✓  907 [admin-data-firefox] › tests/e2e/admin-photos.spec.ts:64:1 › Esc puts a held photo back and sends no save call (7.8s)
  ✓  910 [admin-data-firefox] › tests/e2e/admin-publish.spec.ts:111:1 › publishing a session with no ready photo shows the message and the session stays a draft (853ms)
  ✓  909 [admin-data-firefox] › tests/e2e/admin-overview.spec.ts:76:1 › photos of two published sessions alternate in the photographer's order: dragging P2 to the place of P1 reaches the public Overview (5.8s)
  ✓  912 [admin-data-firefox] › tests/e2e/admin-publish.spec.ts:123:1 › the old address of a published session answers 301 in both languages, and 404 while it is a draft (1.6s)
  ✓  911 [admin-data-firefox] › tests/e2e/admin-photos.spec.ts:84:1 › one pointer drag puts a photo in the place of the photo it is dropped on (4.9s)
  ✓  914 [admin-data-firefox] › tests/e2e/admin-publish.spec.ts:154:1 › a draft keeps no redirect when its address changes (4.5s)
  ✓  913 [admin-data-firefox] › tests/e2e/admin-overview.spec.ts:96:1 › a stale Overview screen shows why the order was not saved and then the current list (5.8s)
  ✓  917 [admin-data-firefox] › tests/e2e/admin-overview.spec.ts:115:1 › unpublishing takes the photos off the public Overview, and the admin screen still lists them as a draft (2.2s)
  ✓  916 [admin-data-firefox] › tests/e2e/admin-publish.spec.ts:169:1 › publishing again moves a session up among the sessions of the same shoot date (3.7s)
  ✓  915 [admin-data-firefox] › tests/e2e/admin-photos.spec.ts:106:1 › a failed save puts the order back and says the data changed (5.8s)
  ✓  918 [admin-data-firefox] › tests/e2e/admin-overview.spec.ts:129:1 › a deleted photo and then a deleted session leave the admin and the public Overview (2.6s)
  ✓  919 [admin-data-firefox] › tests/e2e/admin-publish.spec.ts:199:1 › deleting a session asks first, and a confirmed delete removes its address, its photos and every file (2.8s)
  ✓  921 [admin-data-firefox] › tests/e2e/admin-overview.spec.ts:149:1 › an Overview tile has a drag handle that is a button named «Перемістити фото» (1.9s)
  ✓  920 [admin-data-firefox] › tests/e2e/admin-photos.spec.ts:120:1 › a stale tab shows why the order was not saved and then the current photos (6.4s)
  ✓  922 [admin-data-firefox] › tests/e2e/admin-publish.spec.ts:228:1 › a published session shows the texts, the order, the cover and the descriptions on the next load (4.8s)
  ✓  924 [admin-data-firefox] › tests/e2e/admin-publish.spec.ts:257:1 › the editor writes the publish time as a Kyiv time (4.6s)
  ✓  923 [admin-data-firefox] › tests/e2e/admin-photos.spec.ts:138:1 › the first photo is the cover until another is picked, and a picked cover stays after a reorder (5.8s)
  ✓  925 [admin-data-firefox] › tests/e2e/admin-photos.spec.ts:157:1 › descriptions and the Overview mark are saved together in the options dialog and the photo shows on the admin Overview screen (2.8s)
  ✓  926 [admin-data-firefox] › tests/e2e/admin-photos.spec.ts:182:1 › the options dialog keeps focus inside, Esc closes it, and focus goes back to the «Параметри» button that opened it (2.8s)
  ✓  927 [admin-data-firefox] › tests/e2e/admin-photos.spec.ts:201:1 › deleting a photo asks first, cancelling keeps it, and a confirmed delete removes its files (2.9s)
  ✓  928 [admin-data-firefox] › tests/e2e/admin-photos.spec.ts:225:1 › the editor of a session shows «Перемістити фото» as a button on each ready tile and a number under each photo (5.0s)
  ✓  929 [empty-list] › tests/e2e/public-empty-list.spec.ts:19:1 › with no published session the Sessions page answers 200 with the header, the footer and no card (43ms)
  ✓  930 [booking-serial] › tests/e2e/booking-serial.spec.ts:16:1 › with no requests the list says so and the counter shows 0 (458ms)
  ✓  931 [booking-serial] › tests/e2e/booking-serial.spec.ts:28:1 › the counter of new requests is on every admin page and follows a status move and a delete (2.8s)
  ✓  932 [booking-limit] › tests/e2e/booking-limit.spec.ts:34:1 › the eleventh send shows the exact limit text above the Send button, in each language, and keeps the typed text (4.5s)
  ✓  933 [booking-limit] › tests/e2e/booking-limit.spec.ts:64:1 › the limit answer is 429 with Retry-After between 1 and 3600 seconds (1.1s)
  ✓  934 [booking-limit] › tests/e2e/booking-limit.spec.ts:77:1 › a forged X-Forwarded-For does not make an address new: ten sends with ten forged values still use up one address (177ms)
  ✓  935 [booking-limit] › tests/e2e/booking-limit.spec.ts:91:1 › a visitor on another address is not affected: a send from inside the compose network is saved while the host's address is at its limit (1.5s)
  ✓  936 [booking-limit] › tests/e2e/booking-limit.spec.ts:105:1 › refused and trapped sends do not count, so the tenth valid send is saved (1.2s)
  ✓  937 [booking-telegram] › tests/e2e/booking-telegram.spec.ts:31:1 › a request sent through the form reaches the requests group within 10 seconds as one plain notice with the admin link (1.3s)
  ✓  938 [booking-telegram] › tests/e2e/booking-telegram.spec.ts:65:1 › a request whose notice failed shows the not-sent mark, and after Telegram is back the retry sends it and the mark goes away (1.4s)
  ✓  939 [booking-telegram] › tests/e2e/booking-telegram.spec.ts:83:1 › a supergroup answer shows the chat ID notice above every admin page and the request keeps its mark (993ms)
  ✓  940 [admin-caddy] › tests/e2e/admin-caddy.spec.ts:12:1 › Google sign-in addresses reach Spring (19ms)
  ✓  941 [admin-caddy] › tests/e2e/admin-caddy.spec.ts:20:1 › E2E tests reach the test-only login on Spring's loopback port, and Caddy answers 404 for it without asking Spring (528ms)
  ✓  942 [admin-caddy] › tests/e2e/admin-caddy.spec.ts:42:1 › Google's return address reaches Spring: the same answer as Spring gives on its own port, and not a Next.js page (7ms)
  ✓  943 [admin-caddy] › tests/e2e/admin-caddy.spec.ts:52:1 › an admin page is a Next.js page with no cache header, and an admin API call is a Spring problem answer (8ms)
  ✓  944 [admin-caddy] › tests/e2e/admin-caddy.spec.ts:66:1 › an unknown Google registration id is Spring's plain 404 through Caddy, like on Spring's own port (6ms)
  ✓  945 [admin-caddy] › tests/e2e/admin-caddy.spec.ts:75:1 › an encoded spelling of an admin API address answers 401 to a person with no login (4ms)
  ✓  946 [backend-down] › tests/e2e/public-backend-down.spec.ts:36:1 › with the backend stopped, every engine shows a plain message in the page's language with a link to the Overview (3.0s)
  ✓  947 [backend-down] › tests/e2e/public-backend-down.spec.ts:68:1 › with the backend stopped the 404 pages still answer 404 with the default preview image (45ms)
  ✓  948 [backend-down] › tests/e2e/public-backend-down.spec.ts:87:1 › the raw HTML of a failed page holds the message, the Overview link and the language, with the status in the 500 range (126ms)
  ✓  949 [backend-down] › tests/e2e/public-backend-down.spec.ts:110:1 › the failed page Caddy sends has no serious or critical axe finding, in both languages and both colour schemes (882ms)
  ✓  950 [backend-down] › tests/e2e/public-backend-down.spec.ts:132:1 › a failed render is reported once in the frontend log as a report that could not be sent, and the page still answers its error page (194ms)
  ✓  951 [admin-backend-down] › tests/e2e/admin-backend-down.spec.ts:35:1 › with the backend stopped, /admin and /admin/sessions answer 503 with the plain text and no admin content (52ms)
  ✓  952 [admin-backend-down] › tests/e2e/admin-backend-down.spec.ts:50:1 › a browser shows the message on a page of its own, in Ukrainian (89ms)
  ✓  953 [admin-backend-down] › tests/e2e/admin-backend-down.spec.ts:59:1 › after the backend starts again the admin content shows with the same login (7.1s)
  ✓  954 [stack-restart] › tests/e2e/restart.spec.ts:28:1 › a killed Spring Boot process is restarted by Docker within one minute, and the site answers again (5.2s)
  ✓  955 [admin-restart] › tests/e2e/admin-restart.spec.ts:13:1 › a login and a token read before a restart of the backend still work after it (7.4s)
  ✓  956 [booking-restart] › tests/e2e/booking-telegram-restart.spec.ts:28:1 › the chat ID notice survives a backend restart while the setting is still the old one (8.1s)
  ✓  957 [public-cleanup] › tests/e2e/public.teardown.ts:5:1 › remove the sessions this run seeded (454ms)
  ✓  958 [public-cleanup] › tests/e2e/public.teardown.ts:9:1 › put the About page back as migration V9 leaves it (332ms)

  4 skipped
  954 passed (16.3m)
```

Skipped tests of the e2e run (four Chromium-only tests that webkit and firefox skip by design):

```
  -  567 [webkit] › tests/e2e/public-viewer.spec.ts:131:3 › a real touch screen › a CDP touch swipe moves to the next photo in Chromium
  -  776 [webkit] › tests/e2e/public-overview.spec.ts:363:1 › each loaded copy fits its slot: at least as wide as shown, and the next smaller one narrower
  -  804 [firefox] › tests/e2e/public-viewer.spec.ts:131:3 › a real touch screen › a CDP touch swipe moves to the next photo in Chromium
  -  842 [firefox] › tests/e2e/public-overview.spec.ts:363:1 › each loaded copy fits its slot: at least as wide as shown, and the next smaller one narrower
```

## 5a. npx openspec validate --all --strict

```
command: npx openspec validate --all --strict
exit code: 0
duration: 1 s
--- tail -30 ---
  ℹ [INFO] requirements[0]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[2]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[3]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[4]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[6]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[7]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[8]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[9]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[17]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[19]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[30]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[31]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[32]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[33]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[40]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[41]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[42]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[45]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[46]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[47]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[48]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[49]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[50]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[51]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[52]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[53]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[55]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[56]: Requirement text is very long (>500 characters). Consider breaking it down.
  ℹ [INFO] requirements[58]: Requirement text is very long (>500 characters). Consider breaking it down.
Totals: 9 passed, 0 failed (9 items)
```

## 5b. check-traceability --check-fresh

```
command: node scripts/check-traceability.mjs --check-fresh
exit code: 0
duration: 0 s
--- tail -40 ---
WARN  [recording-evidence] FR-167 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-115 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-116 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-117 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-118 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-119 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-120 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-121 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-122 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-123 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-124 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-125 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-126 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-127 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-128 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-129 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-130 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-131 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-132 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-133 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-134 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-135 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-136 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-137 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-138 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-139 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-140 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-141 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-142 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-143 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-144 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-145 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-146 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-147 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-148 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-149 is not referenced by any recording manifest under docs/qa/
WARN  [recording-evidence] FR-150 is not referenced by any recording manifest under docs/qa/
WARN  [active-changes] active change "improve-PD-31" is not archived

traceability: 155 MVP FRs checked — 0 failure(s), 106 warning(s)
```

## 5c. check-trajectory --check-fresh

```
command: node scripts/check-trajectory.mjs --check-fresh
exit code: 0
duration: 1 s
--- tail -40 ---
WARN  [review-evidence] 2026-10-01-improve-PD-45: review-findings.json is missing (review must have run clean before archive)
WARN  [process] 2026-10-01-improve-PD-45: archived change is missing design.md and/or tasks.md
WARN  [trailer] 2026-10-01-improve-PD-45: no commit carries a "Slice: improve-PD-45" trailer
WARN  [review-evidence] 2026-10-01-improve-PD-46: review-findings.json is missing (review must have run clean before archive)
WARN  [process] 2026-10-01-improve-PD-46: archived change is missing design.md and/or tasks.md
WARN  [trailer] 2026-10-01-improve-PD-46: no commit carries a "Slice: improve-PD-46" trailer
WARN  [review-evidence] 2026-10-01-improve-PD-47: review-findings.json is missing (review must have run clean before archive)
WARN  [process] 2026-10-01-improve-PD-47: archived change is missing design.md and/or tasks.md
WARN  [trailer] 2026-10-01-improve-PD-47: no commit carries a "Slice: improve-PD-47" trailer
WARN  [review-evidence] 2026-10-01-improve-PD-5: review-findings.json is missing (review must have run clean before archive)
WARN  [process] 2026-10-01-improve-PD-5: archived change is missing design.md and/or tasks.md
WARN  [trailer] 2026-10-01-improve-PD-5: no commit carries a "Slice: improve-PD-5" trailer
WARN  [review-evidence] 2026-10-01-improve-PD-6: review-findings.json is missing (review must have run clean before archive)
WARN  [process] 2026-10-01-improve-PD-6: archived change is missing design.md and/or tasks.md
WARN  [trailer] 2026-10-01-improve-PD-6: no commit carries a "Slice: improve-PD-6" trailer
WARN  [review-evidence] 2026-10-01-improve-PD-7: review-findings.json is missing (review must have run clean before archive)
WARN  [process] 2026-10-01-improve-PD-7: archived change is missing design.md and/or tasks.md
WARN  [trailer] 2026-10-01-improve-PD-7: no commit carries a "Slice: improve-PD-7" trailer
WARN  [review-evidence] 2026-10-01-improve-PD-8: review-findings.json is missing (review must have run clean before archive)
WARN  [process] 2026-10-01-improve-PD-8: archived change is missing design.md and/or tasks.md
WARN  [trailer] 2026-10-01-improve-PD-8: no commit carries a "Slice: improve-PD-8" trailer
WARN  [review-evidence] 2026-10-01-improve-PD-9: review-findings.json is missing (review must have run clean before archive)
WARN  [process] 2026-10-01-improve-PD-9: archived change is missing design.md and/or tasks.md
WARN  [trailer] 2026-10-01-improve-PD-9: no commit carries a "Slice: improve-PD-9" trailer
WARN  [in-scope] module "config" modified by 8 slices (2026-09-30-add-admin-access, 2026-09-30-add-photo-pipeline, 2026-09-30-add-public-sessions, 2026-10-01-add-ai-translate, 2026-10-01-add-backups, 2026-10-01-add-booking-requests, 2026-10-01-add-error-alerts, 2026-10-01-add-session-admin) — revi
WARN  [in-scope] module "admin" modified by 5 slices (2026-09-30-add-admin-access, 2026-10-01-add-about, 2026-10-01-add-ai-translate, 2026-10-01-add-booking-requests, 2026-10-01-add-session-admin) — review for scope drift
WARN  [in-scope] module "controller" modified by 10 slices (2026-09-30-add-admin-access, 2026-09-30-add-overview, 2026-09-30-add-photo-pipeline, 2026-09-30-add-public-sessions, 2026-10-01-add-about, 2026-10-01-add-ai-translate, 2026-10-01-add-backups, 2026-10-01-add-booking-requests, 2026-10-01-add-
WARN  [in-scope] module "exception" modified by 7 slices (2026-09-30-add-admin-access, 2026-09-30-add-photo-pipeline, 2026-09-30-add-public-sessions, 2026-10-01-add-about, 2026-10-01-add-ai-translate, 2026-10-01-add-booking-requests, 2026-10-01-add-session-admin) — review for scope drift
WARN  [in-scope] module "model" modified by 10 slices (2026-09-30-add-admin-access, 2026-09-30-add-overview, 2026-09-30-add-photo-pipeline, 2026-09-30-add-public-sessions, 2026-10-01-add-about, 2026-10-01-add-ai-translate, 2026-10-01-add-backups, 2026-10-01-add-booking-requests, 2026-10-01-add-error
WARN  [in-scope] module "service" modified by 10 slices (2026-09-30-add-admin-access, 2026-09-30-add-overview, 2026-09-30-add-photo-pipeline, 2026-09-30-add-public-sessions, 2026-10-01-add-about, 2026-10-01-add-ai-translate, 2026-10-01-add-backups, 2026-10-01-add-booking-requests, 2026-10-01-add-err
WARN  [in-scope] module "[lang]" modified by 5 slices (2026-09-30-add-overview, 2026-09-30-add-public-sessions, 2026-10-01-add-about, 2026-10-01-add-booking-requests, 2026-10-01-add-error-alerts) — review for scope drift
WARN  [in-scope] module "repository" modified by 6 slices (2026-09-30-add-overview, 2026-09-30-add-photo-pipeline, 2026-09-30-add-public-sessions, 2026-10-01-add-about, 2026-10-01-add-booking-requests, 2026-10-01-add-session-admin) — review for scope drift
WARN  [in-scope] module "seed" modified by 4 slices (2026-09-30-add-overview, 2026-09-30-add-photo-pipeline, 2026-09-30-add-public-sessions, 2026-10-01-add-session-admin) — review for scope drift
WARN  [in-scope] module "image" modified by 2 slices (2026-09-30-add-photo-pipeline, 2026-10-01-add-session-admin) — review for scope drift
WARN  [in-scope] module "i18n" modified by 3 slices (2026-09-30-add-public-sessions, 2026-10-01-add-about, 2026-10-01-add-booking-requests) — review for scope drift
WARN  [in-scope] module "alert" modified by 2 slices (2026-10-01-add-booking-requests, 2026-10-01-add-error-alerts) — review for scope drift
WARN  [in-scope] module "telegram" modified by 2 slices (2026-10-01-add-booking-requests, 2026-10-01-add-error-alerts) — review for scope drift

Scope: 48 archived slice(s)
Result: PASS, 124 warning(s)
```

## 5d. check-factory-integrity

```
command: node scripts/check-factory-integrity.mjs
exit code: 0
duration: 0 s
--- tail -40 ---
WARN  [.github/workflows/deploy.yml] gate-bearing drift (hash drift) is covered by an approved improvement commit (message contains "Refs: PD-<n>") — reseal with --init-lock inside that improvement.
WARN  [hooks] gap: core.hooksPath is "<local path>" — .githooks/ exists but git will never run it; run `git config core.hooksPath .githooks`.

Scope: 37 locked file(s)
Result: PASS, 2 warning(s)
```

## 5e. check-eval-ratchet

```
command: node scripts/check-eval-ratchet.mjs
exit code: 0
duration: 0 s
--- tail -40 ---
Scope: 50 eval case(s)
OK    error-clarity 91.9 (baseline 91.9)
OK    translation-quality 82.6 (baseline 82.6)
Result: PASS
```

## 5f. npm run check:vision

```
command: npm run check:vision
exit code: 0
duration: 0 s
--- tail -40 ---

> check:vision
> node scripts/check-vision.mjs


Scope: 7 requirement(s) tagged vision-verify, 79 clip(s)
wrote docs/qa/vision-report.json and docs/qa/vision-report.md
Result: PASS
```

## 5g. check-recordings

```
command: node scripts/check-recordings.mjs
exit code: 0
duration: 0 s
--- tail -40 ---

Scope: 79 clip(s) across 6 manifest(s)
Result: PASS
```

## 5h. check-acceptance-methods --mode=existence

```
command: node scripts/check-acceptance-methods.mjs --mode=existence
exit code: 0
duration: 0 s
--- tail -40 ---
Scope: 192 tagged requirement(s)
acceptance (existence): 235 contract(s) across 192 requirement(s) — 0 failure(s), 0 warning(s), 0 pending
Result: PASS
```

## 5i. gate-status, before the e2e run

```
command: node scripts/gate-status.mjs
exit code: 1
duration: 4 s
--- tail -60 ---
Gate status (three-valued deterministic checks — judgment criteria sit on top, verify those by hand):

  G0  PASS           scaffold + loop installed
  G1  PASS           requirements signed off
  G2  PASS           baseline specs  [openspec validate --all --strict · traceability]
  G3  needs sign-off capability plan + acceptance methods exist  [acceptance-methods --mode=existence]
  G4  FAIL           per-slice  [openspec validate --all --strict · traceability · trajectory · acceptance-methods --mode=artifact · process-ratchet · factory-integrity]
  G5  NOT-EARNED     hardening (coverage)  [coverage-ratchet]
  G6  FAIL           QA proof  [recordings · eval-ratchet · acceptance-methods --mode=artifact · visual-fidelity · process-ratchet · factory-integrity]
  G7  FAIL           release  [traceability --release --strict-tests --strict-recordings · trajectory --release --check-fresh · recordings · acceptance-methods --mode=artifact · factory-integrity]
  G8  NOT-EARNED     UAT (trace regressions)  [traceability]

Deterministic checks (ladder rung from RULES-CHANGELOG.md; unlisted = experimental):
  traceability         PASS           [experimental]
  trajectory           PASS           [experimental]  Scope: 48
  recordings           PASS           [experimental]  Scope: 79
  coverage             NOT-EARNED     [experimental]  Scope: 0
  evals                PASS           [experimental]  Scope: 50
  acceptanceExistence  PASS           [experimental]  Scope: 192
  acceptanceArtifact   FAIL           [experimental]  Scope: 192
  visual               NOT-EARNED     [experimental]  Scope: 0
  processRatchet       NOT-EARNED     [experimental]  Scope: 3
  integrity            PASS           [experimental]  Scope: 37
  openspecValidate     PASS           [experimental]
  traceabilityRelease  FAIL           [experimental]
  trajectoryRelease    FAIL           [experimental]  Scope: 48

Open corrections (no gate may render a green summary while these are open):
  OPEN-CORRECTION COR-1 (retro/corrections/001-r2-lifecycle-the-orchestrator-claimed-r2-deletes.correction.json): "R2 lifecycle: the orchestrator claimed R2 deletes nothing by itself and the photos mirror never ages out; the owner's Cloudflare screenshot shows a bucket-wide lifecycle rule delete-aft

Unrecorded corrections (detector events with no correction artifact — run `node scripts/correct.mjs --detect`, then disposition):
  UNRECORDED-CORRECTION waiver-created (docs/qa/waivers/NFR-18-session-page-lcp.md) — AUTO: waiver created (docs/qa/waivers/NFR-18-session-page-lcp.md) — an evidence requirement was waived; record why and disposition this correction.
  UNRECORDED-CORRECTION waiver-created (docs/qa/waivers/backup-deploy-probes.md) — AUTO: waiver created (docs/qa/waivers/backup-deploy-probes.md) — an evidence requirement was waived; record why and disposition this correction.
  UNRECORDED-CORRECTION waiver-created (docs/qa/waivers/loosen-eval-error-clarity-2026-10-01.json) — AUTO: waiver created (docs/qa/waivers/loosen-eval-error-clarity-2026-10-01.json) — an evidence requirement was waived; record why and disposition this correction.
  UNRECORDED-CORRECTION waiver-created (docs/qa/waivers/slice6-red-e2e.md) — AUTO: waiver created (docs/qa/waivers/slice6-red-e2e.md) — an evidence requirement was waived; record why and disposition this correction.

DIVERGENCE: docs/current-state.md claims "Last completed gate: G3" but the computed frontier is G2 — hard fail: the header may not outrun computed gate status.

DIVERGENCE: docs/current-state.md claims "Current phase: Phase 4" but gates G0–G3 are not all earned (computed frontier: G2) — hard fail: the header may not outrun computed gate status.

(Reviews, sign-offs, and vision-verify are judgment gates — confirm them in docs/qa + the gate checklist.)

Scope: 9 gate(s)
Result: FAIL
```

## 5j. gate-status, after the e2e run and the first live check

```
command: node scripts/gate-status.mjs
exit code: 1
duration: 8 s
--- tail -70 ---
Gate status (three-valued deterministic checks — judgment criteria sit on top, verify those by hand):

  G0  PASS           scaffold + loop installed
  G1  PASS           requirements signed off
  G2  PASS           baseline specs  [openspec validate --all --strict · traceability]
  G3  needs sign-off capability plan + acceptance methods exist  [acceptance-methods --mode=existence]
  G4  FAIL           per-slice  [openspec validate --all --strict · traceability · trajectory · acceptance-methods --mode=artifact · process-ratchet · factory-integrity]
  G5  NOT-EARNED     hardening (coverage)  [coverage-ratchet]
  G6  FAIL           QA proof  [recordings · eval-ratchet · acceptance-methods --mode=artifact · visual-fidelity · process-ratchet · factory-integrity]
  G7  FAIL           release  [traceability --release --strict-tests --strict-recordings · trajectory --release --check-fresh · recordings · acceptance-methods --mode=artifact · factory-integrity]
  G8  NOT-EARNED     UAT (trace regressions)  [traceability]

Deterministic checks (ladder rung from RULES-CHANGELOG.md; unlisted = experimental):
  traceability         PASS           [experimental]
  trajectory           PASS           [experimental]  Scope: 48
  recordings           PASS           [experimental]  Scope: 79
  coverage             NOT-EARNED     [experimental]  Scope: 0
  evals                PASS           [experimental]  Scope: 50
  acceptanceExistence  PASS           [experimental]  Scope: 192
  acceptanceArtifact   FAIL           [experimental]  Scope: 192
  visual               NOT-EARNED     [experimental]  Scope: 0
  processRatchet       NOT-EARNED     [experimental]  Scope: 3
  integrity            PASS           [experimental]  Scope: 37
  openspecValidate     PASS           [experimental]
  traceabilityRelease  FAIL           [experimental]
  trajectoryRelease    FAIL           [experimental]  Scope: 48

Open corrections (no gate may render a green summary while these are open):
  OPEN-CORRECTION COR-1 (retro/corrections/001-r2-lifecycle-the-orchestrator-claimed-r2-deletes.correction.json): "R2 lifecycle: the orchestrator claimed R2 deletes nothing by itself and the photos mirror never ages out; the owner's Cloudflare screenshot shows a bucket-wide lifecycle rule delete-aft

Unrecorded corrections (detector events with no correction artifact — run `node scripts/correct.mjs --detect`, then disposition):
  UNRECORDED-CORRECTION waiver-created (docs/qa/waivers/NFR-18-session-page-lcp.md) — AUTO: waiver created (docs/qa/waivers/NFR-18-session-page-lcp.md) — an evidence requirement was waived; record why and disposition this correction.
  UNRECORDED-CORRECTION waiver-created (docs/qa/waivers/backup-deploy-probes.md) — AUTO: waiver created (docs/qa/waivers/backup-deploy-probes.md) — an evidence requirement was waived; record why and disposition this correction.
  UNRECORDED-CORRECTION waiver-created (docs/qa/waivers/loosen-eval-error-clarity-2026-10-01.json) — AUTO: waiver created (docs/qa/waivers/loosen-eval-error-clarity-2026-10-01.json) — an evidence requirement was waived; record why and disposition this correction.
  UNRECORDED-CORRECTION waiver-created (docs/qa/waivers/slice6-red-e2e.md) — AUTO: waiver created (docs/qa/waivers/slice6-red-e2e.md) — an evidence requirement was waived; record why and disposition this correction.

DIVERGENCE: docs/current-state.md claims "Last completed gate: G3" but the computed frontier is G2 — hard fail: the header may not outrun computed gate status.

DIVERGENCE: docs/current-state.md claims "Current phase: Phase 4" but gates G0–G3 are not all earned (computed frontier: G2) — hard fail: the header may not outrun computed gate status.

(Reviews, sign-offs, and vision-verify are judgment gates — confirm them in docs/qa + the gate checklist.)

Scope: 9 gate(s)
Result: FAIL
```

## 6a. check:deploy against the live site, run 1

```
command: DEPLOY_URL=https://example-app.example.com npm run check:deploy
exit code: 1
duration: 176 s
--- tail -80 ---

> check:deploy
> node scripts/check-deploy.mjs

UNCOVERED  [FR-136] no probe measures this requirement yet
UNCOVERED  [FR-137] no probe measures this requirement yet
UNCOVERED  [FR-138] no probe measures this requirement yet
UNCOVERED  [FR-141] no probe measures this requirement yet
PASS       [FR-146] HTTPS answered 200; certificate example-app.example.com: Let's Encrypt, 87 day(s) left (renewal is inferred from the days left)
UNCOVERED  [FR-147] needs a GitHub token to read the ci run of the last push to main
UNCOVERED  [FR-148] needs a GitHub token with packages: read to list the GHCR image tags
UNCOVERED  [FR-149] needs a GitHub token to read the deploy run, or SSH to the server to read the running image
UNCOVERED  [FR-150] needs a GitHub token to read a failed ci run and its skipped deploy run
PASS       [NFR-11] http://example-app.example.com/ answered 308 to https://example-app.example.com/
FAIL       [NFR-18] p75 LCP over 5 mobile run(s) each: / 2880 ms, /sessions 2880 ms, /sessions/sup-competition 2573 ms; budget 2500 ms
PASS       [NFR-19] p95 first byte 88 ms over 20 request(s) over /, /sessions, /en, /en/sessions, budget 600 ms
PASS       [NFR-20] median Lighthouse mobile performance over 5 run(s) each: / 95, /sessions 95, /sessions/sup-competition 97; minimum 90
UNCOVERED  [NFR-21] no probe measures this requirement yet
UNCOVERED  [NFR-22] no probe measures this requirement yet
UNCOVERED  [NFR-23] needs SSH to the server to read the container memory limits and docker stats
PARTIAL    [NFR-24] https://example-app.example.com/ answered 200 in 73 ms; the monthly 99% share needs the outside monitor's history, which this check does not read
UNCOVERED  [NFR-26] no probe measures this requirement yet
PARTIAL    [NFR-7] ports 3000, 5432, 8080 refuse connections; SSH keys-only and automatic updates are not probed

Scope: 19 requirement(s) tagged deploy-gated against https://example-app.example.com
wrote docs/qa/deploy-verification.json
Result: FAIL
```

## 6b. check:deploy against the live site, run 2 (flakiness check)

```
command: DEPLOY_URL=https://example-app.example.com npm run check:deploy
exit code: 1
duration: 175 s
--- tail -80 ---

> check:deploy
> node scripts/check-deploy.mjs

UNCOVERED  [FR-136] no probe measures this requirement yet
UNCOVERED  [FR-137] no probe measures this requirement yet
UNCOVERED  [FR-138] no probe measures this requirement yet
UNCOVERED  [FR-141] no probe measures this requirement yet
PASS       [FR-146] HTTPS answered 200; certificate example-app.example.com: Let's Encrypt, 87 day(s) left (renewal is inferred from the days left)
UNCOVERED  [FR-147] needs a GitHub token to read the ci run of the last push to main
UNCOVERED  [FR-148] needs a GitHub token with packages: read to list the GHCR image tags
UNCOVERED  [FR-149] needs a GitHub token to read the deploy run, or SSH to the server to read the running image
UNCOVERED  [FR-150] needs a GitHub token to read a failed ci run and its skipped deploy run
PASS       [NFR-11] http://example-app.example.com/ answered 308 to https://example-app.example.com/
FAIL       [NFR-18] p75 LCP over 5 mobile run(s) each: / 3121 ms, /sessions 2872 ms, /sessions/sup-competition 2571 ms; budget 2500 ms
PASS       [NFR-19] p95 first byte 81 ms over 20 request(s) over /, /sessions, /en, /en/sessions, budget 600 ms
PASS       [NFR-20] median Lighthouse mobile performance over 5 run(s) each: / 94, /sessions 95, /sessions/sup-competition 97; minimum 90
UNCOVERED  [NFR-21] no probe measures this requirement yet
UNCOVERED  [NFR-22] no probe measures this requirement yet
UNCOVERED  [NFR-23] needs SSH to the server to read the container memory limits and docker stats
PARTIAL    [NFR-24] https://example-app.example.com/ answered 200 in 69 ms; the monthly 99% share needs the outside monitor's history, which this check does not read
UNCOVERED  [NFR-26] no probe measures this requirement yet
PARTIAL    [NFR-7] ports 3000, 5432, 8080 refuse connections; SSH keys-only and automatic updates are not probed

Scope: 19 requirement(s) tagged deploy-gated against https://example-app.example.com
wrote docs/qa/deploy-verification.json
Result: FAIL
```

## NFR-18 against the waiver

Budget: p75 LCP 2500 ms over 5 Lighthouse mobile runs per page. Waiver: `docs/qa/waivers/NFR-18-session-page-lcp.md` (session page 3088 ms, Overview 3249 ms, Sessions page passes).

| Page | Waiver baseline | Run 1 | Run 2 |
|---|---|---|---|
| `/` (Overview) | 3249 ms | 2880 ms | 3121 ms |
| `/sessions` | passed when waived | 2880 ms | 2872 ms |
| `/sessions/sup-competition` | 3088 ms | 2573 ms | 2571 ms |

Mobile performance score (NFR-20, minimum 90) passes: `/` 95 and 94, `/sessions` 95 and 95, session page 97 and 97.
No page is inside the 2500 ms budget. `/` and the session page are inside what the waiver measured. `/sessions` was outside the waiver scope and now also exceeds the budget (2872 to 2880 ms).
The committed `docs/qa/deploy-verification.json` is the output of run 2.
