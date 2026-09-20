import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

const { invokeLLMMock } = vi.hoisted(() => ({ invokeLLMMock: vi.fn() }));
vi.mock("../server/_core/llm", () => ({ invokeLLM: invokeLLMMock }));

import { appRouter } from "../server/routers";

const context: TrpcContext = {
  user: null,
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("quizzes.generate", () => {
  beforeEach(() => {
    invokeLLMMock.mockReset();
    invokeLLMMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: "Dart functions check",
              intro: "A quick review.",
              questions: [
                {
                  question: "What is a function?",
                  options: [
                    "A reusable block",
                    "A loop",
                    "A type",
                    "A package",
                  ],
                  answerIndex: 0,
                  explanation: "Functions package behavior.",
                },
              ],
            }),
          },
        },
      ],
    });
  });

  it("generates a quiz using the student's course progress", async () => {
    const result = await appRouter
      .createCaller(context)
      .quizzes.generate({
        course: "Dart foundations",
        progress: 72,
        completedLessons: 12,
        focus: "functions",
      });
    expect(result.title).toBe("Dart functions check");
    expect(result.questions).toHaveLength(1);
    expect(invokeLLMMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o",
        response_format: { type: "json_object" },
      }),
    );
    expect(invokeLLMMock.mock.calls[0]?.[0].messages[0].content).toContain(
      "72%",
    );
  });
});
