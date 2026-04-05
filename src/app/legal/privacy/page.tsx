import type { Metadata } from "next";
import Link from "next/link";
import {
  LEGAL_COMPANY_NUMBER,
  LEGAL_CONTACT_EMAIL,
  LEGAL_DPO_NAME,
  LEGAL_OPERATOR_NAME,
  LEGAL_REGISTERED_OFFICE,
  LEGAL_VERSION,
} from "@/lib/legal-version";

export const metadata: Metadata = {
  title: "Privacy notice — REEFX",
  description: "How Furryflitchers Limited processes personal data when you use REEFX.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/auth/login" className="text-sm font-semibold text-blue-700 hover:underline">
        ← Back to sign in
      </Link>
      <article className="rounded-2xl border border-slate-200/80 bg-white p-5 text-slate-600 shadow-sm sm:p-7">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Privacy notice</h1>
        <p className="mt-2 text-sm text-slate-500">
          Effective date: {LEGAL_VERSION}. This notice describes how{" "}
          <strong className="font-medium text-slate-800">{LEGAL_OPERATOR_NAME}</strong> (&quot;we&quot;, &quot;us&quot;,
          &quot;our&quot;) uses personal data when you use <strong className="font-medium text-slate-800">REEFX</strong>{" "}
          (the &quot;Service&quot;). Our{" "}
          <Link href="/legal/terms" className="font-medium text-blue-700 hover:underline">
            Terms of Service
          </Link>{" "}
          apply to your use of the Service.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">1. Who we are</h2>
          <p>
            For UK data protection law, we are the <strong className="font-medium text-slate-800">data controller</strong>{" "}
            for personal data processed through the Service.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Legal entity: <strong className="font-medium text-slate-800">{LEGAL_OPERATOR_NAME}</strong>
            </li>
            <li>Registered office: {LEGAL_REGISTERED_OFFICE}</li>
            <li>Company number (if applicable): {LEGAL_COMPANY_NUMBER}</li>
            <li>
              Contact (including privacy questions):{" "}
              <span className="font-medium text-slate-800">{LEGAL_CONTACT_EMAIL}</span>
            </li>
            <li>
              Data Protection Officer: <span className="font-medium text-slate-800">{LEGAL_DPO_NAME}</span> (contact us
              at the email above, marking your message for the DPO where helpful).
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-500">
            When and where this notice applies to your use of REEFX.
          </p>
          <h2 className="text-base font-semibold text-slate-900">2. Scope</h2>
          <p>
            This notice covers personal data we process when you visit the Service, create or use an account, complete
            onboarding, join or take part in exchanges (events or groups), list corals, arrange trades, or contact us. It
            does not cover third-party websites or apps that we link to; those services have their own notices.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-500">
            The types of personal information we may collect when you use the service.
          </p>
          <h2 className="text-base font-semibold text-slate-900">3. Data we collect</h2>
          <p>Depending on how you use the Service, we may process:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="font-medium text-slate-800">Account and profile:</strong> email address, optional
              display name or alias, optional profile image or emoji, contact preferences, onboarding choices, and
              related account metadata.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Address and location context:</strong> postal address fields
              you provide (for example line, town, region, postcode, country). We may derive approximate town-centre
              coordinates from town and country to support coarse distance or discovery features; we do not use this as a
              precise map of your home.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Security and sign-in:</strong> session identifiers (stored
              in hashed form where applicable), magic-link request details, and limited technical data such as request
              timestamps or IP address associated with authentication events.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Your content:</strong> text, images, and descriptions you add
              to listings or profile inventory (for example coral names and notes).
            </li>
            <li>
              <strong className="font-medium text-slate-800">Exchanges, invites, and trades:</strong> membership of
              exchanges, roles (such as member or event manager), invite records (including invitee email), and
              information needed to operate trades between members on an exchange.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Legal and compliance records:</strong> timestamps and
              version references when you accept our Terms or this notice.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Platform administration:</strong> where permitted by law,
              audit-style records of certain administrative actions taken by our team to operate or secure the platform.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Analytics and similar technologies:</strong> usage and
              diagnostic information collected through Google Analytics and similar tools, which may include device and
              browser data, approximate location, and on-site behaviour (subject to your cookie choices where
              applicable).
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-500">
            Why we use your data and the main things we do with it.
          </p>
          <h2 className="text-base font-semibold text-slate-900">4. How we use your data</h2>
          <p>We use personal data to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>provide, operate, and improve the Service (accounts, discovery, listings, exchanges, trades);</li>
            <li>authenticate you, protect accounts, detect abuse, and maintain security;</li>
            <li>send service emails (for example sign-in links and operational messages) via our email provider;</li>
            <li>validate or complete address information using our postcode lookup provider;</li>
            <li>
              optionally assist with listing content using artificial intelligence features powered by our LLM
              provider (where enabled in the product);
            </li>
            <li>measure use of the Service and improve performance and design (analytics);</li>
            <li>comply with law, respond to lawful requests, and enforce our Terms;</li>
            <li>keep records of consent and legal acceptance where required.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-500">
            The legal grounds that let us process your data under UK privacy law.
          </p>
          <h2 className="text-base font-semibold text-slate-900">5. Legal bases (UK GDPR)</h2>
          <p>Where UK GDPR applies, we rely on one or more of the following:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="font-medium text-slate-800">Contract</strong> — to provide the Service you asked for.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Legitimate interests</strong> — for example securing the
              Service, understanding aggregate usage, product improvement, and limited administrative access as
              described below, where not overridden by your rights.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Legal obligation</strong> — where we must process data to
              comply with law.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Consent</strong> — where we ask for it (for example
              non-essential cookies or specific optional features), you may withdraw consent at any time without
              affecting earlier processing that was lawful.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-500">
            Who we share data with to run REEFX, and that we never sell it.
          </p>
          <h2 className="text-base font-semibold text-slate-900">6. Sharing, subprocessors, and sales</h2>
          <p>
            <strong className="font-medium text-slate-800">We do not sell your personal data.</strong> We do not share
            your personal data with third parties for their own independent marketing in exchange for money.
          </p>
          <p>
            We share data with service providers who process it on our instructions (&quot;processors&quot; /
            subprocessors) to run the Service. They must protect the data and use it only for the services they provide
            to us. Current categories include:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="font-medium text-slate-800">Hostinger</strong> — hosting and infrastructure.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Mailtrap</strong> — email delivery and related messaging
              infrastructure.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Ideal Postcodes</strong> — address lookup and validation.
            </li>
            <li>
              <strong className="font-medium text-slate-800">OpenAI</strong> — large language model features used for
              optional product functionality (for example assisting with coral descriptions), where implemented.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Google</strong> — analytics and related measurement tools
              (for example Google Analytics).
            </li>
          </ul>
          <p>
            We may also disclose data if required by law, to protect rights and safety, or as part of a business
            transfer (for example merger or asset sale) subject to appropriate safeguards.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-500">
            What organisers and our staff may see compared with everyday members.
          </p>
          <h2 className="text-base font-semibold text-slate-900">7. Exchange operators and platform administrators</h2>
          <p>
            <strong className="font-medium text-slate-800">Exchange operators.</strong> People who create or manage an
            exchange (for example event managers) may see limited information about members and activity needed to run
            that exchange — such as membership, roles, listings visible within the exchange, and trade-related
            information tied to that exchange. They should use that information only for legitimate exchange-related
            purposes.
          </p>
          <p>
            <strong className="font-medium text-slate-800">Platform administrators.</strong> Our authorised staff may
            access personal data to operate, secure, and support the Service (for example troubleshooting, fraud
            prevention, and audit trails). Access is limited to what is reasonably needed for those purposes.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-500">
            What happens if your data is stored or processed outside the United Kingdom.
          </p>
          <h2 className="text-base font-semibold text-slate-900">8. International transfers</h2>
          <p>
            We are based in the United Kingdom. Some subprocessors may process data in other countries. Where personal
            data is transferred outside the UK or EEA, we use appropriate safeguards required by applicable law (for
            example adequacy regulations or standard contractual clauses), and we assess risks where required.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-500">
            How long we keep your information and when we remove or anonymise it.
          </p>
          <h2 className="text-base font-semibold text-slate-900">9. Retention</h2>
          <p>
            We keep personal data only as long as needed for the purposes in this notice, including providing the
            Service, meeting legal, tax, or accounting requirements, resolving disputes, and securing our systems.
            Retention periods vary by data type; for example account data is generally kept while your account exists,
            and some records may be kept longer where the law requires backups or audit trails. We delete or anonymise
            data when it is no longer needed, unless a longer period is justified.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-500">
            How we protect your data and simple steps you can take to stay safer.
          </p>
          <h2 className="text-base font-semibold text-slate-900">10. Security</h2>
          <p>
            We use appropriate technical and organisational measures designed to protect personal data against
            unauthorised access, loss, or alteration. No online service can guarantee perfect security; please use a
            strong password where applicable and protect access to your email account used for sign-in.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-500">
            Your choices under UK law: access, fixes, deletion, and how to complain.
          </p>
          <h2 className="text-base font-semibold text-slate-900">11. Your rights</h2>
          <p>Under UK data protection law you may have rights including to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>access a copy of your personal data;</li>
            <li>ask us to correct inaccurate data;</li>
            <li>ask us to erase data in certain circumstances;</li>
            <li>restrict or object to certain processing;</li>
            <li>data portability for information you provided, where applicable;</li>
            <li>withdraw consent where processing is based on consent;</li>
            <li>lodge a complaint with the ICO (Information Commissioner&apos;s Office) in the UK.</li>
          </ul>
          <p>
            To exercise your rights, contact us at{" "}
            <span className="font-medium text-slate-800">{LEGAL_CONTACT_EMAIL}</span>. We may need to verify your
            identity before responding.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-500">
            REEFX is for adults aged 18 and over; we do not target children here.
          </p>
          <h2 className="text-base font-semibold text-slate-900">12. Children</h2>
          <p>
            The Service is not intended for anyone under <strong className="font-medium text-slate-800">18</strong>. We
            do not knowingly collect personal data from children. If you believe we have collected data from a child,
            contact us and we will take appropriate steps.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-500">
            Cookies and similar tools for running the site and measuring usage overall.
          </p>
          <h2 className="text-base font-semibold text-slate-900">13. Cookies and similar technologies</h2>
          <p>
            We use cookies and similar technologies that are necessary for the Service to function, and where applicable
            analytics tools (such as Google Analytics) that may use cookies or identifiers. Where required, we will ask
            for your consent before using non-essential cookies and provide a way to change your preferences.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-lg font-bold leading-snug text-slate-500">
            How we will tell you if we update this notice or ask you to read it again.
          </p>
          <h2 className="text-base font-semibold text-slate-900">14. Changes to this notice</h2>
          <p>
            We may update this notice from time to time. We will post the updated version on this page and change the
            effective date above. If changes are material, we will take additional steps where required (for example
            asking you to accept an updated notice during onboarding or in-product prompts).
          </p>
        </section>
      </article>
    </main>
  );
}
