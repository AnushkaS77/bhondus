import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-purple-200">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold text-purple-900 leading-tight">
            SPARK YOUR CHILD'S IMAGINATION!
          </h1>
          <p className="text-lg text-purple-800">
            Create fun and personalized stories that bring your child's
            adventures to life and spark their passion for reading - in only a
            few clicks!
          </p>
          <div className="flex gap-4">
            <Link href="/dashboard/generate-book">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                Create Stories for Free
              </Button>
            </Link>
          </div>
          <p className="text-sm text-purple-700">
            Join 150,000+ other families using Story Tailor to cultivate their
            child's passion for reading.
          </p>
        </div>
        <div className="flex-1">
          <Image
            src="/images/page4.jpeg"
            alt="Magical Book Illustration"
            width={500}
            height={400}
            className="w-full h-auto rounded-3xl shadow-lg"
          />
        </div>
      </section>

      {/* Steps Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-purple-500/95" />
        <div className="container relative mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            EASY TO GET STARTED
          </h2>
          <div className="max-w-3xl mx-auto">
            <Link href="/dashboard/generate-book">
              <Image
                src="/images/create-form.png"
                alt="Story Creation Form"
                width={900}
                height={500}
                className="w-full rounded-xl shadow-xl"
                priority
              />
            </Link>
            <div className="text-center mt-8">
              <Link href="/dashboard/generate-book">
                <Button
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-white/90"
                >
                  Try it now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* spacer section (image removed for cleaner flow) */}
      <section className="h-16 bg-purple-300" />

      <section className="py-24 bg-gradient-to-b from-purple-300 to-purple-500">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-14 text-center bg-clip-text bg-gradient-to-r from-purple-400 to-purple-900">
            HOW IT WORKS
          </h2>
          <div className="grid md:grid-cols-3 gap-10 md:gap-12">
            {works.map((step, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center rounded-2xl bg-white/30 px-4 py-6"
              >
                <GradientIcon imageSrc={step.image} />
                <h3 className="text-2xl md:text-3xl font-semibold mb-3">{step.title}</h3>
                <p className="text-base md:text-lg">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* spacer section (image removed for cleaner flow) */}
      <section className="h-16 bg-purple-400" />

      {/* Our stories */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0" />
        <div className="container relative mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            EXPLORE OUR STORIES
          </h2>
          <div className="max-w-3xl mx-auto">
            <Link href="/books">
              <Image
                src="/images/stories.png"
                alt="Story Creation Form"
                width={800}
                height={400}
                className="w-full rounded-xl shadow-xl"
                priority
              />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-purple-900 mb-8">
            WHAT OUR COMMUNITY IS SAYING
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {reviews.map((user, i) => (
              <Card key={i} className="bg-purple-500 text-white">
                <CardContent className="p-6">
                  <p className="italic">{user.testimonial}</p>
                  <p className="mt-4 font-bold">{user.name}</p>
                  <p className="text-sm">{user.location}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link href="/dashboard/generate-book">
              <Button
                variant="outline"
                className="border-purple-600 text-purple-600"
              >
                SIGN UP AND START CREATING STORIES!
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const works = [
  {
    image: "/icons/ideas.png",
    title: "1. Book Idea",
    description: "Start with your book idea and the number of pages",
  },
  {
    image: "/icons/generation.png",
    title: "2. AI Generation",
    description: "Our AI generates entire book with chapters and images",
  },
  {
    image: "/icons/publish.png",
    title: "3. Publish",
    description: "View and share your books with your kids and family",
  },
];

const reviews = [
  {
    name: "Unmesha",
    location: "Los Angeles, CA",
    testimonial: `"Thank you! I love that in just a few clicks I can create a personalized story for my children that they absolutely love!"`,
  },
  {
    name: "Varsha",
    location: "Sydney, Australia",
    testimonial: `"This tool is amazing! My son was thrilled to see a story featuring his name and favorite animals. It's like magic!"`,
  },
  {
    name: "Sachin",
    location: "London, UK",
    testimonial: `"I can't believe this is free! The stories are creative, fun, and my daughter can't stop reading them. Highly recommend it!"`,
  },
];

const GradientIcon = ({ imageSrc }) => (
  <div className="relative w-24 h-24 md:w-28 md:h-28 mb-5">
    <img
      src={imageSrc}
      alt="Step icon"
      className="w-full h-full object-contain"
    />
  </div>
);
