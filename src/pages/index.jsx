import { useHead } from "adex/head";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  useHead({
    title: "FeedIt — RSS & Atom Feed Reader",
    language: "en",
    metas: [
      { name: "description", content: "FeedIt is a clean, minimal RSS and Atom feed reader. Subscribe to any feed, stay on top of what matters, without the noise." },
      { property: "og:title", content: "FeedIt — RSS & Atom Feed Reader" },
      { property: "og:description", content: "FeedIt is a clean, minimal RSS and Atom feed reader. Subscribe to any feed, stay on top of what matters, without the noise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "FeedIt — RSS & Atom Feed Reader" },
      { name: "twitter:description", content: "FeedIt is a clean, minimal RSS and Atom feed reader. Subscribe to any feed, stay on top of what matters, without the noise." },
    ],
  });

  return (
    <div class="bg-white text-[#0a0a0a] min-h-screen flex flex-col">
      <main class="flex-1 flex flex-col justify-center items-center px-6 py-24 text-center">
        <section aria-labelledby="hero-heading">
          <p class="text-xs tracking-widest uppercase text-neutral-400 mb-4">
            RSS &amp; Atom Reader
          </p>
          <h1 id="hero-heading" class="text-4xl font-semibold tracking-tight text-[#0a0a0a] mb-4">
            FeedIt
          </h1>
          <p class="text-base text-neutral-500 max-w-sm mx-auto mb-8 leading-relaxed">
            A minimal feed reader for the web. Subscribe to RSS and Atom feeds,
            read what matters, skip the rest.
          </p>
          <div class="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a class={cn(buttonVariants())} href="/sign-up">
              Get Started &rarr;
            </a>
            <a
              class={cn(
                buttonVariants({ variant: "outline" }),
                "border-[#0a0a0a]/20 text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white"
              )}
              href="/login"
            >
              Log in
            </a>
          </div>
        </section>

        <section aria-label="Features" class="mt-20 border-t border-[#e5e5e5] pt-12 w-full max-w-xl">
          <ul class="flex flex-col gap-5 text-left">
            <li class="flex gap-3 items-start">
              <span class="w-1 h-1 rounded-full bg-[#0a0a0a] flex-shrink-0 mt-2" />
              <span class="text-sm text-neutral-600">
                <span class="font-medium text-[#0a0a0a]">Any RSS or Atom feed.</span>{" "}
                Paste a URL and you're reading in seconds.
              </span>
            </li>
            <li class="flex gap-3 items-start">
              <span class="w-1 h-1 rounded-full bg-[#0a0a0a] flex-shrink-0 mt-2" />
              <span class="text-sm text-neutral-600">
                <span class="font-medium text-[#0a0a0a]">Unread tracking.</span>{" "}
                See exactly what's new since you last checked.
              </span>
            </li>
            <li class="flex gap-3 items-start">
              <span class="w-1 h-1 rounded-full bg-[#0a0a0a] flex-shrink-0 mt-2" />
              <span class="text-sm text-neutral-600">
                <span class="font-medium text-[#0a0a0a]">No clutter.</span>{" "}
                Clean reading interface, no ads, no algorithms.
              </span>
            </li>
          </ul>
        </section>
      </main>

      <footer class="border-t border-[#e5e5e5] px-6 py-5 text-center">
        <p class="text-xs text-neutral-400">
          &copy; {new Date().getFullYear()} FeedIt
        </p>
      </footer>
    </div>
  );
}
