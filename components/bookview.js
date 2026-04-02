"use client";
import React, {
  useState,
  useLayoutEffect,
  useCallback,
  useRef,
  useEffect,
} from "react";
import Image from "next/image";
import HTMLFlipbook from "react-pageflip";
import { Button } from "@/components/ui/button";
import { Book, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { speakText, stopSpeaking, isSpeechSupported } from "@/utils/textToSpeech";

const FEEDBACK_STORAGE_KEY = "lastViewedBookForFeedback";
const VIEW_LIMIT_MS = 5 * 60 * 1000;

function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const colors = ["gray", "red", "green", "blue", "yellow", "purple"];
const colorVariants = {
  gray: "from-gray-200 to gray-100",
  red: "from-red-200 to red-100",
  green: "from-green-200 to green-100",
  blue: "from-blue-200 to blue-100",
  yellow: "from-yellow-200 to yellow-100",
  purple: "from-purple-200 to purple-100",
};

const allowedImageHosts = new Set([
  "res.cloudinary.com",
  "source.unsplash.com",
  "dummyimage.com",
  "picsum.photos",
]);

const getSafeImageSrc = (src) => {
  if (!src) return null;
  if (src.startsWith("/")) return src;

  try {
    const { hostname } = new URL(src);
    if (allowedImageHosts.has(hostname)) {
      return src;
    }
  } catch (err) {
    console.warn("Invalid image URL provided to getSafeImageSrc", src, err);
  }

  return null;
};

const getWordStartIndices = (text) => {
  const starts = [];
  const regex = /\S+/g;
  let match = regex.exec(text);
  while (match) {
    starts.push(match.index);
    match = regex.exec(text);
  }
  return starts;
};

export default function BookView({ data }) {
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-700">Story not found.</p>
      </div>
    );
  }

  const bookRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [key, setKey] = useState(0);
  const [color, setColor] = useState("gray");
  const [canUseSpeech, setCanUseSpeech] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAudioOnlyMode, setIsAudioOnlyMode] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(VIEW_LIMIT_MS);
  const utteranceRef = useRef(null);
  const stopRequestedRef = useRef(false);
  const audioModeAutoStartedRef = useRef(false);
  const audioModeSessionStartedRef = useRef(false);
  const audioReadSessionInProgressRef = useRef(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(null);
  const wordsPerChapterRef = useRef([]);
  const readingTextRef = useRef("");
  const titleWords = (data.bookTitle || "").split(/\s+/).filter(Boolean);

  const chapterTexts = (data.chapters || []).map(
    (chapter) => chapter.textContent || ""
  );

  const hasReadableText = Boolean(
    (data.bookTitle || "").trim() ||
      (data.author?.name || "").trim() ||
      chapterTexts.join(" ").trim()
  );

  const updateDimensions = useCallback(() => {
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    setKey((prevKey) => prevKey + 1);
  }, []);

  useLayoutEffect(() => {
    const deboucnedUpdateDimensions = debounce(updateDimensions, 250);
    updateDimensions();

    window.addEventListener("resize", deboucnedUpdateDimensions);

    return () =>
      window.removeEventListener("resize", deboucnedUpdateDimensions);
  }, [updateDimensions]);

  const isSinglePage = dimensions.width < 768;

  useEffect(() => {
    // Check browser support for the Web Speech API on the client
    setCanUseSpeech(isSpeechSupported());

    // Stop any ongoing speech if this component unmounts
    return () => {
      stopRequestedRef.current = true;
      stopSpeaking();
      utteranceRef.current = null;
      setHighlightedWordIndex(null);
      wordsPerChapterRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!data?._id || !data?.bookTitle) return;
    try {
      localStorage.setItem(
        FEEDBACK_STORAGE_KEY,
        JSON.stringify({
          id: data._id,
          title: data.bookTitle,
          slug: data.slug,
          viewedAt: Date.now(),
        })
      );
    } catch (err) {
      console.error("Failed to save viewed book for feedback", err);
    }
  }, [data?._id, data?.bookTitle, data?.slug]);

  useEffect(() => {
    // Reset mode every time this book view is opened.
    setIsAudioOnlyMode(false);
    audioModeAutoStartedRef.current = false;
    audioModeSessionStartedRef.current = false;
    audioReadSessionInProgressRef.current = false;
    setTimeLeftMs(VIEW_LIMIT_MS);

    const sessionStart = Date.now();
    const timeoutId = setTimeout(() => {
      setIsAudioOnlyMode(true);
    }, VIEW_LIMIT_MS);

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - sessionStart;
      const remaining = Math.max(0, VIEW_LIMIT_MS - elapsed);
      setTimeLeftMs(remaining);
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [data?._id]);

  const formatCountdown = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  const timeProgressPercent = Math.max(
    0,
    Math.min(100, (timeLeftMs / VIEW_LIMIT_MS) * 100)
  );
  const isFinalThirtySeconds = timeLeftMs <= 30 * 1000;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const flipToPage = async (pageIndex) => {
    if (!bookRef.current) return;
    try {
      bookRef.current.pageFlip().flip(pageIndex, "top");
    } catch (err) {
      console.error("Page flip failed", err);
    }
    await sleep(450);
  };

  const speakSegment = (segment) =>
    new Promise((resolve) => {
      const text = (segment.text || "").trim();
      if (!text) return resolve();
      const wordStarts = getWordStartIndices(text);

      const utterance = speakText(text, {
        rate: 0.58,
        pitch: 1.02,
        onboundary: (event) => {
          if (event.name && event.name !== "word") return;
          if (event.charIndex == null || wordStarts.length === 0) return;

          // Use the boundary char index so highlight starts when the word starts.
          let localIndex = 0;
          for (let i = 0; i < wordStarts.length; i += 1) {
            if (wordStarts[i] <= event.charIndex) {
              localIndex = i;
            } else {
              break;
            }
          }

          localIndex = Math.max(0, Math.min(segment.wordCount - 1, localIndex));
          setHighlightedWordIndex(segment.startIndex + localIndex);
        },
        onend: () => {
          if (utteranceRef.current === utterance) utteranceRef.current = null;
          resolve();
        },
        onerror: () => {
          if (utteranceRef.current === utterance) utteranceRef.current = null;
          resolve();
        },
      });

      if (!utterance) return resolve();
      utteranceRef.current = utterance;
      setHighlightedWordIndex(segment.startIndex);
    });

  const handleReadStory = async () => {
    if (!canUseSpeech || !hasReadableText) return;

    // If we were paused, just resume the existing utterance
    if (isPaused) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    stopRequestedRef.current = false;
    stopSpeaking();

    audioReadSessionInProgressRef.current = true;

    // Build reading plan in the order: title -> author -> each chapter (subtitle + content)
    const readingWords = [];
    const readingPlan = [];
    wordsPerChapterRef.current = [];

    // Title words (not currently highlighted on cover, but included in reading)
    if (data.bookTitle) {
      const titleWordList = data.bookTitle.split(/\s+/).filter(Boolean);
      const startIndex = readingWords.length;
      readingWords.push(...titleWordList);
      readingPlan.push({
        text: data.bookTitle,
        startIndex,
        wordCount: titleWordList.length,
        pageIndex: 0,
        pauseAfterMs: 800,
      });
    }

    // "By Author" segment
    if (data.author?.name) {
      const authorSegment = `By ${data.author.name}`;
      const authorWords = authorSegment.split(/\s+/).filter(Boolean);
      const startIndex = readingWords.length;
      readingWords.push(...authorWords);
      readingPlan.push({
        text: authorSegment,
        startIndex,
        wordCount: authorWords.length,
        pageIndex: 1,
        pauseAfterMs: 700,
      });
    }

    // Chapters: track subtitle + content word ranges for highlighting
    (data.chapters || []).forEach((chapter, chapterIndex) => {
      const subTitleText = chapter.subTitle || "";
      const contentText = chapter.textContent || "";

      const subTitleWords = subTitleText.split(/\s+/).filter(Boolean);
      const contentWords = contentText.split(/\s+/).filter(Boolean);

      const subTitleStart = readingWords.length;
      readingWords.push(...subTitleWords);

      const contentStart = readingWords.length;
      readingWords.push(...contentWords);

      wordsPerChapterRef.current.push({
        subTitleStart,
        subTitleLength: subTitleWords.length,
        contentStart,
        contentLength: contentWords.length,
      });

      if (subTitleWords.length > 0) {
        readingPlan.push({
          text: subTitleText,
          startIndex: subTitleStart,
          wordCount: subTitleWords.length,
          pageIndex: chapterIndex + 2,
          pauseAfterMs: 700,
        });
      }

      if (contentWords.length > 0) {
        readingPlan.push({
          text: contentText,
          startIndex: contentStart,
          wordCount: contentWords.length,
          pageIndex: chapterIndex + 2,
          pauseAfterMs: 900,
        });
      }
    });

    readingTextRef.current = readingWords.join(" ");
    if (readingPlan.length === 0) {
      audioReadSessionInProgressRef.current = false;
      return;
    }

    // Fresh read from the beginning
    setIsPaused(false);
    setIsSpeaking(true);
    setHighlightedWordIndex(0);

    for (const segment of readingPlan) {
      if (stopRequestedRef.current) break;
      await flipToPage(segment.pageIndex);
      if (stopRequestedRef.current) break;
      await speakSegment(segment);
      if (stopRequestedRef.current) break;
      await sleep(segment.pauseAfterMs);
    }

    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
    setHighlightedWordIndex(null);
    audioReadSessionInProgressRef.current = false;
  };

  useEffect(() => {
    if (!isAudioOnlyMode) {
      audioModeAutoStartedRef.current = false;
      return;
    }

    if (!canUseSpeech || !hasReadableText) return;
    if (audioModeAutoStartedRef.current) return;
    if (isSpeaking || isPaused) return;

    audioModeAutoStartedRef.current = true;
    audioModeSessionStartedRef.current = true;
    handleReadStory();
  }, [isAudioOnlyMode, canUseSpeech, hasReadableText, isSpeaking, isPaused]);

  // Auto-return to the main story when narration completes in audio mode.
  useEffect(() => {
    if (!isAudioOnlyMode) return;
    if (!audioModeSessionStartedRef.current) return;
    if (isSpeaking || isPaused) return;
    if (audioReadSessionInProgressRef.current) return;
    if (utteranceRef.current) return;

    setIsAudioOnlyMode(false);
    audioModeSessionStartedRef.current = false;
  }, [isAudioOnlyMode, isSpeaking, isPaused]);

  const handlePauseReading = () => {
    if (!isSpeaking || !utteranceRef.current) return;

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }

    setIsPaused(true);
    setIsSpeaking(false);
  };

  const handleStopReading = () => {
    stopRequestedRef.current = true;
    stopSpeaking();
    utteranceRef.current = null;
    setIsPaused(false);
    setIsSpeaking(false);
    setHighlightedWordIndex(null);
    audioReadSessionInProgressRef.current = false;
    audioModeSessionStartedRef.current = false;
  };

  const handleGoToAudioMode = () => {
    audioModeSessionStartedRef.current = true;
    setIsAudioOnlyMode(true);
  };

  const handleExitAudioMode = () => {
    // When exiting audio mode, pause narration (do not stop it).
    if (
      typeof window !== "undefined" &&
      window.speechSynthesis &&
      window.speechSynthesis.speaking
    ) {
      window.speechSynthesis.pause();
    }

    setIsPaused(true);
    setIsSpeaking(false);
    setIsAudioOnlyMode(false);
    audioModeSessionStartedRef.current = false;
  };

  if (dimensions.width === 0) return null;
  if (isAudioOnlyMode) {
    return (
      <div
        className="fixed inset-0 text-white flex items-center justify-center px-6"
        style={{ backgroundColor: "#000", width: "100vw", height: "100vh", zIndex: 2147483647 }}
      >
        <Button
          variant="outline"
          size="lg"
          className="fixed bottom-8 right-8 bg-white text-black border-white hover:bg-gray-200 hover:text-black"
          onClick={handleExitAudioMode}
        >
          Exit
        </Button>

        <h1 className="w-full max-w-4xl text-center text-4xl md:text-6xl font-bold leading-relaxed">
          {titleWords.join(" ")}
        </h1>
      </div>
    );
  }

  const flipPrevPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipPrev("buttom");
    }
  };

  const flipNextPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipNext("buttom");
    }
  };

  const flipHomePage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flip(0, "top");
    }
  };

  return (
    <div>
      {!isAudioOnlyMode && (
        <div
          className={`mx-auto mb-3 max-w-3xl rounded-md border px-4 py-2 text-sm ${
            isFinalThirtySeconds
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-blue-200 bg-blue-50 text-blue-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span>Audio mode in: {formatCountdown(timeLeftMs)}</span>
            <div className="flex items-center gap-3">
              {isFinalThirtySeconds && <span>Hurry up</span>}
              <Button variant="outline" size="sm" onClick={handleGoToAudioMode}>
                Go to audio mode
              </Button>
            </div>
          </div>
          <div className="mt-2 h-2 w-full rounded bg-white/80 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                isFinalThirtySeconds ? "bg-red-500" : "bg-blue-500"
              }`}
              style={{ width: `${timeProgressPercent}%` }}
            />
          </div>
        </div>
      )}

      <HTMLFlipbook
        key={key}
        ref={bookRef}
        width={
          isSinglePage
            ? dimensions.width * 0.9
            : Math.min(dimensions.width * 0.45, 800)
        }
        height={dimensions.height * 0.95}
        size="stretch"
        minWidth={315}
        maxWidth={dimensions.width}
        minHeight={420}
        maxHeight={dimensions.height * 0.95}
        maxShadowOpacity={0.5}
        mobileScrollSupport={true}
        drawShadow={true}
        useMouseEvents={true}
        showCover={isSinglePage}
        onFlip={(e) => setCurrentPage(e.data)}
        style={{
          margin: "0 auto",
          boxShadow: "0px 4px 8px rgba(0,0,0,0.3)",
        }}
      >
        {/* <div className="flex flex-col justify-center items-center p-6 h-full">
          <h1 className="flex justify-center items-center h-screen text-4xl font-bold text-center">
            {data.bookTitle}
          </h1>
        </div> */}

        <div
          className={`flex flex-col justify-center items-center p-6 h-full bg-gradient-to-b ${colorVariants[color]} relative`}
        >
          <div className="relative w-full h-3/4 mb-6 rounded-lg overflow-hidden border border-black/10">
            {getSafeImageSrc(data.bookCoverUrl) ? (
              <Image
                src={getSafeImageSrc(data.bookCoverUrl)}
                alt={data.bookTitle || "Book cover"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 90vw, 45vw"
                priority
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-white/70 text-center text-sm text-gray-700 px-4">
                Image not generated (rate limited / try again)
              </div>
            )}
          </div>
          <h1
            className={`font-bold text-center text-black leading-relaxed ${
              isAudioOnlyMode ? "text-3xl" : "text-4xl"
            }`}
          >
            {titleWords.map((word, idx) => {
              const isHighlighted = idx === highlightedWordIndex;
              return (
                <span
                  key={`title-${idx}`}
                  className={isHighlighted ? "bg-yellow-300 rounded-sm px-0.5" : undefined}
                >
                  {word}
                  {idx !== titleWords.length - 1 ? " " : ""}
                </span>
              );
            })}
          </h1>
        </div>

        <div className="flex flex-col justify-center items-center p-6 h-full">
          {isAudioOnlyMode ? (
            <div className="relative w-full h-3/4 rounded-lg overflow-hidden border border-black/10">
              {getSafeImageSrc(data.bookCoverUrl) ? (
                <Image
                  src={getSafeImageSrc(data.bookCoverUrl)}
                  alt={data.bookTitle || "Book cover"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 90vw, 45vw"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-white/70 text-center text-sm text-gray-700 px-4">
                  Image not generated (rate limited / try again)
                </div>
              )}
            </div>
          ) : (
            <h1 className="flex justify-center items-center h-screen text-center">
              By {data.author.name}
            </h1>
          )}
        </div>

        {(data.chapters || []).map((page, index) => {
          const mapping = wordsPerChapterRef.current[index] || {
            subTitleStart: 0,
            subTitleLength: 0,
            contentStart: 0,
            contentLength: 0,
          };
          const subtitleWords = (page.subTitle || "").split(/\s+/).filter(Boolean);
          const contentWords = (page.textContent || "").split(/\s+/).filter(Boolean);

          return (
          <div
            key={index}
            className={`flex flex-col justify-center items-center p-6 h-full bg-gradient-to-b ${colorVariants[color]} relative border border-gray-300`}
            style={{ maxHeight: "100%" }}
          >
            <div className="flex-1 overflow-y-auto w-full pb-12 px-1">
              <h1 className={`font-bold mb-6 ${isAudioOnlyMode ? "text-3xl" : "text-4xl"}`}>
                {subtitleWords.map((word, wordIdx) => {
                  const globalIndex = mapping.subTitleStart + wordIdx;
                  const isHighlighted = globalIndex === highlightedWordIndex;
                  return (
                    <span
                      key={`sub-${globalIndex}`}
                      className={
                        isHighlighted
                          ? "bg-yellow-300 rounded-sm px-0.5"
                          : undefined
                      }
                    >
                      {word}
                      {wordIdx !== subtitleWords.length - 1 ? " " : ""}
                    </span>
                  );
                })}
              </h1>
              <div className="relative mx-auto w-4/5 h-96 mt-4 mb-8 border-2 border-dashed border-gray-300 rounded-md overflow-hidden bg-white/60">
                {getSafeImageSrc(page.imageUrl) ? (
                  <Image
                    src={getSafeImageSrc(page.imageUrl)}
                    alt={page.subTitle || `Page ${index + 1} illustration`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 80vw, 40vw"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-center text-sm text-gray-700 px-4">
                    Image not generated (rate limited / try again)
                  </div>
                )}
              </div>
              {!isAudioOnlyMode && (
                <p className="mt-4 text-lg leading-8 break-words">
                  {contentWords.map((word, wordIdx) => {
                    const globalIndex = mapping.contentStart + wordIdx;
                    const isHighlighted = globalIndex === highlightedWordIndex;
                    return (
                      <span
                        key={`content-${globalIndex}`}
                        className={
                          isHighlighted
                            ? "bg-yellow-300 rounded-sm px-0.5"
                            : undefined
                        }
                      >
                        {word}
                        {wordIdx !== contentWords.length - 1 ? " " : ""}
                      </span>
                    );
                  })}
                </p>
              )}
            </div>

            <span className="absolute bottom-4 right-6">Page {index + 1}</span>
          </div>
        )})}

        <div className="flex flex-col justify-center items-center p-6 h-full bg-white">
          <p className="flex justify-center items-center h-screen">
            Thank you!
          </p>
        </div>
      </HTMLFlipbook>

      <div className="mt-5 mx-auto max-w-4xl w-full flex flex-wrap items-center justify-center gap-3 rounded-lg border bg-white/80 p-3 shadow-lg">
        {/* prev */}
        <div
          className={`p-2 rounded-full hover:bg-opacity-70 bg-transparent ${
            currentPage === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={currentPage === 0 ? undefined : flipPrevPage}
        >
          <ChevronLeft
            className={`text-red-500 ${
              currentPage === 0 ? "hover:text-red-500" : "hover:text-red-700"
            }`}
          />
        </div>
        {/* home */}
        <div
          className={`p-2 rounded-full hover:bg-opacity-70 bg-transparent ${
            currentPage === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={currentPage === 0 ? undefined : flipHomePage}
        >
          <BookOpen
            className={`text-blue-500 ${
              currentPage === 0 ? "hover:text-blue-500" : "hover:text-blue-700"
            }`}
          />
        </div>
        {/* next */}
        <div
          className={`p-2 rounded-full hover:bg-opacity-70 bg-transparent ${
            currentPage >= data.chapters.length
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
          onClick={currentPage >= data.chapters.length ? undefined : flipNextPage}
        >
          <ChevronRight
            className={`text-green-500 ${
              currentPage === 0
                ? "hover:text-green-500"
                : "hover:text-green-700"
            }`}
          />
        </div>

        {/* colors */}
        {!isAudioOnlyMode && (
          <div className="flex space-x-3">
            {colors.map((color) => (
              <div
                key={color}
                className={`w-5 h-5 rounded-full cursor-pointer ${
                  color === "gray"
                    ? "bg-white border-2 border-gray-300"
                    : `bg-${color}-500`
                }`}
                onClick={() => setColor(color)}
              ></div>
            ))}
          </div>
        )}

        {canUseSpeech && (
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReadStory}
              disabled={!hasReadableText}
            >
              {isPaused ? "Resume" : "Read Story"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePauseReading}
              disabled={!isSpeaking}
            >
              Pause
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopReading}
              disabled={!isSpeaking && !isPaused}
            >
              Stop
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}



// const data = {
//   title: "3 Little Acorns Learn About AI",
//   author: "Ryan",
//   chapters: [
//     {
//       title: "A Curious Acorn",
//       content:
//         "Once upon a time, in a cozy oak tree, there were three little acorns named Oaky, Acorn, and Acorny. One day, Oaky, the most curious of the three, asked, 'What is this thing called AI that everyone keeps talking about?'",
//       imagePrompt: "A curious acorn looking up at a computer screen",
//       image: "/images/page1.jpeg",
//       page: 1,
//     },
//     {
//       title: "The Wise Old Owl",
//       content:
//         "A wise old owl, who lived in a nearby hollow, heard Oaky's question. 'AI, my young friend,' hooted the owl, 'is a clever tool that can think and learn, much like a human brain. It can solve problems, create art, and even drive cars!'",
//       imagePrompt: "A wise old owl explaining AI to the acorns",
//       image: "/images/page2.jpeg",
//       page: 2,
//     },
//     {
//       title: "Acorns Explore AI",
//       content:
//         "Intrigued, the three acorns decided to explore AI. They learned about robots that could dance and sing, and computers that could recognize faces. They even tried their hand at coding, creating simple programs that made their leaves glow.",
//       imagePrompt: "The three acorns playing with a robot",
//       image: "/images/page3.jpeg",
//       page: 3,
//     },
//     {
//       title: "A Lesson in Responsibility",
//       content:
//         "But the owl warned them, 'With great power comes great responsibility. AI can be a powerful tool, but it's important to use it wisely.' The acorns nodded, understanding the importance of using AI for good.",
//       imagePrompt: "The wise old owl talking to the acorns",
//       image: "/images/page4.jpeg",
//       page: 4,
//     },
//     {
//       title: "A Bright Future",
//       content:
//         "As the acorns grew older, they continued to learn about AI. They knew that with knowledge and responsibility, they could use AI to make the world a better place. And so, they set off on their adventure, ready to embrace the future.",
//       imagePrompt:
//         "The three acorns looking up at the sky, excited for the future",
//       image: "/images/page1.jpeg",
//       page: 5,
//     },
//   ],
// };
