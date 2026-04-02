"use client";
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { Slider } from "@/components/ui/slider";
import {
  generateStoryAi,
  getUserFeedbackGuidanceDb,
  saveStoryDb,
} from "@/actions/book";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function GenerateBookPage() {
  const MAX_PAGES = 5;
  const WAITING_MUSIC_SRC = "/waiting_music.mp3";
  const SURPRISE_PROMPTS = [
    "Toby the turtle learns that slow and steady can still win the day",
    "A curious little girl finds a secret library hidden inside an old tree",
    "A brave puppy helps glowing fireflies find their way home before bedtime",
    "A boy and his tiny robot build the coziest birdhouse in the neighborhood",
    "A shy fox opens a pancake stand in the forest and makes new friends",
    "A cheerful elephant learns how to dance for the jungle talent show",
    "A little mermaid discovers a lost pearl and returns it to the sea queen",
    "A sleepy bear has a very busy morning getting ready for a forest picnic",
    "A kind boy helps a lonely dragon learn how to make friends at school",
    "A girl and her cat follow a trail of stars to a magical garden",
    "A tiny frog wants to sing in the spring concert but feels nervous",
    "A young prince and his dog go on a rainy-day treasure hunt in the castle",
  ];
  const HARSH_WORD_RULES = [
    { root: "murder", pattern: /\bmurder(s|ed|ing)?\b/gi },
    { root: "kill", pattern: /\b(kill(s|ed|ing)?|kiil(s|ed|ing)?)\b/gi },
    { root: "dead", pattern: /\bdead\b/gi },
    { root: "death", pattern: /\bdeath(s)?\b/gi },
    { root: "blood", pattern: /\bblood(y)?\b/gi },
    { root: "weapon", pattern: /\bweapon(s)?\b/gi },
    { root: "gun", pattern: /\bgun(s)?\b/gi },
    { root: "knife", pattern: /\bkni(fe|ves)\b/gi },
    { root: "attack", pattern: /\battack(s|ed|ing)?\b/gi },
    { root: "violence", pattern: /\bviolence\b/gi },
  ];
  const [pages, setPages] = useState([5]);
  const [prompt, setPrompt] = useState("Three little acrons learn about AI");
  const [loading, setLoading] = useState({ tittle: "", status: false });
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);
  const [countdownPhase, setCountdownPhase] = useState("");
  const [countdownReachedZero, setCountdownReachedZero] = useState(false);
  const countdownIntervalRef = useRef(null);
  const waitingAudioRef = useRef(null);

  const router = useRouter();

  const formatMMSS = (totalSeconds) => {
    const safe = Math.max(0, Math.floor(totalSeconds || 0));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const estimateStorySeconds = (promptText) => {
    // Heuristic estimate for: story text generation only.
    const promptLen = (promptText || "").trim().length;
    const complexityBoost = Math.min(12, Math.ceil(promptLen / 120)); // 0..12
    return 20 + complexityBoost * 2; // ~20..44
  };

  const estimateImagesSeconds = (selectedPagesCount) => {
    // Heuristic estimate for: cover image + chapter images + DB save.
    const coverSeconds = 20;
    const chapterImageSeconds = 30; // per chapter/page image
    return coverSeconds + selectedPagesCount * chapterImageSeconds;
  };

  const startCountdown = (totalSeconds, phaseLabel) => {
    stopCountdown();
    setCountdownPhase(phaseLabel || "");
    setCountdownReachedZero(false);
    setTimeLeftSeconds(totalSeconds);

    countdownIntervalRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          setCountdownReachedZero(true);
          stopCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const stopWaitingMusic = () => {
    try {
      if (waitingAudioRef.current) {
        waitingAudioRef.current.pause();
        waitingAudioRef.current.currentTime = 0;
        waitingAudioRef.current = null;
      }
    } catch (err) {
      // Ignore audio errors (missing file, autoplay blocked, etc).
    }
  };

  const startWaitingMusic = () => {
    try {
      if (typeof Audio === "undefined") return;

      if (waitingAudioRef.current) {
        waitingAudioRef.current.pause();
        waitingAudioRef.current.currentTime = 0;
      } else {
        waitingAudioRef.current = new Audio(WAITING_MUSIC_SRC);
      }

      waitingAudioRef.current.loop = true;
      waitingAudioRef.current.volume = 0.15;
      const p = waitingAudioRef.current.play();
      if (p?.catch) p.catch(() => {});
    } catch (err) {
      // Ignore audio errors
    }
  };

  const handleSurprisePrompt = () => {
    if (SURPRISE_PROMPTS.length === 0) return;

    const trimmedCurrentPrompt = prompt.trim();
    const choices = SURPRISE_PROMPTS.filter(
      (item) => item !== trimmedCurrentPrompt
    );
    const pool = choices.length > 0 ? choices : SURPRISE_PROMPTS;
    const nextPrompt = pool[Math.floor(Math.random() * pool.length)];

    setPrompt(nextPrompt);
  };

  const handleGenerate = async () => {
    const selectedPages = Math.min(
      MAX_PAGES,
      Math.max(1, Number(pages?.[0] || 1))
    );
    const detectedWords = [];
    const detectedRoots = [];

    HARSH_WORD_RULES.forEach(({ root, pattern }) => {
      const matches = [...prompt.matchAll(pattern)].map((m) => m[0].toLowerCase());
      if (matches.length > 0) {
        detectedWords.push(...matches);
        detectedRoots.push(root);
      }
    });

    const uniqueDetectedWords = [...new Set(detectedWords)];
    const uniqueDetectedRoots = [...new Set(detectedRoots)];

    if (uniqueDetectedWords.length > 0) {
      toast.error(
        `Harsh words detected (${uniqueDetectedRoots.join(
          ", "
        )}): ${uniqueDetectedWords.join(", ")}. Please use kid-friendly wording.`
      );
      return;
    }

    startWaitingMusic();

    const storySeconds = estimateStorySeconds(prompt);
    const imagesSeconds = estimateImagesSeconds(selectedPages);
    const totalEstimatedSeconds = storySeconds + imagesSeconds;

    setLoading({ title: "Generating content...", status: true });
    startCountdown(totalEstimatedSeconds, "Generating storybook");

    const feedbackGuidance = await getUserFeedbackGuidanceDb(5);
    const finalPrompt = `
            Your job is to write a kids story book.
            The topic of the story is: ${prompt}
            The story must have exactly ${selectedPages} chapters in an array format.
            Write in a child-safe, friendly tone.
            ${
              feedbackGuidance
                ? `Use this recent user feedback to improve quality:
${feedbackGuidance}`
                : ""
            }

            Return ONLY valid JSON with double-quoted keys and no markdown.
            The JSON must match this exact shape:
            {
              "bookTitle": "string",
              "characterDescription": "string",
              "bookCoverSceneDescription": "string",
              "chapters": [
                {
                  "subTitle": "string",
                  "textContent": "string",
                  "sceneDescription": "string",
                  "page": 1
                }
              ]
            }
            Rules:
            - chapters length must be exactly ${selectedPages}
            - page must start at 1 and increase by 1
            - characterDescription must describe the recurring characters only
            - characterDescription must stay reusable across cover + all pages
            - bookCoverSceneDescription must describe only the cover scene
            - each chapters[i].sceneDescription must describe only that page's scene
            - every sceneDescription must match chapters[i].subTitle and chapters[i].textContent exactly
            - do not include imageUrl
            - no trailing commas

            Illustration consistency requirements (IMPORTANT for image generation):
            - characterDescription is the single source of truth for recurring character identity and appearance across the whole book.
            - characterDescription must define characters only: names, species, colors, markings, outfits, accessories, and recurring props. Do NOT include scene-specific actions or poses.
            - bookCoverSceneDescription must be different from any chapter scene and must not copy chapter 1 composition.
            - each chapters[i].sceneDescription must describe the exact characters, animals, actions, emotions, and environment from that chapter text.
            - each chapters[i].sceneDescription must describe only physically visible, literal actions and settings for illustration.
            - do not use metaphorical, symbolic, dreamlike, exaggerated, or poetic visual language in sceneDescription unless the story explicitly requires fantasy.
            - do not describe impossible actions such as flying, floating, teleporting, or transforming unless the chapter text explicitly says that happens.
            - if a character feels fast, brave, excited, or free, show that through facial expression, pose, and setting, not by inventing unrealistic actions.
            - Page scene accuracy: use only the characters/animals supported by characterDescription and the chapter text. Show exactly the number and animal types described in chapters[i].subTitle/textContent. Do not swap a cat into a dog. Do not introduce extra animals/characters or duplicates unless the chapter text explicitly includes them.
            - Every page scene (cover and chapters) MUST be visually different from the other pages (different action/composition/background), while keeping the same art style.
            - Use the SAME art style, lighting, and background rendering across cover + all pages.
            - No title text, no watermarks, no extra writing.
            - Apply feedback ONLY to the story writing in subTitle/textContent. Feedback must NOT change characterDescription consistency or any illustration composition/style rules.
        `;

    try {
      const result = await generateStoryAi(finalPrompt);
      setLoading({ title: "Generating images and saving story...", status: true });

      // save story and generated images to db
      const saveResult = await saveStoryDb(result);

      toast.success("Story saved successfully");

      setLoading({ title: "", status: false });
      stopCountdown();
      setTimeLeftSeconds(null);
      setCountdownPhase("");
      setCountdownReachedZero(false);
      stopWaitingMusic();

      router.push(saveResult?.slug ? `/book/${saveResult.slug}` : "/dashboard");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to generate story");
      setLoading({ title: "", status: false });
      stopCountdown();
      setTimeLeftSeconds(null);
      setCountdownPhase("");
      setCountdownReachedZero(false);
      stopWaitingMusic();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-menium">
          Number of pages: {pages[0]}
        </label>

        <Slider
          min={1}
          max={MAX_PAGES}
          step={1}
          value={pages}
          onValueChange={setPages}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-medium">Story prompt</label>
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-amber-300 bg-amber-50 px-4 text-amber-900 hover:bg-amber-100"
            onClick={handleSurprisePrompt}
          >
            <SparklesIcon className="mr-2 h-4 w-4" />
            Surprise Me
          </Button>
        </div>
        <Textarea
          id="prompt"
          placeholder="Enter your story prompt here..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
        />
        <p className="text-sm text-gray-600">
          Need an idea? Tap <span className="font-medium">Surprise Me</span> to
          drop a random story prompt into the box.
        </p>
      </div>

      {loading?.status && timeLeftSeconds != null && (
        <p className="text-sm text-gray-700">
          {countdownReachedZero ? (
            <>Estimated time reached (may vary). Still generating...</>
          ) : (
            <>
              {countdownPhase ? `${countdownPhase}: ` : "Estimated time remaining: "}
              {formatMMSS(timeLeftSeconds)} (may vary)
            </>
          )}
        </p>
      )}

      <p className="text-red-500 animate-pulse">
        {loading?.status && loading?.title}
      </p>

      <div className="flex justify-end">
        <Button
          className="bg-green-600 hover:bg-green-800 rounded-full"
          onClick={handleGenerate}
        >
          {loading?.status ? (
            <>
              <Loader2Icon className="animate-spin" /> Please wait...
            </>
          ) : (
            "Generate Book"
          )}
        </Button>
      </div>
    </div>
  );
}
