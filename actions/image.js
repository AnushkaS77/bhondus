"use server";

import Replicate from "replicate";
import { v2 as cloudinary } from "cloudinary";
import { nanoid } from "nanoid";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Replicate SDXL output size (multiples of 8). Tuned to match bookview.js only
 * (cover: full width × 75% page height; chapters: 80% width × h-96) so object-cover
 * crops less. Display markup is unchanged.
 */
const IMAGE_GEN_SIZE = {
  cover: { width: 1024, height: 912 }, // ~ page W : 0.75H on typical flipbook spread
  chapter: { width: 1024, height: 640 }, // ~ w-4/5 × 384px (h-96) on a ~800px-wide page
};

function withTimeout(promise, ms = 120000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), ms)
    ),
  ]);
}

async function withRetry(task, retries = 1) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task();
    } catch (err) {
      lastError = err;
      const message = String(err?.message || "");
      const isRateLimited = message.includes("status 429");
      if (isRateLimited) {
        const retryAfterMatch = message.match(/"retry_after"\s*:\s*(\d+)/);
        const retryAfterSeconds = retryAfterMatch
          ? Number(retryAfterMatch[1])
          : 8;
        await new Promise((resolve) =>
          setTimeout(resolve, (retryAfterSeconds + 1) * 1000)
        );
      }
      if (attempt === retries) throw err;
    }
  }
  throw lastError;
}

async function toBuffer(outputItem) {
  if (!outputItem) return null;

  if (typeof outputItem === "string") {
    const response = await withTimeout(fetch(outputItem), 45000);
    return Buffer.from(await response.arrayBuffer());
  }

  if (outputItem?.url && typeof outputItem.url === "function") {
    const response = await withTimeout(fetch(outputItem.url()), 45000);
    return Buffer.from(await response.arrayBuffer());
  }

  const arrayBuffer = await new Response(outputItem).arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("TIMEOUT"));
    }, 45000);

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "ai_kids_book",
        public_id: nanoid(),
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(buffer);
  });
}

async function generateWithReplicate(prompt, sizeKey = "chapter") {
  const model =
    "bytedance/sdxl-lightning-4step:6f7a773af6fc3e8de9d5a3c00be77c17308914bf67772726aff83496ba1e3bbe";

  const { width, height } = IMAGE_GEN_SIZE[sizeKey] || IMAGE_GEN_SIZE.chapter;

  const output = await withRetry(
    () =>
      withTimeout(
        replicate.run(model, {
          input: {
            prompt,
            negative_prompt:
              "multiple different animals, rabbits, duplicate characters, extra characters, wrong species, wrong colors, inconsistent design, unrelated subjects, collage, text, watermark",
            width,
            height,
            scheduler: "K_EULER",
            num_outputs: 1,
            guidance_scale: 5,
            num_inference_steps: 8,
          },
        }),
        120000
      ),
    2
  );

  const firstOutput = output?.[0];
  if (!firstOutput) throw new Error("Replicate returned no image");
  return toBuffer(firstOutput);
}

/**
 * @param {string} prompt
 * @param {"cover" | "chapter"} [sizeKey] - matches bookview image frames (no UI changes).
 */
export async function generateImageAi(prompt, sizeKey = "chapter") {
  try {
    const buffer = await generateWithReplicate(prompt, sizeKey);

    if (!buffer) return { success: false, error: "Image generation failed" };

    const uploadResult = await uploadBufferToCloudinary(buffer);

    return {
      success: true,
      url: uploadResult.secure_url,
    };
  } catch (err) {
    const message = String(err?.message || "");

    if (message === "TIMEOUT") {
      return {
        success: false,
        error: "TIMEOUT",
      };
    }

    const lower = message.toLowerCase();
    const isTooManyRequests =
      lower.includes("429") ||
      lower.includes("too many requests") ||
      lower.includes("rate limit") ||
      lower.includes("status 429");

    if (isTooManyRequests) {
      return {
        success: false,
        error: "TOO_MANY_REQUESTS",
      };
    }

    console.error("generateImageAi error:", err.message);

    return {
      success: false,
      error: "IMAGE_FAILED",
    };
  }
}
