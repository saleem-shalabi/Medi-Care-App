// src/services/aiChatService.js
const prisma = require("../config/prisma");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Bottleneck = require("bottleneck");

const AI_PROVIDER = process.env.AI_PROVIDER || "gemini";
const G_PRIMARY = process.env.GEMINI_MODEL || "gemini-1.5-pro";
const G_FALLBACK = process.env.GEMINI_FALLBACK_MODEL || "gemini-1.5-flash";
const G_FALLBACK2 = process.env.GEMINI_FALLBACK2_MODEL || "gemini-1.5-flash-8b";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const llmLimiter = new Bottleneck({ maxConcurrent: 1, minTime: 1100 });

function isMedicalAdvice(q) {
  const s = (q || "").toLowerCase();
  return [
    "تشخيص",
    "اعراض",
    "أعراض",
    "علاج",
    "دواء",
    "جرعة",
    "diagnose",
    "diagnosis",
    "treat",
    "treatment",
    "dose",
    "prescribe",
    "medication",
  ].some((w) => s.includes(w));
}

function isQuotaOr429(err) {
  const msg = String(err?.message || err || "");
  return err?.status === 429 || /quota|too many requests|rate limit/i.test(msg);
}

const shrink = (s, max = 500) =>
  typeof s === "string" && s.length > max ? s.slice(0, max) + "..." : s;

async function retrieveProductContext(q, limit = 4) {
  const query = (q || "").trim();
  if (!query) return [];
  return prisma.Product.findMany({
    where: {
      OR: [
        { nameEn: { contains: query, mode: "insensitive" } },
        { nameAr: { contains: query, mode: "insensitive" } },
        { company: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      company: true,
      category: true,
      description: true,
      sellPrice: true,
      usageInstructions: true,
      maintenanceGuidelines: true,
      videos: { select: { id: true, url: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function getOrCreateSessionForUser(userId) {
  let session = await prisma.ChatSession.findUnique({ where: { userId } });
  if (!session) session = await prisma.ChatSession.create({ data: { userId } });
  return session;
}
function buildPrompt(question, ctx) {
  const system = [
    "You are a shop assistant for medical equipment.",
    "ONLY answer about HOW TO USE and HOW TO MAINTAIN devices. NO diagnosis, treatment, or dosing.",
    "If product context is available, ground the answer in it.",
    "If product context is missing or insufficient, provide SAFE, GENERIC guidance based on the device name/description from the user's question and widely accepted best practices.",
    "Avoid model-specific claims without context. Say guidance is general and invite the user to share exact model/manufacturer/manual for precision.",
    "Structure the answer as: 1) Overview  2) Setup  3) Operation (numbered steps)  4) Cleaning  5) Routine maintenance (with suggested intervals)  6) Warnings/Don'ts  7) When to stop and call a technician  8) Short safety note.",
    "Answer in the user's language and keep steps concise and actionable.",
  ].join(" ");

  const contextText =
    ctx && ctx.length
      ? ctx
          .map((p, i) => {
            const title = p.nameEn || p.nameAr || `Product #${p.id}`;
            const use = p.usageInstructions
              ? `Usage: ${shrink(p.usageInstructions)}`
              : "Usage: (not provided)";
            const mnt = p.maintenanceGuidelines
              ? `Maintenance: ${shrink(p.maintenanceGuidelines)}`
              : "Maintenance: (not provided)";
            return `#${i + 1} ${title} | ${p.company || ""} | ${
              p.category || ""
            }\n${shrink(p.description) || ""}\n${use}\n${mnt}`;
          })
          .join("\n\n")
      : "(no catalog matches found)";

  const user =
    `Context:\n${contextText}\n\nQuestion:\n${question}\n\n` +
    `Instructions:\n- If context is empty/insufficient, still provide generic, safe guidance as specified above.\n- Use numbered steps and include warnings and maintenance intervals.\n\nAnswer:`;

  return { system, user };
}

async function llmAnswer(system, user) {
  const text = `${system}\n\n${user}`;
  if (AI_PROVIDER === "gemini") {
    const models = [G_PRIMARY, G_FALLBACK, G_FALLBACK2];
    let lastErr;
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const resp = await llmLimiter.schedule(() =>
          model.generateContent(text)
        );
        return resp.response.text();
      } catch (e) {
        lastErr = e;
        if (!isQuotaOr429(e)) throw e;
      }
    }
    throw new Error("quota_exceeded_all_gemini");
  }
  throw new Error("Unknown AI_PROVIDER");
}

async function sendUserMessage(userId, content) {
  if (!content || !content.trim()) throw new Error("Empty message");

  const session = await getOrCreateSessionForUser(userId);

  await prisma.ChatMessage.create({
    data: { sessionId: session.id, isUser: true, content, userId },
  });

  if (isMedicalAdvice(content)) {
    const refusal =
      "آسف، لا أستطيع تقديم تشخيص أو نصائح علاجية. أقدر أساعدك فقط في طريقة استخدام الجهاز وصيانته.";
    const assistantMsg = await prisma.ChatMessage.create({
      data: {
        sessionId: session.id,
        isUser: false,
        content: refusal,
        userId: null,
      },
      select: { id: true },
    });
    return { content: refusal, id: assistantMsg.id, isUser: false };
  }

  try {
    const ctx = await retrieveProductContext(content, 3);
    const { system, user } = buildPrompt(content, ctx);
    const answerText = await llmAnswer(system, user);

    const assistantMsg = await prisma.ChatMessage.create({
      data: {
        sessionId: session.id,
        isUser: false,
        content: answerText,
        userId: null,
      },
      select: { id: true },
    });

    return { content: answerText, id: assistantMsg.id, isUser: false };
  } catch (e) {
    const fallback =
      isQuotaOr429(e) || e.message === "quota_exceeded_all_gemini"
        ? "يبدو أننا وصلنا حد الاستخدام الحالي للخدمة الذكية. جرّب بعد قليل، أو أرسل موديل/مانيوال الجهاز لنساعدك بدقة."
        : "حدث خطأ أثناء توليد الرد. حاول مجددًا بعد قليل.";

    const assistantMsg = await prisma.ChatMessage.create({
      data: {
        sessionId: session.id,
        isUser: false,
        content: fallback,
        userId: null,
      },
      select: { id: true },
    });

    return { content: fallback, id: assistantMsg.id, isUser: false };
  }
}

async function listUserMessages(userId) {
  const session = await prisma.ChatSession.findUnique({ where: { userId } });
  if (!session) return [];
  return prisma.ChatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      isUser: true,
      content: true,
    },
  });
}

module.exports = { sendUserMessage, listUserMessages };
