
import { GoogleGenerativeAI } from "@google/generative-ai";
import Book from "@/models/book";
import { authCheckAction } from "@/actions/auth";
import slugify from "slugify";
import { nanoid } from "nanoid";
import db from "@/utils/db";

const genAi = new GoogleGenerativeAI(process.env.OPEN_API_KEY);

export async function generateStoryAi(prompt) {
  const model = genAi.getGenerativeModel({ 
    model: "gpt-4o-mini",
    generationConfig: {
      temperature: 0.8,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    }
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  const cleanResponse = text.trim().replace(/^```json|```$/g, "");
  const parsedResponse = JSON.parse(cleanResponse);

  return parsedResponse;
}

export async function saveStoryDb(data) {
  try {
    const { user } = await authCheckAction();

    if (!user) {
      throw new Error("You need to be logged in to create a story book");
    }

    const slug = slugify(`${data.bookTitle}-${nanoid(6)}`, {
      lower: true,
      strict: true,
    });

    await Book.create({
      ...data,
      slug,
      author: user._id,
    });
  } catch (err) {
    throw new Error(err);
  }
}

export const getBooksDb = async (page, limit) => {
  try {
    db();

    const [books, totalCount] = await Promise.all([
      Book.find()
        .select(["-chapters"])
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
    throw new Error(err);
  }
};

export const getBookDb = async (slug) => {
  try {
    db();

    const book = await Book.findOne({ slug }).populate("author", "name");
    return JSON.parse(JSON.stringify(book));
  } catch (err) {
    throw new Error(err);
  }
};

export const getUserBooksDb = async (page, limit) => {
  try {
    db();

    const { user } = await authCheckAction();

    if (!user) {
      throw new Error("You need to be logged in to view your stories");
    }

    const [books, totalCount] = await Promise.all([
      Book.find({ author: user._id })
        .select(["-chapters"])
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
    throw new Error(err);
  }
};

export const deleteBookDb = async (id) => {
  try {
    db();

    const { user } = await authCheckAction();

    if (!user) {
      throw new Error("You need to be logged in to delete a story");
    }

    const book = await Book.findById(id);

    if (book.author.toString() !== user._id.toString()) {
      throw new Error("You are not authorized to delete this story");
    }

    // const book = await Book.findOneAndDelete({
    //   _id: id,
    //   author: user._id,
    // }).select(["-chapters"]);

    // await book.remove();
    await Book.findByIdAndDelete(id);

    return { success: true };
  } catch (err) {
    throw new Error(err);
  }
};

export const searchBooksDb = async (query) => {
  try {
    await db(); // Ensure database connection

    const books = await Book.find({
      $text: { $search: query }, // Full-text search on both bookTitle and chapters.textContent
    })
      .sort({ score: { $meta: "textScore" } }) // Sort by relevance based on text search
      .limit(100)
      .exec();

    // Return the result as JSON
    console.log("books searched => ", books.length);
    return JSON.parse(JSON.stringify(books)); // Corrected variable name from blogs to books
  } catch (err) {
    console.error("Error in searchBooksDb:", err.message);
    throw new Error(err);
  }
};
