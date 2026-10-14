import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import starter from "../../content/exams/goethe-a1-sd1-adult/starter-01.v1.json";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ execute: vi.fn(), session: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => ({ execute: mocks.execute }) }));
vi.mock("@/lib/auth", () => ({
  isCloudConfigured: () => true,
  getAuth: () => ({ getSession: mocks.session }),
}));
import { ExamRepository } from "@/lib/exams/repository";
import { promoteExam } from "@/lib/exams/release";
import {
  examPackSchema,
  examAnswerSchema,
  examReviewCategories,
  type ExamPack,
} from "@/lib/exams/model";
import { POST as createRoute } from "@/app/api/exams/attempts/route";
import { GET as getAttemptRoute } from "@/app/api/exams/attempts/[attemptId]/route";
import { PATCH as saveRoute } from "@/app/api/exams/attempts/[attemptId]/answer/route";
import { POST as adminRoute } from "@/app/api/admin/exams/route";
import { GET as demoRoute } from "@/app/api/exams/demo/route";
const actor = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Local test reviewer",
  email: "exam-reviewer@fixtures.test",
  emailVerified: true,
};
const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const origin = "http://localhost:3008";
let postgres: PGlite;
const dialect = new PgDialect();
const repo = new ExamRepository((query) => mocks.execute(query));
function readingPack(version = 1): ExamPack {
  const base = examPackSchema.parse(starter);
  return examPackSchema.parse({
    ...base,
    id: "fixture-reading",
    version,
    title: "Local synthetic reading fixture",
    rights: {
      ...base.rights,
      verified: true,
      license: "Original local test fixture only",
    },
    media: [],
    blueprint: {
      ...base.blueprint,
      sectionCounts: { listening: 0, reading: 3, writing: 0, speaking: 0 },
    },
    tasks: base.tasks.filter((task) => task.skill === "reading"),
  });
}
const request = (
  path: string,
  method = "GET",
  body?: unknown,
  account = actor.id,
) =>
  new Request(origin + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Learning-Account": account,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
beforeAll(async () => {
  postgres = new PGlite();
  await postgres.exec(
    'create schema neon_auth;create table neon_auth."user"(id uuid primary key);',
  );
  const journal = JSON.parse(
    readFileSync("drizzle/neon/meta/_journal.json", "utf8"),
  );
  for (const entry of journal.entries)
    await postgres.exec(readFileSync(`drizzle/neon/${entry.tag}.sql`, "utf8"));
  await postgres.query('insert into neon_auth."user"(id) values ($1),($2)', [
    actor.id,
    other,
  ]);
}, 30000);
beforeEach(async () => {
  await postgres.exec("truncate exam_definitions cascade;");
  mocks.execute.mockImplementation((query: SQL) => {
    const compiled = dialect.sqlToQuery(query);
    return postgres.query(compiled.sql, compiled.params);
  });
  mocks.session.mockResolvedValue({ data: { user: actor }, error: null });
  vi.stubEnv("APP_URL", origin);
  for (const role of ["author", ...examReviewCategories, "publisher"])
    vi.stubEnv(`CONTENT_${role.toUpperCase()}_EMAILS`, actor.email);
});
afterAll(async () => {
  await postgres.close();
  vi.unstubAllEnvs();
});
async function approveReading(version = 1) {
  const imported = await repo.importDraft(readingPack(version));
  for (const category of ["language", "pedagogy", "arabic", "rights"] as const)
    await repo.review(
      imported.id,
      imported.hash,
      category,
      "approved",
      "Synthetic signoff for an isolated local test, not real human approval.",
      actor,
    );
  await repo.publish(imported.id, imported.hash, actor.id, "publish");
  return imported;
}
describe("Private exam content, attempts and publication", () => {
  it("copies real review evidence idempotently without overriding a newer rejection", async () => {
    const paper = await approveReading(),
      source = await repo.detail(paper.id);
    const evidence = source.reviews.find(
      (review) => review.category === "language",
    )!;
    await repo.importReviewEvidence(paper.id, evidence);
    await repo.importReviewEvidence(paper.id, evidence);
    expect((await repo.detail(paper.id)).reviews).toHaveLength(4);
    await repo.review(
      paper.id,
      paper.hash,
      "language",
      "changes_requested",
      "Synthetic later target rejection for local tests.",
      actor,
    );
    await repo.importReviewEvidence(paper.id, evidence);
    expect((await repo.detail(paper.id)).blockers.join(" ")).toMatch(
      /language/,
    );
    await expect(
      repo.publish(paper.id, paper.hash, actor.id, "publish"),
    ).rejects.toThrow(/language/);
    await expect(
      repo.importReviewEvidence(paper.id, {
        ...evidence,
        hash: "0".repeat(64),
      }),
    ).rejects.toThrow(/hash/);
  });
  it("promotes only exact reviewed versions and rechecks development gates", async () => {
    const paper = await approveReading(),
      pack = readingPack();
    const inspect = vi.fn();
    await expect(
      promoteExam(repo, repo, pack, "0".repeat(64), actor.id, inspect),
    ).rejects.toThrow(/hash/);
    const result = await promoteExam(
      repo,
      repo,
      pack,
      paper.hash,
      actor.id,
      inspect,
    );
    expect(result.id).toBe(paper.id);
    expect(inspect).not.toHaveBeenCalled();
    await repo.review(
      paper.id,
      paper.hash,
      "rights",
      "changes_requested",
      "Synthetic withdrawn development review.",
      actor,
    );
    await expect(
      promoteExam(repo, repo, pack, paper.hash, actor.id, inspect),
    ).rejects.toThrow(/blockers/);
  });
  it("applies the full additive migration and preserves existing learning tables", async () => {
    const tables = await postgres.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema='public'",
    );
    expect(
      tables.rows.some((row) => row.table_name === "neon_learning_states"),
    ).toBe(true);
    expect(
      tables.rows.filter((row) => String(row.table_name).startsWith("exam_"))
        .length,
    ).toBe(10);
  });
  it("imports an immutable draft idempotently and rejects same-version edits", async () => {
    const first = await repo.importDraft(starter),
      second = await repo.importDraft(starter);
    expect(second.id).toBe(first.id);
    expect(await repo.catalog()).toEqual([]);
    await expect(
      repo.importDraft({
        ...starter,
        title: "A changed draft under the same version",
      }),
    ).rejects.toThrow(/immutable/);
    await expect(
      repo.publish(first.id, first.hash, actor.id, "publish"),
    ).rejects.toThrow(/Human/);
    await expect(
      postgres.query(
        "update exam_paper_versions set content_json='{}' where id=$1",
        [first.id],
      ),
    ).rejects.toThrow(/immutable/);
  });
  it("requires every applicable exact-hash gate at the database level", async () => {
    const imported = await repo.importDraft(readingPack());
    await repo.review(
      imported.id,
      imported.hash,
      "language",
      "approved",
      "Synthetic local test review only.",
      actor,
    );
    await expect(
      postgres.query("select publish_exam_version($1,$2,$3,'publish')", [
        imported.id,
        imported.hash,
        actor.id,
      ]),
    ).rejects.toThrow(/gates/);
    const published = await approveReading();
    expect((await repo.catalog())[0].id).toBe(published.id);
    await repo.review(
      published.id,
      published.hash,
      "language",
      "changes_requested",
      "Synthetic withdrawal for a local regression test.",
      actor,
    );
    expect(await repo.catalog()).toEqual([]);
    await expect(
      postgres.query("update exam_review_signoffs set decision='approved'"),
    ).rejects.toThrow(/append-only/);
  });
  it("freezes paper versions for history and retires older published versions atomically", async () => {
    const first = await approveReading(1);
    const created = await repo.create(actor.id, {
      paperVersionId: first.id,
      idempotencyKey: crypto.randomUUID(),
      mode: "coach",
      skill: "reading",
    });
    const second = await approveReading(2);
    expect((await repo.catalog()).map((row) => row.id)).toEqual([second.id]);
    expect((await repo.attempt(created.id, actor.id)).version).toBe(1);
    await expect(
      repo.create(actor.id, {
        paperVersionId: first.id,
        idempotencyKey: crypto.randomUUID(),
        mode: "coach",
      }),
    ).rejects.toThrow(/not available/);
  });
  it("creates only published learner attempts and makes duplicate start requests safe", async () => {
    const draft = await repo.importDraft(starter);
    await expect(
      repo.create(actor.id, {
        paperVersionId: draft.id,
        idempotencyKey: crypto.randomUUID(),
        mode: "coach",
      }),
    ).rejects.toThrow(/not available/);
    await expect(
      repo.create(actor.id, {
        paperVersionId: draft.id,
        idempotencyKey: crypto.randomUUID(),
        mode: "preview",
      }),
    ).rejects.toThrow(/content team/);
    const published = await approveReading(),
      key = crypto.randomUUID();
    const input = {
      paperVersionId: published.id,
      idempotencyKey: key,
      mode: "coach" as const,
      skill: "reading" as const,
    };
    const a = await repo.create(actor.id, input),
      b = await repo.create(actor.id, input);
    expect(a.id).toBe(b.id);
    await expect(
      repo.create(actor.id, { ...input, mode: "timed_section" }),
    ).rejects.toThrow(/different practice/);
    const payload = await repo.attempt(a.id, actor.id);
    expect(JSON.stringify(payload.tasks)).not.toMatch(
      /"correct"|"explanation"|"evidence"/,
    );
    await expect(repo.attempt(a.id, other)).rejects.toThrow(/not found/);
    await expect(repo.report(a.id, actor.id)).rejects.toThrow(/Submit/);
  });
  it("rejects stale answer saves, foreign tasks and guessed owner headers", async () => {
    const published = await approveReading();
    const attempt = await repo.create(actor.id, {
      paperVersionId: published.id,
      idempotencyKey: crypto.randomUUID(),
      mode: "coach",
      skill: "reading",
    });
    const saved = await repo.saveAnswer(
      attempt.id,
      actor.id,
      "library-hours",
      examAnswerSchema.parse({ choice: "option-2" }),
      0,
    );
    expect(saved.revision).toBe(1);
    await expect(
      repo.saveAnswer(
        attempt.id,
        actor.id,
        "library-hours",
        examAnswerSchema.parse({ choice: "option-1" }),
        0,
      ),
    ).rejects.toThrow(/newer answers/);
    await expect(
      repo.saveAnswer(
        attempt.id,
        actor.id,
        "class-time",
        examAnswerSchema.parse({ choice: "option-1" }),
        1,
      ),
    ).rejects.toThrow(/not part/);
    await expect(
      repo.saveAnswer(
        attempt.id,
        other,
        "library-hours",
        examAnswerSchema.parse({ choice: "option-2" }),
        1,
      ),
    ).rejects.toThrow(/not found/);
    const mismatch = await saveRoute(
      request(
        `/api/exams/attempts/${attempt.id}/answer`,
        "PATCH",
        {
          taskId: "library-hours",
          answer: { choice: "option-2" },
          revision: 1,
        },
        other,
      ),
      { params: Promise.resolve({ attemptId: attempt.id }) },
    );
    expect(mismatch.status).toBe(409);
  });
  it("scores only server-owned keys, seals responses, submits idempotently and permits private deletion", async () => {
    const published = await approveReading();
    const attempt = await repo.create(actor.id, {
      paperVersionId: published.id,
      idempotencyKey: crypto.randomUUID(),
      mode: "coach",
      skill: "reading",
    });
    await repo.saveAnswer(
      attempt.id,
      actor.id,
      "library-hours",
      examAnswerSchema.parse({ choice: "option-2" }),
      0,
    );
    const report = await repo.submit(attempt.id, actor.id, 1),
      retried = await repo.submit(attempt.id, actor.id, 1);
    expect(retried).toEqual(report);
    expect(report.report).toMatchObject({
      officialScore: null,
      skills: [{ correct: 1, objectiveTotal: 3 }],
    });
    await expect(
      repo.saveAnswer(
        attempt.id,
        actor.id,
        "library-hours",
        examAnswerSchema.parse({ choice: "option-1" }),
        2,
      ),
    ).rejects.toThrow(/submitted/);
    await expect(
      postgres.query(
        "update exam_responses set answer_json='{}' where attempt_id=$1",
        [attempt.id],
      ),
    ).rejects.toThrow(/sealed/);
    await expect(
      postgres.query("update exam_attempts set report='{}' where id=$1", [
        attempt.id,
      ]),
    ).rejects.toThrow(/immutable/);
    await expect(repo.removeAttempt(attempt.id, other)).rejects.toThrow(
      /not found/,
    );
    await repo.removeAttempt(attempt.id, actor.id);
    expect(await repo.history(actor.id)).toEqual([]);
  });
  it("enforces server deadlines and hides timed feedback until submission", async () => {
    const published = await approveReading();
    const attempt = await repo.create(actor.id, {
      paperVersionId: published.id,
      idempotencyKey: crypto.randomUUID(),
      mode: "timed_section",
      skill: "reading",
    });
    const loaded = await repo.attempt(attempt.id, actor.id);
    expect(
      new Date(String(loaded.deadline)).getTime() -
        new Date(loaded.serverNow).getTime(),
    ).toBeGreaterThan(24 * 60 * 1000);
    await expect(
      repo.checkAnswer(attempt.id, actor.id, "library-hours"),
    ).rejects.toThrow(/after submitting/);
    await expect(
      postgres.query(
        "update exam_attempts set deadline=now()+interval '1 day' where id=$1",
        [attempt.id],
      ),
    ).rejects.toThrow(/timer are immutable/);
    const expired = await postgres.query<{ id: string }>(
      "insert into exam_attempts(user_id,paper_version_id,mode,skill,definition,idempotency_key,deadline) select $1,$2,'timed_section','reading',definition,$3,now()-interval '1 second' from exam_definitions where code='goethe-a1-sd1-adult' returning id",
      [actor.id, published.id, crypto.randomUUID()],
    );
    await expect(
      repo.saveAnswer(
        String(expired.rows[0].id),
        actor.id,
        "library-hours",
        examAnswerSchema.parse({ choice: "option-2" }),
        0,
      ),
    ).rejects.toThrow(/time expired/);
  });
  it("keeps staff previews and open responses separate from official marks and owner history", async () => {
    const draft = await repo.importDraft(starter);
    const attempt = await repo.create(
      actor.id,
      {
        paperVersionId: draft.id,
        idempotencyKey: crypto.randomUUID(),
        mode: "preview",
        skill: "writing",
      },
      true,
    );
    await repo.saveAnswer(
      attempt.id,
      actor.id,
      "message-course",
      examAnswerSchema.parse({
        text: "Hallo Frau Weber, ich bin krank.",
        checks: [0],
      }),
      0,
    );
    const report = await repo.submit(attempt.id, actor.id, 1);
    expect(report.report).toMatchObject({
      officialScore: null,
      skills: [{ reviewPending: 1, objectiveTotal: 0 }],
    });
    const history = await repo.history(actor.id);
    expect(history[0].mode).toBe("preview");
    expect(history[0]).not.toHaveProperty("report");
    expect(await repo.history(other)).toEqual([]);
    expect(
      (
        await postgres.query<{ count: number }>(
          "select count(*)::int as count from exam_feedback where attempt_id=$1",
          [attempt.id],
        )
      ).rows[0].count,
    ).toBe(1);
  });
  it("checks authentication and rejects forged grades, owners and review identities", async () => {
    const published = await approveReading();
    const forged = await createRoute(
      request("/api/exams/attempts", "POST", {
        paperVersionId: published.id,
        idempotencyKey: crypto.randomUUID(),
        mode: "coach",
        userId: other,
        score: 100,
      }),
    );
    expect(forged.status).toBe(400);
    const badReview = await adminRoute(
      request("/api/admin/exams", "POST", {
        action: "review",
        id: published.id,
        hash: published.hash,
        category: "language",
        decision: "approved",
        comment: "Forged reviewer test",
        reviewerId: other,
      }),
    );
    expect(badReview.status).toBe(400);
    mocks.session.mockResolvedValue({ data: null, error: null });
    const unauthenticated = await getAttemptRoute(
      request(`/api/exams/attempts/${crypto.randomUUID()}`),
      { params: Promise.resolve({ attemptId: crypto.randomUUID() }) },
    );
    expect(unauthenticated.status).toBe(401);
    const publicDemo = demoRoute();
    expect(publicDemo.status).toBe(200);
    expect(JSON.stringify(await publicDemo.json())).not.toMatch(
      /"correct"|"explanation"|"evidence"/,
    );
  });
});
