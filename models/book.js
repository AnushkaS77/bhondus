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
    required: true,
  },
  page: {
    type: String,
    required: true,
  },
});

const bookSchema = new mongoose.Schema(
  {
    bookTitle: {
      type: String,
      required: true,
    },
    bookCoverUrl: {
      type: String,
      required: true,
    },
    chapters: {
      type: [chapterSchema],
      required: true,
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
  },
  { timestamps: true }
);

chapterSchema.index({ subTitle: "text", textContent: "text" });
bookSchema.index({ bookTitle: "text" });

export default mongoose.models.Book || mongoose.model("Book", bookSchema);
