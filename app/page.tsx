import { Hero } from "@/components/landing/hero"
import { RoiStats } from "@/components/landing/roi-stats"
import { InstitutionsSection } from "@/components/landing/institutions-section"
import { InteractiveExamPreview } from "@/components/landing/interactive-exam-preview"
import { FeaturesGrid } from "@/components/landing/features-grid"
import { LicensingSection } from "@/components/landing/licensing-section"
import { Testimonials } from "@/components/landing/testimonials"
import { FaqSection } from "@/components/landing/faq-section"
import { CtaBanner } from "@/components/landing/cta-banner"

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* 1. Hero Section with dynamic mockup and dual CTAs */}
      <Hero />

      {/* 2. Key Institutional Metrics & Credibility Bar */}
      <RoiStats />

      {/* 3. Dedicated Solutions for Coaching Centers, Schools & Colleges */}
      <InstitutionsSection />

      {/* 4. Live Interactive Test Engine Simulator */}
      <InteractiveExamPreview />

      {/* 5. Core Platform Features Grid */}
      <FeaturesGrid />

      {/* 6. Transparent Subscriptions & Institutional Licensing */}
      <LicensingSection />

      {/* 7. Institutional Testimonials & Social Proof */}
      <Testimonials />

      {/* 8. Frequently Asked Questions */}
      <FaqSection />

      {/* 9. Final High-Impact Conversion Banner */}
      <CtaBanner />
    </main>
  )
}
