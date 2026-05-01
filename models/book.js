import mongoose from "mongoose";

const chapterSchema = new mongoose.Schema({
  subTitle: {
    type: String,
    required: true,
  },
  textContent: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    default: "",
  },
  page: {
    type: String,
    required: true,
  },
});

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const bookSchema = new mongoose.Schema(
  {
    bookTitle: {
      type: String,
      required: true,
    },
    bookCoverUrl: {
      type: String,
      default: "",
    },
    chapters: {
      type: [chapterSchema],
      default: [],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    feedbacks: {
      type: [feedbackSchema],
      default: [],
    },
  },
  { timestamps: true }
);

chapterSchema.index({ subTitle: "text", textContent: "text" });
bookSchema.index({ bookTitle: "text" });

// Ensure we always use the latest schema definition (important during dev/hot reload)
if (mongoose.models.Book) {
  delete mongoose.models.Book;
}

const Book = mongoose.model("Book", bookSchema);

export default Book;
