import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storageGetSignedUrl, storagePut } from "./../server/storage";
import {
  buildGoogleAuthUrl,
  buildNotionAuthUrl,
  exchangeGoogleCode,
  exchangeNotionCode,
  disconnectProvider,
  getConnectorStatus,
  getValidGoogleToken,
  getNotionToken,
} from "./connectors";

const tutorMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});
const documentSchema = z.object({
  name: z.string().min(1).max(255),
  key: z.string().min(1).max(500),
  mimeType: z.string().default("application/pdf"),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  assignments: router({
    list: protectedProcedure.query(({ ctx }) =>
      db.listAssignments(ctx.user.id),
    ),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          course: z.string().min(1).max(160),
          dueAt: z.string().datetime(),
          reminderMinutes: z.number().int().min(0).max(10080).default(60),
          reminderEnabled: z.boolean().default(true),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.createAssignment({
          ...input,
          userId: ctx.user.id,
          dueAt: new Date(input.dueAt),
        }),
      ),
    toggle: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), done: z.boolean() }))
      .mutation(({ ctx, input }) =>
        db.updateAssignment(ctx.user.id, input.id, { done: input.done }),
      ),
    updateReminder: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          reminderEnabled: z.boolean(),
          reminderMinutes: z.number().int().min(0).max(10080),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.updateAssignment(ctx.user.id, input.id, {
          reminderEnabled: input.reminderEnabled,
          reminderMinutes: input.reminderMinutes,
        }),
      ),
  }),
  notes: router({
    list: protectedProcedure.query(({ ctx }) => db.listNotes(ctx.user.id)),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          content: z.string().max(20000).default(""),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.createNote({ ...input, userId: ctx.user.id }),
      ),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          title: z.string().min(1).max(255).optional(),
          content: z.string().max(20000).optional(),
        }),
      )
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateNote(ctx.user.id, id, data);
      }),
  }),
  notifications: router({
    registerToken: protectedProcedure
      .input(
        z.object({
          token: z.string().min(1).max(255),
          platform: z.string().min(1).max(32),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.registerPushToken(ctx.user.id, input.token, input.platform),
      ),
  }),
  schedules: router({
    get: protectedProcedure.query(({ ctx }) =>
      db.getStudySchedule(ctx.user.id),
    ),
    upsert: protectedProcedure
      .input(
        z.object({
          goal: z.string().min(1).max(255),
          subjects: z.array(z.string().min(1).max(120)).max(20),
          minutesPerDay: z.number().int().min(5).max(240),
          studyDays: z.array(z.string().min(2).max(3)).min(1).max(7),
          reminderEnabled: z.boolean().default(true),
          reminderHour: z.number().int().min(0).max(23).default(18),
          reminderMinute: z.number().int().min(0).max(59).default(0),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.upsertStudySchedule({
          userId: ctx.user.id,
          ...input,
          subjects: JSON.stringify(input.subjects),
          studyDays: JSON.stringify(input.studyDays),
        }),
      ),
  }),
  documents: router({
    upload: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          mimeType: z.string().default("application/pdf"),
          size: z.number().int().positive().max(15_000_000),
          base64: z.string().min(100),
        }),
      )
      .mutation(async ({ input }) => {
        const keyName = `edicurve/materials/${input.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const result = await storagePut(
          keyName,
          Buffer.from(input.base64, "base64"),
          input.mimeType,
        );
        return {
          name: input.name,
          mimeType: input.mimeType,
          size: input.size,
          key: result.key,
          url: result.url,
        };
      }),
    signedUrl: publicProcedure
      .input(z.object({ key: z.string().min(1).max(500) }))
      .query(async ({ input }) => ({
        url: await storageGetSignedUrl(input.key),
      })),
  }),
  tutor: router({
    chat: publicProcedure
      .input(
        z.object({
          messages: z.array(tutorMessageSchema).min(1).max(14),
          document: documentSchema.optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const documentContext = input.document
          ? `The student attached a study PDF named "${input.document.name}". Use it as the primary source when answering. If the PDF does not contain the answer, say so clearly.`
          : "Answer using the student's conversation and general knowledge.";
        const documentMessage = input.document
          ? [
              {
                role: "user" as const,
                content: [
                  { type: "text" as const, text: documentContext },
                  {
                    type: "file_url" as const,
                    file_url: {
                      url: await storageGetSignedUrl(input.document.key),
                      mime_type: input.document.mimeType as "application/pdf",
                    },
                  },
                ],
              },
            ]
          : [];
        const response = await invokeLLM({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are Edi, a knowledgeable and patient AI study companion inside Edicurve. Help students at any level — secondary school through university — with clear explanations, practice questions, past paper walkthroughs, and study plans. Be concise, warm, and direct. Break hard problems into small steps. Ask one focused follow-up question when it helps. Never pretend to be human.",
            },
            ...documentMessage,
            ...input.messages,
          ],
          maxTokens: 900,
        });
        const content = response.choices?.[0]?.message?.content;
        const reply = Array.isArray(content)
          ? content
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("\n")
          : content;
        return {
          reply:
            reply || "I'm ready when you are. What would you like to study?",
        };
      }),
  }),
  quizzes: router({
    generate: publicProcedure
      .input(
        z.object({
          course: z.string().min(1).max(120),
          progress: z.number().min(0).max(100),
          completedLessons: z.number().int().min(0).max(500),
          focus: z.string().min(1).max(240),
        }),
      )
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: `Create a short personalized study quiz for a student taking ${input.course}. They are ${input.progress}% through the course, have completed ${input.completedLessons} lessons, and should focus on ${input.focus}. Return JSON only with this shape: {"title":"string","intro":"string","questions":[{"question":"string","options":["string","string","string","string"],"answerIndex":0,"explanation":"string"}]} Include exactly 5 questions. Mix recall and application. Keep each option concise.`,
            },
          ],
          response_format: { type: "json_object" },
          maxTokens: 1400,
        });
        const raw = response.choices?.[0]?.message?.content;
        const text = Array.isArray(raw)
          ? raw
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("")
          : raw;
        try {
          const quiz = JSON.parse(text || "{}");
          const fallbackQuestions = Array.from({ length: 5 }, () => ({
            question: `Which study move would best help you review ${input.focus}?`,
            options: [
              "Explain it in your own words",
              "Skip it and move on",
              "Only reread the title",
              "Wait until the deadline",
            ],
            answerIndex: 0,
            explanation:
              "Explaining a concept in your own words is an active-recall strategy.",
          }));
          return {
            title: quiz.title || `${input.course} practice`,
            intro: quiz.intro || "A quick check of your current progress.",
            questions:
              Array.isArray(quiz.questions) && quiz.questions.length > 0
                ? quiz.questions.slice(0, 5)
                : fallbackQuestions,
          };
        } catch {
          return {
            title: `${input.course} practice`,
            intro: "Let's review what you know so far.",
            questions: Array.from({ length: 5 }, () => ({
              question: `Which study move would best help you review ${input.focus}?`,
              options: [
                "Explain it in your own words",
                "Skip it and move on",
                "Only reread the title",
                "Wait until the deadline",
              ],
              answerIndex: 0,
              explanation:
                "Explaining a concept in your own words is an active-recall strategy.",
            })),
          };
        }
      }),
    attempts: protectedProcedure.query(({ ctx }) =>
      db.listQuizAttempts(ctx.user.id),
    ),
    saveAttempt: protectedProcedure
      .input(
        z.object({
          course: z.string().min(1).max(160),
          quizTitle: z.string().min(1).max(255),
          score: z.number().int().min(0),
          total: z.number().int().positive(),
          answers: z.array(z.number().int().min(0)).max(20),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.createQuizAttempt({
          ...input,
          userId: ctx.user.id,
          answers: JSON.stringify(input.answers),
        }),
      ),
  }),

  connectors: router({
  status: protectedProcedure.query(async ({ ctx }) => {
    return getConnectorStatus(ctx.user.id);
  }),

  googleAuthUrl: protectedProcedure.query(() => {
    return { url: buildGoogleAuthUrl() };
  }),

  googleCallback: protectedProcedure
    .input(z.object({ code: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await exchangeGoogleCode(input.code, ctx.user.id);
      return { success: true };
    }),

  notionAuthUrl: protectedProcedure.query(() => {
    return { url: buildNotionAuthUrl() };
  }),

  notionCallback: protectedProcedure
    .input(z.object({ code: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await exchangeNotionCode(input.code, ctx.user.id);
      return { success: true };
    }),

  disconnect: protectedProcedure
    .input(z.object({ provider: z.enum(["google", "notion"]) }))
    .mutation(async ({ ctx, input }) => {
      await disconnectProvider(ctx.user.id, input.provider);
      return { success: true };
    }),

  // ── Google Calendar ──────────────────────────────────────────────────
  calendarEvents: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(30).default(7) }))
    .query(async ({ ctx, input }) => {
      const token = await getValidGoogleToken(ctx.user.id);
      const now = new Date().toISOString();
      const end = new Date(
        Date.now() + input.days * 24 * 60 * 60 * 1000,
      ).toISOString();

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
          new URLSearchParams({
            timeMin: now,
            timeMax: end,
            singleEvents: "true",
            orderBy: "startTime",
            maxResults: "20",
          }),
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) throw new Error("Failed to fetch calendar events");
      const data = await res.json();

      return (data.items ?? []).map((event: any) => ({
        id: event.id,
        title: event.summary ?? "Untitled",
        start: event.start?.dateTime ?? event.start?.date,
        end: event.end?.dateTime ?? event.end?.date,
        isAllDay: !event.start?.dateTime,
        description: event.description ?? null,
      }));
    }),

  // ── Google Drive ─────────────────────────────────────────────────────
  driveFiles: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const token = await getValidGoogleToken(ctx.user.id);

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
          new URLSearchParams({
            q: "mimeType='application/pdf' or mimeType contains 'document'",
            fields: "files(id,name,mimeType,modifiedTime,webViewLink,size)",
            orderBy: "modifiedTime desc",
            pageSize: String(input.limit),
          }),
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) throw new Error("Failed to fetch Drive files");
      const data = await res.json();

      return (data.files ?? []).map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        size: file.size ? parseInt(file.size) : null,
      }));
    }),

    // ── Google Classroom ─────────────────────────────────────────────────
    classroomCourses: protectedProcedure.query(async ({ ctx }) => {
      const token = await getValidGoogleToken(ctx.user.id);

      const coursesRes = await fetch(
        "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE",
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!coursesRes.ok) throw new Error("Failed to fetch Classroom courses");
      const coursesData = await coursesRes.json();
      const courses = coursesData.courses ?? [];

      const withWork = await Promise.all(
        courses.slice(0, 8).map(async (course: any) => {
          const workRes = await fetch(
            `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?` +
              new URLSearchParams({ orderBy: "dueDate asc", pageSize: "5" }),
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const workData = workRes.ok ? await workRes.json() : {};
          return {
            id: course.id,
            name: course.name,
            section: course.section ?? null,
            room: course.room ?? null,
            courseWork: (workData.courseWork ?? []).map((w: any) => ({
              id: w.id,
              title: w.title,
              dueDate: w.dueDate
                ? `${w.dueDate.year}-${String(w.dueDate.month).padStart(2, "0")}-${String(w.dueDate.day).padStart(2, "0")}`
                : null,
              maxPoints: w.maxPoints ?? null,
            })),
          };
        }),
      );

      return withWork;
    }),

    // ── Notion ───────────────────────────────────────────────────────────
    notionPages: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }))
      .query(async ({ ctx, input }) => {
        const token = await getNotionToken(ctx.user.id);

        const res = await fetch("https://api.notion.com/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filter: { value: "page", property: "object" },
            sort: { direction: "descending", timestamp: "last_edited_time" },
            page_size: input.limit,
          }),
        });

        if (!res.ok) throw new Error("Failed to fetch Notion pages");
        const data = await res.json();

        return (data.results ?? []).map((page: any) => ({
          id: page.id,
          title:
            page.properties?.title?.title?.[0]?.plain_text ??
            page.properties?.Name?.title?.[0]?.plain_text ??
            "Untitled",
          url: page.url,
          lastEdited: page.last_edited_time,
        }));
      }),
  }), 
});

export type AppRouter = typeof appRouter;
