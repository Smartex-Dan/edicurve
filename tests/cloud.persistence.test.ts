import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

const { createAssignmentMock, createNoteMock, createQuizAttemptMock, listAssignmentsMock } = vi.hoisted(() => ({
  createAssignmentMock: vi.fn(),
  createNoteMock: vi.fn(),
  createQuizAttemptMock: vi.fn(),
  listAssignmentsMock: vi.fn(),
}));

vi.mock("../server/db", () => ({
  createAssignment: createAssignmentMock,
  createNote: createNoteMock,
  createQuizAttempt: createQuizAttemptMock,
  listAssignments: listAssignmentsMock,
  updateAssignment: vi.fn(),
  listNotes: vi.fn(),
  updateNote: vi.fn(),
  listQuizAttempts: vi.fn(),
  getStudySchedule: vi.fn(),
  upsertStudySchedule: vi.fn(),
  registerPushToken: vi.fn(),
}));

import { appRouter } from "../server/routers";

const context: TrpcContext = { user: { id: 42 } as TrpcContext["user"], req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };

describe("cloud persistence routes", () => {
  beforeEach(() => {
    createAssignmentMock.mockReset().mockResolvedValue(11);
    createNoteMock.mockReset().mockResolvedValue(12);
    createQuizAttemptMock.mockReset().mockResolvedValue(13);
    listAssignmentsMock.mockReset().mockResolvedValue([]);
  });

  it("scopes assignment creation to the authenticated user", async () => {
    const caller = appRouter.createCaller(context);
    await caller.assignments.create({ title: "Dart practice", course: "Dart foundations", dueAt: "2026-09-17T18:00:00.000Z", reminderMinutes: 60, reminderEnabled: true });
    expect(createAssignmentMock).toHaveBeenCalledWith(expect.objectContaining({ userId: 42, title: "Dart practice", dueAt: expect.any(Date) }));
  });

  it("persists note and quiz attempt records for the authenticated user", async () => {
    const caller = appRouter.createCaller(context);
    await caller.notes.create({ title: "Loops", content: "Practice for loops." });
    await caller.quizzes.saveAttempt({ course: "Dart foundations", quizTitle: "Loops check", score: 4, total: 5, answers: [0, 1, 2, 0, 3] });
    expect(createNoteMock).toHaveBeenCalledWith({ userId: 42, title: "Loops", content: "Practice for loops." });
    expect(createQuizAttemptMock).toHaveBeenCalledWith(expect.objectContaining({ userId: 42, score: 4, total: 5, answers: JSON.stringify([0, 1, 2, 0, 3]) }));
  });
});
