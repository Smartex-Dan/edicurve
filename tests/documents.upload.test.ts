import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

const { storagePutMock } = vi.hoisted(() => ({ storagePutMock: vi.fn() }));
vi.mock("../server/storage", () => ({ storagePut: storagePutMock, storageGetSignedUrl: vi.fn() }));

import { appRouter } from "../server/routers";

const context: TrpcContext = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };

describe("documents.upload", () => {
  beforeEach(() => storagePutMock.mockResolvedValue({ key: "learning-hub/materials/notes_abc.pdf", url: "/manus-storage/notes_abc.pdf" }));

  it("uploads a PDF and returns its storage metadata", async () => {
    const result = await appRouter.createCaller(context).documents.upload({ name: "my notes.pdf", mimeType: "application/pdf", size: 256, base64: "a".repeat(120) });
    expect(result.name).toBe("my notes.pdf");
    expect(result.key).toBe("learning-hub/materials/notes_abc.pdf");
    expect(storagePutMock).toHaveBeenCalledWith(expect.stringContaining("learning-hub/materials/my-notes.pdf"), expect.any(Buffer), "application/pdf");
  });
});
