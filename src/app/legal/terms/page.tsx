import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/back-link";
import {
  LEGAL_COMPANY_NUMBER,
  LEGAL_CONTACT_EMAIL,
  LEGAL_OPERATOR_NAME,
  LEGAL_REGISTERED_OFFICE,
  LEGAL_VERSION,
} from "@/lib/legal-version";

export const metadata: Metadata = {
  title: "Terms of Service — REEFxCHANGE",
  description: "Terms of Service for REEFxCHANGE, the reef hobbyist discovery platform (England and Wales).",
};

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-4 py-8 sm:px-6 sm:py-12">
      <BackLink href="/auth/login" variant="text" className="text-blue-700">
        Back to sign in
      </BackLink>
      <article className="rounded-2xl border border-slate-200/80 bg-white p-5 text-slate-600 shadow-sm sm:p-7">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">
          Effective date: {LEGAL_VERSION}. These Terms apply to REEFxCHANGE (the &quot;Service&quot;). For how we use personal
          data, see our{" "}
          <Link href="/legal/privacy" className="font-medium text-blue-700 hover:underline">
            Privacy notice
          </Link>
          .
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">1. Who we are</h2>
          <p>
            The Service is operated by <strong className="font-medium text-slate-800">{LEGAL_OPERATOR_NAME}</strong>{" "}
            (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Registered office: {LEGAL_REGISTERED_OFFICE}</li>
            <li>Company number (if applicable): {LEGAL_COMPANY_NUMBER}</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">2. Agreement</h2>
          <p>
            By creating or using an account, accessing the Service, or ticking acceptance during onboarding, you agree
            to these Terms. If you do not agree, do not use the Service. We may refuse access where the law allows.
          </p>
          <p>
            Where you are a consumer, nothing in these Terms affects your statutory rights under UK law (including the
            Consumer Rights Act 2015), except where the law permits those rights to be limited or excluded.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-600">
            We help you discover reef listings and chat; deals are between you and other users, not us.
          </p>
          <h2 className="text-base font-semibold text-slate-900">3. The Service</h2>
          <p>
            REEFxCHANGE is an online platform that helps reef aquarium hobbyists discover listings and connect with others. We
            provide software, discovery features, and related tools. The Service is offered in <strong>Beta</strong>:
            functionality, performance, and availability may change or be interrupted without notice.
          </p>
          <p>
            <strong>Listings and trades are between users.</strong> We are not a buyer, seller, broker, auctioneer,
            carrier, insurer, or agent for you or other users. We do not guarantee that any listing is accurate, lawful,
            available, or suitable. You are responsible for your own decisions, including compliance with animal
            welfare, import/export, licensing, and other laws that may apply to corals or related goods.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-600">
            For-sale listings are external only; REEFxCHANGE does not process payment or delivery.
          </p>
          <h2 className="text-base font-semibold text-slate-900">3A. External sale listings</h2>
          <p>
            Where users mark items as &quot;for sale&quot;, REEFxCHANGE only displays listing details and an external URL. Any
            purchase, payment, shipping, collection, refund, or dispute happens outside REEFxCHANGE directly between users.
          </p>
          <p>
            We do not act as merchant of record, payment service provider, escrow agent, marketplace intermediary, or
            dispute resolver. Buyers and sellers are solely responsible for checking legitimacy, legality, and suitability
            of any external sale.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-600">
            Be 18 or over, keep your details honest, and protect your email and password.
          </p>
          <h2 className="text-base font-semibold text-slate-900">4. Eligibility and accounts</h2>
          <p>
            You must be at least <strong>18</strong> years old to use the Service. You must provide accurate information
            and keep your account details up to date where we ask you to.
          </p>
          <p>
            You may sign in using methods we make available (for example magic-link email and/or password). You must
            keep any password confidential and protect access to your email account. Tell us promptly at{" "}
            <span className="font-medium text-slate-800">{LEGAL_CONTACT_EMAIL}</span> if you suspect unauthorised use.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-600">
            Use REEFxCHANGE lawfully: no fraud, abuse, hacking, scraping, or illegal trades.
          </p>
          <h2 className="text-base font-semibold text-slate-900">5. Acceptable use</h2>
          <p>You agree that you will not:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>use the Service for anything unlawful, fraudulent, or harmful;</li>
            <li>harass, threaten, defame, or discriminate against others;</li>
            <li>upload malware, attempt to break security, or disrupt the Service;</li>
            <li>scrape, harvest, or automate access to the Service in breach of these Terms or applicable law;</li>
            <li>misrepresent your identity, listings, or affiliation;</li>
            <li>use the Service to trade items or species where that trade is unlawful or restricted.</li>
          </ul>
          <p>We may investigate suspected misuse and cooperate with authorities where required.</p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-600">
            You are responsible for what you post; we may host it or remove it if needed.
          </p>
          <h2 className="text-base font-semibold text-slate-900">6. Listings and your content</h2>
          <p>
            You are responsible for content you post (including text, images, and descriptions). You must have the
            rights to post it and it must comply with these Terms and the law.
          </p>
          <p>
            You grant us a non-exclusive, worldwide, royalty-free licence to host, store, reproduce, display, and
            distribute your content as reasonably necessary to run, promote, and improve the Service.
          </p>
          <p>
            We may remove or restrict content, or suspend access, where we reasonably believe there is a breach of these
            Terms, a legal risk, or a safety issue. We are not obliged to monitor all content.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-600">
            REEFxCHANGE branding and software belong to us; your content stays yours.
          </p>
          <h2 className="text-base font-semibold text-slate-900">7. Intellectual property</h2>
          <p>
            REEFxCHANGE name, branding, logos, and the Service software are owned by us or our licensors. Except for the
            limited rights these Terms grant you, no rights are transferred to you.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-600">
            Other companies may power parts of the service; we do not control external links.
          </p>
          <h2 className="text-base font-semibold text-slate-900">8. Third-party services</h2>
          <p>
            The Service may rely on third parties (for example email delivery or hosting). Their terms and privacy
            practices apply to their services. We do not control and are not responsible for third-party sites or
            services linked from the Service.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-600">
            The service is as-is; our liability is capped where UK law allows.
          </p>
          <h2 className="text-base font-semibold text-slate-900">9. Liability</h2>
          <p>
            The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the fullest extent
            permitted by law, we disclaim warranties of any kind (including fitness for a particular purpose and
            non-infringement).
          </p>
          <p>
            We do not exclude or limit liability where it would be unlawful to do so. This includes liability for death
            or personal injury caused by our negligence, or for fraud or fraudulent misrepresentation.
          </p>
          <p>
            Subject to the previous paragraph, we will not be liable for any indirect or consequential loss, or for loss
            of profit, goodwill, data, or business. Our total liability to you for all claims arising from or related to
            the Service in any 12-month period is limited to <strong>£100</strong>, except where a higher minimum
            applies by law.
          </p>
          <p>
            You use the Service and arrange any in-person or off-platform dealings with other users at your own risk.
            We are not responsible for disputes between users, the quality or legality of items, or non-payment.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-600">
            If you break the rules and we suffer loss, you may need to cover reasonable costs.
          </p>
          <h2 className="text-base font-semibold text-slate-900">10. Your responsibility for losses we suffer</h2>
          <p>
            To the extent permitted by law, you agree to reimburse us for reasonable losses, damages, and costs (including
            reasonable legal fees) that we incur because of your breach of these Terms or your unlawful use of the
            Service, where that is fair under the Consumer Rights Act 2015 and related law.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-600">
            We can suspend or close access for serious issues; you can stop using REEFxCHANGE anytime.
          </p>
          <h2 className="text-base font-semibold text-slate-900">11. Suspension and termination</h2>
          <p>
            We may suspend or terminate your access if you breach these Terms, if we must comply with law, or to
            protect users or the Service. You may stop using the Service at any time. Provisions that should survive
            (including intellectual property, liability where allowed, and governing law) continue after termination.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-600">
            We may update these Terms online and tell you when changes are important.
          </p>
          <h2 className="text-base font-semibold text-slate-900">12. Changes to these Terms</h2>
          <p>
            We may update these Terms by posting a new version on this page with a new effective date. If we make
            material changes, we may also notify you by email or in-product notice where appropriate. Continued use
            after the effective date may constitute acceptance; if we require fresh acceptance, we will make that clear
            in the product.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-600">
            English law applies; courts are mainly in England and Wales, with consumer protections.
          </p>
          <h2 className="text-base font-semibold text-slate-900">13. Governing law and jurisdiction</h2>
          <p>
            These Terms are governed by the law of <strong>England and Wales</strong>. If you are a consumer resident
            in the UK, you may bring proceedings in the courts of England and Wales, or in the courts of the country where
            you live if mandatory rules give you that right. If you are a business, the courts of England and Wales have
            exclusive jurisdiction.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">14. Contact</h2>
          <p>
            Questions about these Terms: <span className="font-medium text-slate-800">{LEGAL_CONTACT_EMAIL}</span>
          </p>
        </section>
      </article>
    </main>
  );
}
