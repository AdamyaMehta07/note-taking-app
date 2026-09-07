import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Share notes with <span className="text-orange-600">confidence</span>
      </h1>
      <p className="mt-4 max-w-md text-neutral-600">
        Create a note, generate a secure link, and control exactly how and
        for how long it can be viewed - one-time, time-based, public, or
        password-protected.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/register">
          <Button variant="accent" size="lg">
            Get Started
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" size="lg">
            Login
          </Button>
        </Link>
      </div>
    </div>
  );
}
