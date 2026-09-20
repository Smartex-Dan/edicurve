import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

const { invokeLLMMock } = vi.hoisted(() => ({ invokeLLMMock: vi.fn() }));

vi.mock("../server/_core/llm", () => ({
  invokeLLM: invokeLLMMock,
}));

import { appRouter } from "../server/routers";

const context: TrpcContext = {
  user: null,
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("tutor.chat", () => {
  beforeEach(() => {
    invokeLLMMock.mockReset();
    invokeLLMMock.mockResolvedValue({
      choices: [
        {
          message: { content: "A class is a blueprint for creating objects." },
        },
      ],
    });
  });

  it("returns a tutor response and preserves the conversation history", async () => {
    const caller = appRouter.createCaller(context);
    const result = await caller.tutor.chat({
      messages: [
        { role: "user", content: "What is a Dart class?" },
        { role: "assistant", content: "It describes the shape of an object." },
      ],
    });

    expect(result).toEqual({
      reply: "A class is a blueprint for creating objects.",
    });
    expect(invokeLLMMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o",
        messages: expect.arrayContaining([
          { role: "user", content: "What is a Dart class?" },
          {
            role: "assistant",
            content: "It describes the shape of an object.",
          },
        ]),
      }),
    );
  });
});
