import { describe, expect, it } from "vitest";

import { ContentVersionRepository } from "@/src/modules/content/content.repository";

const contentItemId = "11111111-1111-4111-8111-111111111111";
const baseVersionId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const payload = {
  schemaVersion: "content-deliverable.v1" as const,
  script: "脚本",
  titles: ["标题"],
  coverCopy: ["封面"],
  publishCopy: "发布文案",
  keywords: ["关键词"],
};

type FakeVersion = {
  id: string;
  contentItemId: string;
  versionNumber: number;
  source: "ORIGINAL" | "HUMAN_EDIT";
  createdBy: string;
  baseVersionId: string | null;
  contentJson: unknown;
};

class ConcurrentReadBarrier {
  private waiting = 0;
  private release?: () => void;
  private promise?: Promise<void>;

  async waitForPair() {
    this.waiting += 1;
    if (this.waiting === 2) {
      this.release?.();
      return;
    }

    this.promise ??= new Promise<void>((resolve) => {
      this.release = resolve;
    });

    await this.promise;
  }
}

class FakeSelectQuery {
  constructor(
    private readonly state: FakeDatabaseState,
    private readonly selectStep: number,
    private readonly barrier: ConcurrentReadBarrier,
  ) {}

  from() {
    return this;
  }

  where() {
    return this;
  }

  orderBy() {
    return this;
  }

  for() {
    return this;
  }

  async limit() {
    return this.resolve();
  }

  then<TResult1 = Awaited<ReturnType<FakeSelectQuery["resolve"]>>, TResult2 = never>(
    onfulfilled?: ((value: Awaited<ReturnType<FakeSelectQuery["resolve"]>>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.resolve().then(onfulfilled, onrejected);
  }

  private async resolve() {
    if (this.selectStep === 1) {
      return [{ id: this.state.content.id, currentVersionId: this.state.content.currentVersionId }];
    }

    if (this.selectStep === 2) {
      return [{ id: baseVersionId }];
    }

    if (this.selectStep === 3) {
      const latest = this.state.versions[this.state.versions.length - 1];
      if (!latest) throw new Error("Expected a latest version.");
      await this.barrier.waitForPair();
      return [{ versionNumber: latest.versionNumber }];
    }

    throw new Error(`Unexpected select step: ${this.selectStep}`);
  }
}

class FakeInsertQuery {
  private pendingValues?: Record<string, unknown>;

  constructor(
    private readonly state: FakeDatabaseState,
    private readonly transactionState: FakeTransactionState,
  ) {}

  values(values: Record<string, unknown>) {
    this.pendingValues = values;
    return this;
  }

  async returning() {
    const values = this.pendingValues;
    if (!values) throw new Error("Insert values were not provided.");

    const versionNumber = Number(values.versionNumber);
    const alreadyExists = this.state.versions.some((version) => version.contentItemId === values.contentItemId && version.versionNumber === versionNumber);
    if (alreadyExists) throw createUniqueConstraintError();

    const version: FakeVersion = {
      id: `version-${this.state.nextVersionNumber}`,
      contentItemId: String(values.contentItemId),
      versionNumber,
      source: values.source as FakeVersion["source"],
      createdBy: String(values.createdBy),
      baseVersionId: values.baseVersionId ? String(values.baseVersionId) : null,
      contentJson: values.contentJson,
    };
    this.state.nextVersionNumber += 1;
    this.state.versions.push(version);
    this.transactionState.insertedVersion = version;
    return [version];
  }
}

class FakeUpdateQuery {
  private pendingValues?: Record<string, unknown>;

  constructor(
    private readonly state: FakeDatabaseState,
    private readonly transactionState: FakeTransactionState,
  ) {}

  set(values: Record<string, unknown>) {
    this.pendingValues = values;
    return this;
  }

  where() {
    return this;
  }

  async returning() {
    if (!this.pendingValues) throw new Error("Update values were not provided.");
    if (!this.transactionState.insertedVersion) return [];
    if (this.state.content.currentVersionId !== baseVersionId) return [];

    this.state.content.currentVersionId = this.transactionState.insertedVersion.id;
    return [{ ...this.state.content }];
  }
}

type FakeDatabaseState = {
  content: { id: string; currentVersionId: string | null };
  versions: FakeVersion[];
  nextVersionNumber: number;
};

type FakeTransactionState = {
  insertedVersion?: FakeVersion;
};

class FakeTransaction {
  private selectStep = 0;
  private readonly transactionState: FakeTransactionState = {};

  constructor(
    private readonly state: FakeDatabaseState,
    private readonly barrier: ConcurrentReadBarrier,
  ) {}

  execute = async () => [];

  select() {
    this.selectStep += 1;
    return new FakeSelectQuery(this.state, this.selectStep, this.barrier);
  }

  insert() {
    return new FakeInsertQuery(this.state, this.transactionState);
  }

  update() {
    return new FakeUpdateQuery(this.state, this.transactionState);
  }
}

class FakeDatabase {
  readonly state: FakeDatabaseState = {
    content: { id: contentItemId, currentVersionId: baseVersionId },
    versions: [
      {
        id: baseVersionId,
        contentItemId,
        versionNumber: 1,
        source: "ORIGINAL",
        createdBy: userId,
        baseVersionId: null,
        contentJson: payload,
      },
    ],
    nextVersionNumber: 2,
  };

  private readonly barrier = new ConcurrentReadBarrier();

  async transaction<T>(callback: (transaction: FakeTransaction) => Promise<T>) {
    return callback(new FakeTransaction(this.state, this.barrier));
  }
}

function createUniqueConstraintError() {
  const error = new Error('duplicate key value violates unique constraint "content_versions_item_number_unique"') as Error & {
    code: string;
    constraint: string;
  };
  error.name = "DatabaseError";
  error.code = "23505";
  error.constraint = "content_versions_item_number_unique";
  return error;
}

describe("ContentVersionRepository", () => {
  it("returns a stale-version conflict for the losing concurrent human edit and keeps the winner current", async () => {
    const database = new FakeDatabase();
    const repository = new ContentVersionRepository(database as never);

    const results = await Promise.allSettled([
      repository.createHumanEdit({
        contentItemId,
        baseVersionId,
        createdBy: userId,
        payload: { ...payload, script: "并发修改 A" },
      }),
      repository.createHumanEdit({
        contentItemId,
        baseVersionId,
        createdBy: userId,
        payload: { ...payload, script: "并发修改 B" },
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({ reason: { name: "StaleVersionError", code: "VERSION_CONFLICT" } });

    const winner = fulfilled[0];
    if (winner.status !== "fulfilled") throw new Error("Expected one winning version.");

    expect(database.state.content.currentVersionId).toBe(winner.value.id);
    expect(database.state.versions.map(({ id, versionNumber, source }) => ({ id, versionNumber, source }))).toEqual([
      { id: baseVersionId, versionNumber: 1, source: "ORIGINAL" },
      { id: winner.value.id, versionNumber: 2, source: "HUMAN_EDIT" },
    ]);
  });
});
