"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import Book from "@/models/book";
import { authCheckAction } from "@/actions/auth";
import { generateImageAi } from "@/actions/image";
import slugify from "slugify";
import { nanoid } from "nanoid";
import db from "@/utils/db";

/* ------------------------------------------------------------------
   Gemini setup (kept exactly as you want – Gemini 2.5)
------------------------------------------------------------------- */
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.warn("⚠️ GEMINI_API_KEY missing. Story generation may fail.");
}

const genAI = new GoogleGenerativeAI(geminiApiKey || "");

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------- */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeGenerateImage(prompt, sizeKey = "chapter") {
  if (!prompt || typeof prompt !== "string") return "";

  // Retry once on rate limiting to reduce "too many requests" failures.
  const maxAttempts = 2;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await generateImageAi(prompt, sizeKey);
    if (result?.success && result?.url) return result.url;

    if (result?.error === "TOO_MANY_REQUESTS") {
      await sleep((attempt + 1) * 1500);
      continue;
    }

    break;
  }

  return "";
}

function cleanJsonString(text = "") {
  const clean = String(text || "")
    .trim()
    .replace(/^```json\s*|\s*```$/g, "");
  const jsonStart = clean.indexOf("{");
  const jsonEnd = clean.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return clean.slice(jsonStart, jsonEnd + 1);
  }
  return clean;
}

function detectMainAnimal(text = "") {
  const normalized = String(text || "").toLowerCase();
  const animals = [
    "boy",
    "girl",
    "child",
    "kid",
    "man",
    "woman",
    "person",
    "mother",
    "mom",
    "father",
    "dad",
    "grandmother",
    "grandma",
    "grandfather",
    "grandpa",
    "baby",
    "teacher",
    "princess",
    "prince",
    "turtle",
    "dog",
    "cat",
    "rabbit",
    "bunny",
    "bear",
    "fox",
    "lion",
    "elephant",
    "mouse",
    "bird",
    "duck",
    "frog",
    "horse",
    "monkey",
    "deer",
    "wolf",
    "sheep",
    "cow",
    "pig",
  ];

  return animals.find((animal) => normalized.includes(animal)) || "";
}

function buildIllustrationPrompt({
  characterDescription,
  sceneDescription,
  storyContext = "",
  isCover = false,
}) {
  const combinedText = `${characterDescription} ${sceneDescription} ${storyContext}`;
  const mainAnimal = detectMainAnimal(combinedText);
  const animalInstruction = mainAnimal
    ? `Main animal: ${mainAnimal}. The image must clearly show a ${mainAnimal} and must not replace it with any other animal.`
    : "Use the exact animal or character described and do not replace it with a different one.";

  return `Children's storybook illustration, soft colorful cartoon style.
${animalInstruction}
Character design: ${characterDescription || "Keep the same recurring main character design across the whole book."}
Scene: ${sceneDescription}
${storyContext ? `Story context: ${storyContext}` : ""}
Important rules:
- Show the same main character consistently across the book.
- Match the scene exactly.
- Do not add extra animals or extra characters unless the scene requires them.
- Do not generate rabbits, bunnies, or unrelated animals unless they are explicitly described.
- Use a unique pose, action, expression, background, and camera angle for this scene.
- No text, no watermark.
${isCover ? "- This image establishes the main character design for the whole book." : ""}`;
}

// Ensure DB-safe image fields
function sanitizeImages(data) {
  return {
    ...data,
    bookCoverUrl:
      typeof data.bookCoverUrl === "string" ? data.bookCoverUrl : "",
    chapters: Array.isArray(data.chapters)
      ? data.chapters.map((ch, index) => {
          const normalizedPage =
            ch?.page != null && String(ch.page).trim()
              ? String(ch.page).trim()
              : String(index + 1);

          return {
            ...ch,
            page: normalizedPage,
            imageUrl: typeof ch.imageUrl === "string" ? ch.imageUrl : "",
          };
        })
      : [],
  };
}

/* ------------------------------------------------------------------
   1️⃣ Generate story using Gemini (JSON output)
------------------------------------------------------------------- */
export async function generateStoryAi(prompt) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash", // ✅ kept as requested
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const rawJson = cleanJsonString(text);

  try {
    return JSON.parse(rawJson);
  } catch (err) {
    console.error("generateStoryAi parse error:", err);
    console.error("generateStoryAi raw response:", text);
    throw new Error(
      "AI returned invalid JSON. Please try again with a more specific prompt."
    );
  }
}

/* ------------------------------------------------------------------
   2️⃣ Create & save book (images + DB)
------------------------------------------------------------------- */
export async function saveStoryDb(data) {
  try {
    await db();

    const { user } = await authCheckAction();
    if (!user) throw new Error("Login required");

    /* ---------- Generate cover image ---------- */
    const characterDescription =
      typeof data.characterDescription === "string"
        ? data.characterDescription.trim()
        : "";

    const coverSceneDescription =
      typeof data.bookCoverSceneDescription === "string"
        ? data.bookCoverSceneDescription.trim()
        : typeof data.bookCoverDescription === "string"
          ? data.bookCoverDescription.trim()
          : "";

    const resolvedCoverSceneDescription =
      coverSceneDescription ||
      `A vibrant, cartoon-style kids storybook cover for "${data.bookTitle}"`;

    const coverPrompt = buildIllustrationPrompt({
      characterDescription,
      sceneDescription: resolvedCoverSceneDescription,
      storyContext: data.bookTitle || "",
      isCover: true,
    });

    data.bookCoverUrl = await safeGenerateImage(coverPrompt, "cover");

    // Final fallback if cover generation fails.
    if (!data.bookCoverUrl) {
      const fallbackCoverPrompt = buildIllustrationPrompt({
        characterDescription,
        sceneDescription: resolvedCoverSceneDescription,
        storyContext: data.bookTitle || "",
        isCover: true,
      });
      data.bookCoverUrl = await safeGenerateImage(fallbackCoverPrompt, "cover");
    }

    /* ---------- Generate chapter images ---------- */
    if (Array.isArray(data.chapters)) {
      for (const chapter of data.chapters) {
        const sceneDescription =
          typeof chapter.sceneDescription === "string"
            ? chapter.sceneDescription.trim()
            : typeof chapter.imageDescription === "string"
              ? chapter.imageDescription.trim()
              : typeof chapter.textContent === "string"
                ? chapter.textContent.trim()
                : `A vibrant, cartoon-style storybook illustration for page ${chapter.page}`;

        const chapterStoryContext = `${chapter.subTitle || ""} ${chapter.textContent || ""}`
          .trim()
          .slice(0, 900);

        const chapterPrompt = buildIllustrationPrompt({
          characterDescription,
          sceneDescription,
          storyContext: chapterStoryContext,
        });

        chapter.imageUrl = await safeGenerateImage(chapterPrompt, "chapter");
      }
    }

    /* ---------- Sanitize before DB ---------- */
    const cleanData = sanitizeImages(data);

    const slug = slugify(`${cleanData.bookTitle}-${nanoid(6)}`, {
      lower: true,
      strict: true,
    });

    const createdBook = await Book.create({
      ...cleanData,
      slug,
      author: user._id,
    });

    return { success: true, slug: createdBook.slug };
  } catch (err) {
    console.error("saveStoryDb error:", err);
    throw new Error(err.message || "Failed to save story");
  }
}

/* ------------------------------------------------------------------
   3️⃣ Read APIs
------------------------------------------------------------------- */
export async function getBooksDb(page = 1, limit = 10) {
  try {
    await db();

    const [books, totalCount] = await Promise.all([
      Book.find()
        .select("-chapters")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("author", "name"),
      Book.countDocuments(),
    ]);

    return {
      books: JSON.parse(JSON.stringify(books)),
      totalCount,
    };
  } catch (err) {
    console.error(err);
    throw new Error("Failed to fetch books");
  }
}

export async function getBookDb(slug) {
  try {
    await db();
    const book = await Book.findOne({ slug }).populate("author", "name");
    return JSON.parse(JSON.stringify(book));
  } catch (err) {
    console.error(err);
    throw new Error("Failed to fetch book");
  }
}

export async function getUserBooksDb(page = 1, limit = 10) {
  try {
    await db();

    const { user } = await authCheckAction();
    if (!user) throw new Error("Login required");

    const [books, totalCount] = await Promise.all([
      Book.find({ author: user._id })
        .select("-chapters")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("author", "name"),
      Book.countDocuments({ author: user._id }),
    ]);

    return {
      books: JSON.parse(JSON.stringify(books)),
      totalCount,
    };
  } catch (err) {
    console.error(err);
    throw new Error("Failed to fetch user books");
  }
}

/* ------------------------------------------------------------------
   4️⃣ Delete book
------------------------------------------------------------------- */
export async function deleteBookDb(id) {
  try {
    await db();

    const { user } = await authCheckAction();
    if (!user) throw new Error("Login required");

    const book = await Book.findById(id);
    if (!book) throw new Error("Book not found");

    if (book.author.toString() !== user._id.toString()) {
      throw new Error("Unauthorized");
    }

    await Book.findByIdAndDelete(id);
    return { success: true };
  } catch (err) {
    console.error(err);
    throw new Error("Failed to delete book");
  }
}

/* ------------------------------------------------------------------
   5️⃣ Search books
------------------------------------------------------------------- */
export async function searchBooksDb(query) {
  try {
    await db();

    const books = await Book.find({
      $text: { $search: query },
    })
      .sort({ score: { $meta: "textScore" } })
      .limit(100);

    return JSON.parse(JSON.stringify(books));
  } catch (err) {
    console.error(err);
    throw new Error("Search failed");
  }
}

/* ------------------------------------------------------------------
   6️⃣ Feedback APIs
------------------------------------------------------------------- */
export async function submitBookFeedbackDb(bookId, comment) {
  try {
    await db();

    const { user } = await authCheckAction();
    if (!user) throw new Error("Login required");

    const cleanComment = String(comment || "").trim();
    if (!cleanComment) throw new Error("Feedback cannot be empty");

    const updated = await Book.findByIdAndUpdate(
      bookId,
      {
        $push: {
          feedbacks: {
            user: user._id,
            comment: cleanComment.slice(0, 1000),
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );
    if (!updated) throw new Error("Book not found");

    return { success: true };
  } catch (err) {
    console.error(err);
    throw new Error(err.message || "Failed to save feedback");
  }
}

export async function getUserFeedbackGuidanceDb(limit = 5) {
  try {
    await db();

    const { user } = await authCheckAction();
    if (!user) return "";

    const books = await Book.find({ "feedbacks.user": user._id })
      .select("bookTitle feedbacks")
      .sort({ updatedAt: -1 })
      .limit(20);

    const feedbackItems = [];
    for (const book of books) {
      for (const fb of book.feedbacks || []) {
        if (String(fb.user) === String(user._id)) {
          feedbackItems.push({
            bookTitle: book.bookTitle,
            comment: fb.comment,
            createdAt: fb.createdAt || new Date(0),
          });
        }
      }
    }

    feedbackItems.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const recent = feedbackItems.slice(0, limit);
    if (recent.length === 0) return "";

    return recent
      .map((item, idx) => `${idx + 1}. ${item.comment} (from "${item.bookTitle}")`)
      .join("\n");
  } catch (err) {
    console.error(err);
    return "";
  }
}
