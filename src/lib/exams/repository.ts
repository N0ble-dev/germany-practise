import { sql, type SQL } from "drizzle-orm";
import { contentHash } from "../content-pipeline/hash.ts";
import {
  examDefinition,
  examDefinitions,
  type ExamSkill,
} from "./definitions.ts";
import {
  examAnswerSchema,
  examPackSchema,
  publicExamTask,
  type ExamAnswer,
  type ExamGoal,
  type ExamReview,
} from "./model.ts";
import {
  answerErrors,
  examPublicationBlockers,
  examReport,
  evaluateTask,
} from "./evaluation.ts";
type Execute = (query: SQL) => Promise<{ rows: Record<string, unknown>[] }>;
export class ExamError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export class ExamRepository {
  private execute: Execute;
  constructor(execute: Execute) {
    this.execute = execute;
  }
  async seedDefinitions() {
    for (const definition of examDefinitions)
      await this.execute(
        sql`insert into exam_definitions(code,definition,revision,checked_at) values (${definition.code},${JSON.stringify(definition)}::jsonb,${definition.revision},${definition.checkedAt}) on conflict(code) do update set definition=excluded.definition,revision=excluded.revision,checked_at=excluded.checked_at`,
      );
  }
  async importDraft(input: unknown) {
    const pack = examPackSchema.parse(input),
      hash = contentHash(pack);
    if (pack.definitionRevision !== examDefinition(pack.examCode)?.revision)
      throw new ExamError("Use the current exam definition revision.", 409);
    await this.seedDefinitions();
    const { rows } = await this.execute(
      sql`insert into exam_paper_versions(exam_code,paper_slug,version,content_hash,content_json) values(${pack.examCode},${pack.id},${pack.version},${hash},${JSON.stringify(pack)}::jsonb) on conflict(paper_slug,version) do nothing returning id,content_hash`,
    );
    const row =
      rows[0] ??
      (
        await this.execute(
          sql`select id,content_hash from exam_paper_versions where paper_slug=${pack.id} and version=${pack.version}`,
        )
      ).rows[0];
    if (!row || row.content_hash !== hash)
      throw new ExamError(
        "That version contains different content. Increment the version; imported exam papers are immutable.",
        409,
      );
    for (const [order, task] of pack.tasks.entries())
      await this.execute(
        sql`insert into exam_task_versions(paper_version_id,task_key,skill,order_index,prompt_json,private_solution_json) values(${row.id}::uuid,${task.id},${task.skill},${order},${JSON.stringify(publicExamTask(task))}::jsonb,${JSON.stringify(task)}::jsonb) on conflict(paper_version_id,task_key) do nothing`,
      );
    for (const asset of pack.media)
      await this.execute(
        sql`insert into exam_media_assets(paper_version_id,asset_key,storage_key,file_hash,manifest) values(${row.id}::uuid,${asset.id},${asset.storageKey},${asset.fileHash},${JSON.stringify(asset)}::jsonb) on conflict do nothing`,
      );
    return { id: String(row.id), hash, title: pack.title };
  }
  async catalog(code?: string) {
    return (
      await this.execute(
        sql`select id,paper_slug as slug,version,content_json->>'title' as title,content_json->>'kind' as kind,(select jsonb_agg(distinct t.skill) from exam_task_versions t where t.paper_version_id=p.id) as skills from published_exam_catalog p where (${code ?? null}::text is null or exam_code=${code ?? null}) order by paper_slug,version desc limit 100`,
      )
    ).rows;
  }
  async adminList() {
    return (
      await this.execute(
        sql`select id,paper_slug as slug,version,status,content_hash as hash,content_json->>'title' as title,exam_code as "examCode" from exam_paper_versions order by created_at desc limit 200`,
      )
    ).rows;
  }
  async versionId(slug: string, version: number) {
    const row = (
      await this.execute(
        sql`select id from exam_paper_versions where paper_slug=${slug} and version=${version}`,
      )
    ).rows[0];
    if (!row) throw new ExamError("The exam version was not found.", 404);
    return String(row.id);
  }
  async detail(id: string) {
    const row = (
      await this.execute(
        sql`select content_json,content_hash,status from exam_paper_versions where id=${id}::uuid`,
      )
    ).rows[0];
    if (!row) throw new ExamError("This paper version was not found.", 404);
    const pack = examPackSchema.parse(row.content_json);
    if (contentHash(pack) !== row.content_hash)
      throw new ExamError("This paper's stored content hash is invalid.", 409);
    const reviews = (
      await this.execute(
        sql`select category,decision,content_hash as hash,reviewer_id::text as "reviewerId",reviewer_name as "reviewerName",comment,created_at::text as "reviewedAt" from exam_review_signoffs where paper_version_id=${id}::uuid order by created_at,id`,
      )
    ).rows as unknown as ExamReview[];
    const checked = (
      await this.execute(
        sql`select asset_key from exam_media_assets where paper_version_id=${id}::uuid and verified_at is not null`,
      )
    ).rows.map((asset) => String(asset.asset_key));
    return {
      pack,
      hash: String(row.content_hash),
      status: String(row.status),
      reviews,
      blockers: examPublicationBlockers(
        pack,
        String(row.content_hash),
        reviews,
        checked,
      ),
    };
  }
  async review(
    id: string,
    hash: string,
    category: ExamReview["category"],
    decision: ExamReview["decision"],
    comment: string,
    actor: { id: string; name: string },
  ) {
    const result = await this.execute(
      sql`with target as (select id from exam_paper_versions where id=${id}::uuid and content_hash=${hash} for update) insert into exam_review_signoffs(paper_version_id,content_hash,category,decision,comment,reviewer_id,reviewer_name) select id,${hash},${category},${decision},${comment},${actor.id}::uuid,${actor.name} from target returning id`,
    );
    if (!result.rows.length)
      throw new ExamError(
        "The paper or exact content hash was not found.",
        409,
      );
  }
  async publish(
    id: string,
    hash: string,
    actorId: string,
    action: "publish" | "retire",
  ) {
    if (action === "publish") {
      const detail = await this.detail(id);
      if (detail.hash !== hash || detail.blockers.length)
        throw new ExamError(
          detail.blockers.join(" ") || "The content hash changed.",
          409,
        );
    }
    await this.execute(
      sql`select publish_exam_version(${id}::uuid,${hash},${actorId}::uuid,${action})`,
    );
  }
  // Restricted release tooling copies actual development evidence, including its
  // reviewer and timestamp. Newer production decisions remain authoritative.
  async importReviewEvidence(id: string, review: ExamReview) {
    const timestamp = new Date(review.reviewedAt).toISOString();
    const result = await this.execute(sql`
      with target as (select id from exam_paper_versions where id=${id}::uuid and content_hash=${review.hash} for update),
      copied as (
        insert into exam_review_signoffs(paper_version_id,content_hash,category,decision,comment,reviewer_id,reviewer_name,created_at)
        select id,${review.hash},${review.category},${review.decision},${review.comment},${review.reviewerId}::uuid,${review.reviewerName},${timestamp}::timestamptz
        from target where not exists (
          select 1 from exam_review_signoffs r where r.paper_version_id=target.id and r.content_hash=${review.hash}
          and r.category=${review.category} and r.reviewer_id=${review.reviewerId}::uuid
          and r.decision=${review.decision} and r.created_at=${timestamp}::timestamptz
        ) returning id
      ) select id from target`);
    if (!result.rows.length)
      throw new ExamError(
        "The release evidence does not match the target paper hash.",
        409,
      );
  }
  async verifyMedia(
    id: string,
    hash: string,
    assetId: string,
    inspection: unknown,
  ) {
    const result = await this.execute(
      sql`update exam_media_assets m set verified_at=now(),inspection=${JSON.stringify(inspection)}::jsonb from exam_paper_versions p where p.id=m.paper_version_id and p.id=${id}::uuid and p.content_hash=${hash} and m.asset_key=${assetId} returning m.asset_key`,
    );
    if (!result.rows.length)
      throw new ExamError(
        "The media manifest or paper hash was not found.",
        409,
      );
  }
  async goal(userId: string) {
    return (
      (
        await this.execute(
          sql`select exam_code as "examCode",planned_date as date,booking_confirmed as "bookingConfirmed",daily_minutes as "dailyMinutes",time_zone as "timeZone",language from exam_goals where user_id=${userId}::uuid`,
        )
      ).rows[0] ?? null
    );
  }
  async saveGoal(userId: string, goal: ExamGoal) {
    await this.seedDefinitions();
    await this.execute(
      sql`insert into exam_goals(user_id,exam_code,planned_date,booking_confirmed,daily_minutes,time_zone,language) values(${userId}::uuid,${goal.examCode},${goal.date},${goal.bookingConfirmed},${goal.dailyMinutes},${goal.timeZone},${goal.language}) on conflict(user_id) do update set exam_code=excluded.exam_code,planned_date=excluded.planned_date,booking_confirmed=excluded.booking_confirmed,daily_minutes=excluded.daily_minutes,time_zone=excluded.time_zone,language=excluded.language,updated_at=now()`,
    );
    return goal;
  }
  async history(userId: string) {
    return (
      await this.execute(
        sql`select a.id,a.mode,a.skill,a.status,a.started_at as "startedAt",a.submitted_at as "submittedAt",a.interrupted,a.report->'skills' as skills,a.report->'mistakes' as mistakes,p.content_json->>'title' as title,p.exam_code as "examCode",p.version from exam_attempts a join exam_paper_versions p on p.id=a.paper_version_id where a.user_id=${userId}::uuid order by a.started_at desc limit 30`,
      )
    ).rows;
  }
  async create(
    userId: string,
    input: {
      paperVersionId: string;
      idempotencyKey: string;
      mode: "coach" | "timed_section" | "preview";
      skill?: ExamSkill;
    },
    previewAllowed = false,
  ) {
    const existing = (
      await this.execute(
        sql`select id,paper_version_id,mode,skill from exam_attempts where user_id=${userId}::uuid and idempotency_key=${input.idempotencyKey}::uuid`,
      )
    ).rows[0];
    const ensureSame = (row: Record<string, unknown>) => {
      if (
        row.paper_version_id !== input.paperVersionId ||
        row.mode !== input.mode ||
        (row.skill ?? null) !== (input.skill ?? null)
      )
        throw new ExamError(
          "This start request was already used for a different practice selection.",
          409,
        );
      return { id: String(row.id) };
    };
    if (existing) return ensureSame(existing);
    if (input.mode === "preview" && !previewAllowed)
      throw new ExamError(
        "Only the content team can preview draft papers.",
        403,
      );
    const available = (
      await this.execute(
        input.mode === "preview"
          ? sql`select id from exam_paper_versions where id=${input.paperVersionId}::uuid`
          : sql`select id from published_exam_catalog where id=${input.paperVersionId}::uuid`,
      )
    ).rows[0];
    if (!available)
      throw new ExamError(
        "This exam set is not available for new attempts.",
        404,
      );
    const detail = await this.detail(input.paperVersionId),
      definition = examDefinition(detail.pack.examCode)!;
    if (
      input.skill &&
      !detail.pack.tasks.some((task) => task.skill === input.skill)
    )
      throw new ExamError("That skill is not included in this paper.");
    if (input.mode === "timed_section" && !input.skill)
      throw new ExamError("Choose the timed section.");
    if (
      input.mode === "timed_section" &&
      ["listening", "speaking"].includes(input.skill!)
    )
      throw new ExamError(
        "Timed audio and oral simulation await the reviewed playback and recording release. Use coach practice for these skills for now.",
        409,
      );
    const seconds =
      input.mode === "timed_section"
        ? definition.minutes[input.skill!] * 60
        : null;
    const rows = (
      await this.execute(
        sql`insert into exam_attempts(user_id,paper_version_id,mode,skill,definition,idempotency_key,deadline) select ${userId}::uuid,${input.paperVersionId}::uuid,${input.mode},${input.skill ?? null},${JSON.stringify(definition)}::jsonb,${input.idempotencyKey}::uuid,case when ${seconds}::integer is null then null else now()+make_interval(secs=>${seconds}::integer) end where (select count(*) from exam_attempts where user_id=${userId}::uuid and started_at>now()-interval '1 day')<100 and (${input.mode}='preview' or exists(select 1 from published_exam_catalog where id=${input.paperVersionId}::uuid)) on conflict(user_id,idempotency_key) do nothing returning id`,
      )
    ).rows;
    const result =
      rows[0] ??
      (
        await this.execute(
          sql`select id from exam_attempts where user_id=${userId}::uuid and idempotency_key=${input.idempotencyKey}::uuid`,
        )
      ).rows[0];
    if (!result)
      throw new ExamError(
        "The practice set became unavailable or your daily attempt limit was reached. Try again later.",
        429,
      );
    const saved = (
      await this.execute(
        sql`select id,paper_version_id,mode,skill from exam_attempts where id=${result.id}::uuid and user_id=${userId}::uuid`,
      )
    ).rows[0];
    return ensureSame(saved);
  }
  private async attemptRow(id: string, userId: string) {
    const row = (
      await this.execute(
        sql`select a.*,p.content_json,now()::text as server_now from exam_attempts a join exam_paper_versions p on p.id=a.paper_version_id where a.id=${id}::uuid and a.user_id=${userId}::uuid`,
      )
    ).rows[0];
    if (!row) throw new ExamError("This private attempt was not found.", 404);
    return row;
  }
  async attempt(id: string, userId: string) {
    const row = await this.attemptRow(id, userId),
      pack = examPackSchema.parse(row.content_json);
    const responses = (
      await this.execute(
        sql`select t.task_key,r.answer_json from exam_responses r join exam_task_versions t on t.id=r.task_version_id where r.attempt_id=${id}::uuid`,
      )
    ).rows;
    return {
      id,
      title: pack.title,
      examCode: pack.examCode,
      version: pack.version,
      credits: pack.rights,
      mode: String(row.mode),
      status: String(row.status),
      revision: Number(row.revision),
      deadline: row.deadline,
      serverNow: String(row.server_now),
      interrupted: Boolean(row.interrupted),
      tasks: pack.tasks
        .filter((task) => !row.skill || task.skill === row.skill)
        .map((task) => publicExamTask(task)),
      answers: Object.fromEntries(
        responses.map((response) => [
          String(response.task_key),
          examAnswerSchema.parse(response.answer_json),
        ]),
      ),
    };
  }
  async saveAnswer(
    id: string,
    userId: string,
    taskKey: string,
    answer: ExamAnswer,
    revision: number,
  ) {
    const row = await this.attemptRow(id, userId),
      pack = examPackSchema.parse(row.content_json);
    const task = pack.tasks.find(
      (task) => task.id === taskKey && (!row.skill || task.skill === row.skill),
    );
    if (!task)
      throw new ExamError("That task is not part of your attempt.", 404);
    const errors = answerErrors(task, answer);
    if (errors.length) throw new ExamError(errors.join(" "));
    const result = await this.execute(
      sql`with locked as (update exam_attempts set revision=revision+1 where id=${id}::uuid and user_id=${userId}::uuid and status='in_progress' and revision=${revision} and (deadline is null or deadline>now()) returning id,paper_version_id,revision), saved as (insert into exam_responses(paper_version_id,attempt_id,task_version_id,answer_json) select a.paper_version_id,a.id,t.id,${JSON.stringify(answer)}::jsonb from locked a join exam_task_versions t on t.paper_version_id=a.paper_version_id and t.task_key=${taskKey} on conflict(attempt_id,task_version_id) do update set answer_json=excluded.answer_json,saved_at=now() returning attempt_id) select revision from locked where exists(select 1 from saved)`,
    );
    if (!result.rows.length)
      throw new ExamError(
        "Your answer could not be saved: the time expired, the attempt was submitted, or another tab has newer answers. Reload to recover the saved version.",
        409,
      );
    return { revision: Number(result.rows[0].revision) };
  }
  async checkAnswer(id: string, userId: string, taskKey: string) {
    const row = await this.attemptRow(id, userId);
    if (row.mode === "timed_section" && row.status !== "submitted")
      throw new ExamError(
        "Explanations open after submitting a timed section.",
        403,
      );
    const task = examPackSchema
      .parse(row.content_json)
      .tasks.find(
        (task) =>
          task.id === taskKey && (!row.skill || row.skill === task.skill),
      );
    if (!task) throw new ExamError("Task not found.", 404);
    const response = (
      await this.execute(
        sql`select r.answer_json from exam_responses r join exam_task_versions t on t.id=r.task_version_id where r.attempt_id=${id}::uuid and t.task_key=${taskKey}`,
      )
    ).rows[0];
    if (!response)
      throw new ExamError("Save a response before requesting feedback.", 409);
    return {
      result: evaluateTask(task, examAnswerSchema.parse(response.answer_json)),
    };
  }
  async audioTask(id: string, userId: string, taskKey: string) {
    const row = await this.attemptRow(id, userId),
      pack = examPackSchema.parse(row.content_json);
    const task = pack.tasks.find(
      (task) =>
        task.id === taskKey &&
        task.type === "choice" &&
        task.skill === "listening" &&
        (!row.skill || row.skill === task.skill),
    );
    if (!task || task.type !== "choice" || !task.audioId)
      throw new ExamError("Recorded audio is unavailable for this task.", 404);
    const asset = pack.media.find((asset) => asset.id === task.audioId);
    if (!asset)
      throw new ExamError("This task's audio manifest is missing.", 409);
    return { asset, script: task.passage };
  }
  async submit(id: string, userId: string, revision: number) {
    const row = await this.attemptRow(id, userId);
    if (row.status === "submitted") return this.report(id, userId);
    const attempt = await this.attempt(id, userId),
      pack = examPackSchema.parse(row.content_json);
    const report = examReport(
      pack,
      attempt.answers,
      row.skill ? [row.skill as ExamSkill] : undefined,
    );
    const result = await this.execute(
      sql`with sealed as (update exam_attempts set status='submitted',submitted_at=now(),report=${JSON.stringify(report)}::jsonb,revision=revision+1 where id=${id}::uuid and user_id=${userId}::uuid and status='in_progress' and revision=${revision} and revision=${attempt.revision} returning id), pending as (insert into exam_feedback(attempt_id,task_version_id) select r.attempt_id,r.task_version_id from exam_responses r join exam_task_versions t on t.id=r.task_version_id where r.attempt_id=${id}::uuid and t.skill in ('writing','speaking') and exists(select 1 from sealed) on conflict do nothing) select id from sealed`,
    );
    if (!result.rows.length) {
      const current = await this.attemptRow(id, userId);
      if (current.status === "submitted") return this.report(id, userId);
      throw new ExamError(
        "Newer answers were saved. Reload before submitting.",
        409,
      );
    }
    return this.report(id, userId);
  }
  async report(id: string, userId: string) {
    const row = await this.attemptRow(id, userId);
    if (row.status !== "submitted")
      throw new ExamError("Submit the attempt before opening its report.", 409);
    return {
      id,
      title: examPackSchema.parse(row.content_json).title,
      examCode: examPackSchema.parse(row.content_json).examCode,
      version: examPackSchema.parse(row.content_json).version,
      credits: examPackSchema.parse(row.content_json).rights,
      mode: row.mode,
      interrupted: row.interrupted,
      submittedAt: row.submitted_at,
      report: row.report,
    };
  }
  async interrupt(id: string, userId: string) {
    const result = await this.execute(
      sql`update exam_attempts set interrupted=true where id=${id}::uuid and user_id=${userId}::uuid and mode='timed_section' and status='in_progress' returning id`,
    );
    if (!result.rows.length) await this.attemptRow(id, userId);
  }
  async removeAttempt(id: string, userId: string) {
    const result = await this.execute(
      sql`delete from exam_attempts where id=${id}::uuid and user_id=${userId}::uuid returning id`,
    );
    if (!result.rows.length)
      throw new ExamError("This private attempt was not found.", 404);
  }
}
