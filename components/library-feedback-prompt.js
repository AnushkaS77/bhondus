"use client";

import { useEffect, useState } from "react";
import { submitBookFeedbackDb } from "@/actions/book";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";

const STORAGE_KEY = "lastViewedBookForFeedback";

export default function LibraryFeedbackPrompt() {
  const [book, setBook] = useState(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.title) {
        setBook(parsed);
      }
    } catch (err) {
      console.error("Failed to read feedback prompt state", err);
    }
  }, []);

  const clearPrompt = () => {
    setBook(null);
    setComment("");
    localStorage.removeItem(STORAGE_KEY);
  };

  const onSubmit = async () => {
    const clean = comment.trim();
    if (clean.length < 3) {
      toast.error("Please write at least a few words of feedback.");
      return;
    }

    try {
      setSaving(true);
      await submitBookFeedbackDb(book.id, clean);
      toast.success("Thanks for your feedback.");
      clearPrompt();
    } catch (err) {
      toast.error(err?.message || "Failed to save feedback.");
    } finally {
      setSaving(false);
    }
  };

  if (!book) return null;

  return (
    <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-4">
      <p className="text-sm font-medium text-green-900">
        How was <span className="font-semibold">{book.title}</span>?
      </p>
      <p className="text-xs text-green-800 mt-1">
        Your feedback will be used to improve future story generation.
      </p>

      <div className="mt-3 space-y-2">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="What did you like or want improved?"
        />
        <div className="flex gap-2">
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? "Saving..." : "Submit Feedback"}
          </Button>
          <Button variant="outline" onClick={clearPrompt} disabled={saving}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
