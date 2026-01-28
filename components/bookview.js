"use client";
import React, { useState, useLayoutEffect, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import HTMLFlipbook from "react-pageflip";
import { Button } from "@/components/ui/button";
import { Book, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { speakText, stopSpeaking, isSpeechSupported } from "@/utils/textToSpeech";

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

const FALLBACK_IMAGE = "/images/stories.png";

const getSafeImageSrc = (src) => {
  if (!src) return FALLBACK_IMAGE;
  if (src.startsWith("/")) return src;

  try {
    const { hostname } = new URL(src);
    if (allowedImageHosts.has(hostname)) {
      return src;
    }
  } catch (err) {
    console.warn("Invalid image URL provided to getSafeImageSrc", src, err);
  }

  return FALLBACK_IMAGE;
};

export default function BookView({ data }) {
  const bookRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [key, setKey] = useState(0);
  const [color, setColor] = useState("gray");
  const [canUseSpeech, setCanUseSpeech] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const fullStoryText =
    data?.chapters?.map((chapter) => chapter.textContent).join(" ") || "";

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
      stopSpeaking();
    };
  }, []);

  const handleReadStory = () => {
    if (!canUseSpeech || !fullStoryText) return;

    // Make sure we never overlap speech
    stopSpeaking();

    const utterance = speakText(fullStoryText);
    if (!utterance) return;

    setIsSpeaking(true);

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
  };

  const handleStopReading = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  if (dimensions.width === 0) return null;

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
          <Image
            src={getSafeImageSrc(data?.bookCoverUrl)}
            alt={data?.bookTitle || "Book cover"}
            fill
            className="object-cover rounded-md"
            priority
          />
          <h1 className="flex justify-center items-center h-screen text-4xl font-bold text-center text-white">
            {data.bookTitle}
          </h1>
        </div>

        <div className="flex flex-col justify-center items-center p-6 h-full">
          <h1 className="flex justify-center items-center h-screen text-center">
            By {data.author.name}
          </h1>
        </div>

        {data.chapters.map((page, index) => (
          <div
            key={index}
            className={`flex flex-col justify-center items-center p-6 h-full bg-gradient-to-b ${colorVariants[color]} relative`}
            style={{ maxHeight: "100%" }}
          >
            <div className="flex-1 overflow-y-auto">
              <h1 className="text-4xl font-bold mb-6">{page.subTitle}</h1>
              <div className="relative w-full h-96 mt-4 mb-12">
                <Image
                  src={getSafeImageSrc(page.imageUrl)}
                  alt={page.subTitle}
                  fill={true}
                  style={{ ovjectFit: "cover" }}
                  className="rounded shadow"
                />
              </div>
              <p className="mt-4 text-lg">{page.textContent}</p>
            </div>

            <span className="absolute bottom-4 right-6">Page {index + 1}</span>
          </div>
        ))}

        <div className="flex flex-col justify-center items-center p-6 h-full bg-white">
          <p className="flex justify-center items-center h-screen">
            Thank you!
          </p>
        </div>
      </HTMLFlipbook>

      <div className="items-center fixed bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4 bg-opacity-50 p-2 rounded-lg shadow-lg">
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

        {canUseSpeech && (
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReadStory}
              disabled={isSpeaking || !fullStoryText}
            >
              Read Story
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopReading}
              disabled={!isSpeaking}
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
