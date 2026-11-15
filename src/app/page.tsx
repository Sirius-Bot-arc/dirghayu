
import Logo from '@/components/Logo';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const elderSections = [
  {
    icon: '💊',
    title: 'My Medicines',
    description: 'View your medicines and their schedules.',
    href: '/medicines',
    action: 'View medicines',
  },
  {
    icon: '📅',
    title: 'Appointments',
    description: 'Keep your doctor visits organised.',
    href: '/appointments',
    action: 'View appointments',
  },
  {
    icon: '✨',
    title: 'Medicine Help',
    description: 'Understand your medicines with AI assistance.',
    href: '/medicine-help',
    action: 'Explore medicine help',
  },
  {
    icon: '📋',
    title: 'Health Summary',
    description: 'Prepare a summary for your next doctor visit.',
    href: '/summary',
    action: 'View summary',
  },
  {
    icon: '🛡️',
    title: 'Privacy & Consent',
    description: 'Learn how your health information is handled.',
    href: '/privacy',
    action: 'View privacy',
  },
];

const caretakerSections = [
  {
    icon: '💊',
    title: 'Medicine Management',
    description: 'View medicines and propose changes for elder approval.',
    href: '/medicines',
    action: 'Manage medicines',
  },
  {
    icon: '📅',
    title: 'Appointments',
    description: 'Organise doctor visits and propose appointment changes.',
    href: '/appointments',
    action: 'Manage appointments',
  },
  {
    icon: '📋',
    title: 'Health Summary',
    description: 'Review available health and adherence information.',
    href: '/summary',
    action: 'View summary',
  },
];

const familySections = [
  {
    icon: '💊',
    title: 'Shared Medicines',
    description: 'View medication information shared with you.',
    href: '/medicines',
    action: 'View medicines',
  },
  {
    icon: '📅',
    title: 'Appointments',
    description: 'Keep up with appointments shared with you.',
    href: '/appointments',
    action: 'View appointments',
  },
  {
    icon: '📋',
    title: 'Health Overview',
    description: 'View health information available to you.',
    href: '/summary',
    action: 'View health summary',
  },
];

export default async function Home() {
  const session = await getSession();
  if (!session) {
  redirect('/login');
}

  // Keep the existing elder dashboard as the fallback.
  const role = session?.role ?? 'elder';

  const isCaretaker = role === 'caretaker';
  const isFamily = role === 'family';

  const sections = isCaretaker
    ? caretakerSections
    : isFamily
      ? familySections
      : elderSections;

  const dashboardTitle = isCaretaker
    ? 'Caretaker Dashboard'
    : isFamily
      ? 'Family Dashboard'
      : 'Elder Dashboard';

  const welcomeMessage = isCaretaker
    ? 'Support their care, with respect and permission.'
    : isFamily
      ? 'Stay connected with the care information shared with you.'
      : 'Your health, your choice.';

  const intro = isCaretaker
    ? 'Help organise medicines and appointments while keeping the elder in control.'
    : isFamily
      ? 'Stay informed while respecting privacy and personal choices.'
      : 'Welcome to your personal care space.';

  return (
    <main className="min-h-screen bg-[#FFF9F0] text-[#26352D]">
      <header className="border-b border-[#E9DFCF] bg-white px-5 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Link href="/" aria-label="Dirghayu home">
            <Logo variant="lockup" className="w-56 max-w-full" />
          </Link>

          <span className="rounded-full bg-[#E8F1E9] px-5 py-3 text-base font-semibold text-[#285943]">
            {dashboardTitle}
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-lg text-gray-600">Namaste!</p>

        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
          {welcomeMessage}
        </h1>

        <p className="mt-3 text-lg text-gray-600">
          {intro}
        </p>

        <div className="mt-10 rounded-3xl bg-[#00606B] p-7 text-white shadow-sm">
          <p className="text-lg text-teal-100">
            {isCaretaker
              ? 'Care with compassion'
              : isFamily
                ? 'Together, with respect'
                : 'A little reminder'}
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {isCaretaker
              ? 'Support, without taking away control.'
              : isFamily
                ? 'Stay connected. Respect their choices.'
                : 'Your care, your way.'}
          </h2>

          <p className="mt-3 text-base text-teal-50">
            {isCaretaker
              ? 'You can propose care changes. The elder remains in control of approvals.'
              : isFamily
                ? 'You can see information that the elder has chosen to share with you.'
                : 'Keep your health information organised and stay in control of your care.'}
          </p>
        </div>

        <h2 className="mt-10 text-2xl font-bold">
          {isCaretaker
            ? 'Caregiving tools'
            : isFamily
              ? 'Shared care information'
              : 'Your care at a glance'}
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <article
              key={section.href}
              className="flex flex-col rounded-2xl border border-[#E9DFCF] bg-white p-6 shadow-sm"
            >
              <div className="text-3xl" aria-hidden="true">
                {section.icon}
              </div>

              <h3 className="mt-4 text-xl font-bold">
                {section.title}
              </h3>

              <p className="mt-2 flex-1 text-base leading-relaxed text-gray-600">
                {section.description}
              </p>

              <Link
                href={section.href}
                className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#285943] px-5 py-3 text-center text-lg font-semibold text-white transition hover:bg-[#1D4432] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#D69E36]"
              >
                {section.action}
              </Link>
            </article>
          ))}
        </div>

        {isFamily && (
          <p className="mt-6 text-base leading-relaxed text-gray-600">
            Your access depends on the elder's information-sharing settings.
            You cannot change their medicines or appointments.
          </p>
        )}
      </section>

      <footer className="border-t border-[#E9DFCF] bg-white px-5 py-7">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <p>Dirghayu · Care with dignity</p>
          <p>Long life, on their own terms.</p>
        </div>
      </footer>
    </main>
  );
}
