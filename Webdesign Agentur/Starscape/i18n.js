/**
 * HSB STARSCAPE — i18n Translation Engine
 * Usage: add data-i18n="key" to any element.
 *        add data-i18n-placeholder="key" to inputs.
 *        Language stored in localStorage under 'hsb-lang'.
 */

const TRANSLATIONS = {
  en: {
    /* NAV */
    nav_home: 'Home',
    nav_about: 'About STARS EU',
    nav_network: 'Network',
    nav_signin: 'Sign In',
    label_main: 'Main',

    /* PROFILE */
    profile_guest: 'Guest User',
    profile_role: 'Sign in to continue',

    /* STATS */
    stat_unis: 'Universities',
    stat_prog: 'Programmes',
    stat_part: 'Partnerships',

    /* EVENT TITLES */
    ev1_title: 'Virtual Exchange Opportunities Online',
    ev2_title: 'Sustainable Cities Workshop',
    ev3_title: 'Research Communication for PhD Candidates',
    ev1_time: '14:00 – 15:30 CET',
    ev2_time: '17:00 – 19:00 CET',
    ev3_time: '10:00 – 12:00 CET',

    /* BADGES */
    badge_online: 'Online',
    badge_campus: 'Campus',
    badge_hybrid: 'Hybrid',
    booked: 'Booked',

    /* INDEX hero */
    hero_h1: 'Science in the City.',
    hero_p: 'HSB connects students, teachers, courses, knowledge, and spaces across the STARS EU network — anchored in Bremen, looking into the world.',
    search_placeholder: 'Search HSB courses, topics, people, partner universities...',
    search_btn: 'Search',

    /* INDEX cards */
    card_ask_title: 'Ask Questions',
    card_ask_p: 'Ask questions and receive clear answers, useful resources, and relevant course or contact suggestions across the STARS EU universities.',
    card_phd_title: 'PhD Cluster',
    card_phd_p: 'Connect with doctoral programs, supervisors, and research opportunities across the network.',
    card_activities_title: 'Join Activities',
    card_activities_p: 'Discover events, workshops and initiatives across the STARS EU network.',
    card_spaces_title: 'Book Spaces',
    card_spaces_p: 'Reserve study rooms, labs and spaces at HSB Bremen.',
    learn_more: 'Learn more',

    /* INDEX two-column */
    upcoming_events: 'Upcoming Events',
    view_all: 'View all',
    spaces_now: 'Spaces Available Now',
    available: 'Available',
    bookNow: 'Book Now',

    /* BREADCRUMB */
    bc_home: 'Home',
    bc_ask: 'Ask Questions',
    bc_phd: 'PhD Cluster',
    bc_about: 'About STARS EU',
    bc_network: 'Network',
    bc_activities: 'Activities',
    bc_spaces: 'Book Spaces',
    bc_signin: 'Sign In',

    /* ASK QUESTIONS */
    ask_h1: 'Ask Questions.',
    ask_sub: 'Get clear answers, useful resources, and relevant courses. Our community and university experts are here to help.',
    ask_form_title: 'Ask a Question',
    ask_topic_label: 'What is your question about?',
    ask_question_label: 'Your question',
    ask_details_label: 'Add more details (optional)',
    ask_deadline_label: 'Time deadline',
    ask_deadline_helper: 'Set a deadline if you need an answer before a specific date.',
    ask_deadline_toggle: 'Set a deadline',
    ask_who_label: 'I am a',
    ask_who_student: 'Student',
    ask_who_teacher: 'Teacher / Staff',
    ask_who_researcher: 'Researcher',
    ask_who_other: 'Other',
    ask_clear: 'Clear',
    ask_submit: 'Submit Question',
    ask_recent: 'Recent Questions',
    ask_filter: 'Filter questions...',
    ask_toast: 'Question submitted successfully!',
    ask_select_topic: 'Select a topic',
    ask_opt_admission: 'Admission & Registration',
    ask_opt_courses: 'Courses & Curriculum',
    ask_opt_exchange: 'Student Exchange',
    ask_opt_housing: 'Housing & Accommodation',
    ask_opt_support: 'Support Services',
    ask_opt_phd: 'PhD & Research',
    ask_opt_other: 'Other',

    /* PHD */
    phd_h1: 'PhD Cluster',
    phd_sub: 'Discover doctoral programs, workshops, supervisors, funding, and research communities across the STARS EU network.',
    phd_tab_programs: 'Doctoral Programs',
    phd_tab_workshops: 'Workshops',
    phd_tab_funding: 'Funding',
    phd_tab_supervisors: 'Supervisors',
    phd_filter_field: 'Research Field',
    phd_filter_format: 'Format',
    phd_filter_uni: 'University',
    phd_filter_month: 'Month',
    phd_filter_all_fields: 'All Fields',
    phd_filter_all_formats: 'All Formats',
    phd_filter_all_unis: 'All Universities',
    phd_filter_all_months: 'All Months',
    phd_search_placeholder: 'Keywords...',
    phd_view_all: 'View all opportunities',
    phd_deadlines: 'Application deadlines approaching',
    phd_deadlines_sub: '3 calls closing this month',
    phd_opportunities: 'Highlighted Opportunities',
    phd_questions: 'PhD Community Questions',
    phd_ask_one: 'Ask one',

    /* PLACEHOLDER pages */
    coming_soon: 'In Development',
    notify_title_about: 'Want to know when this page goes live?',
    notify_sub: "Leave your email and we'll notify you.",
    notify_placeholder: 'your@university.eu',
    notify_btn: 'Notify me',
    notify_success: "✓ You're on the list!",

    /* SIGNIN */
    signin_h1: 'Welcome back',
    signin_sub: 'Sign in to your HSB STARSCAPE account',
    signin_sso_uni: 'Continue with University SSO',
    signin_sso_eu: 'Continue with EU Login',
    signin_sso_google: 'Continue with Google',
    signin_divider: 'or sign in with email',
    signin_email: 'Email address',
    signin_password: 'Password',
    signin_forgot: 'Forgot password?',
    signin_btn: 'Sign In',
    signin_no_account: "Don't have an account?",
    signin_request: 'Request access',
    signin_success_h2: 'Signed in!',
    signin_success_p: "Welcome back. You're now connected to the STARS EU network.",
    signin_home_btn: 'Go to dashboard',
  },

  de: {
    /* NAV */
    nav_home: 'Startseite',
    nav_about: 'Über STARS EU',
    nav_network: 'Netzwerk',
    nav_signin: 'Anmelden',
    label_main: 'Hauptmenü',

    /* PROFILE */
    profile_guest: 'Gast',
    profile_role: 'Anmelden um fortzufahren',

    /* STATS */
    stat_unis: 'Universitäten',
    stat_prog: 'Studiengänge',
    stat_part: 'Partnerschaften',

    /* EVENT TITLES */
    ev1_title: 'Virtuelle Austauschprogramme Online',
    ev2_title: 'Workshop Nachhaltige Städte',
    ev3_title: 'Forschungskommunikation für Doktoranden',
    ev1_time: '14:00 – 15:30 MEZ',
    ev2_time: '17:00 – 19:00 MEZ',
    ev3_time: '10:00 – 12:00 MEZ',

    /* BADGES */
    badge_online: 'Online',
    badge_campus: 'Campus',
    badge_hybrid: 'Hybrid',
    booked: 'Gebucht',

    /* INDEX hero */
    hero_h1: 'Wissenschaft in der Stadt.',
    hero_p: 'HSB verbindet Studierende, Lehrende, Kurse, Wissen und Räume im STARS EU-Netzwerk — verankert in Bremen, blickt in die Welt.',
    search_placeholder: 'HSB-Kurse, Themen, Personen, Partneruniversitäten suchen...',
    search_btn: 'Suchen',

    /* INDEX cards */
    card_ask_title: 'Fragen stellen',
    card_ask_p: 'Stellen Sie Fragen und erhalten Sie klare Antworten, nützliche Ressourcen und relevante Kurs- oder Kontaktvorschläge der STARS EU-Universitäten.',
    card_phd_title: 'PhD Cluster',
    card_phd_p: 'Verbinden Sie sich mit Doktorandenprogrammen, Betreuenden und Forschungsmöglichkeiten im Netzwerk.',
    card_activities_title: 'Aktivitäten',
    card_activities_p: 'Entdecken Sie Veranstaltungen, Workshops und Initiativen im STARS EU-Netzwerk.',
    card_spaces_title: 'Räume buchen',
    card_spaces_p: 'Reservieren Sie Lernräume, Labore und Räume an der HSB Bremen.',
    learn_more: 'Mehr erfahren',

    /* INDEX two-column */
    upcoming_events: 'Kommende Veranstaltungen',
    view_all: 'Alle anzeigen',
    spaces_now: 'Jetzt verfügbare Räume',
    available: 'Verfügbar',
    bookNow: 'Jetzt buchen',

    /* BREADCRUMB */
    bc_home: 'Startseite',
    bc_ask: 'Fragen stellen',
    bc_phd: 'PhD Cluster',
    bc_about: 'Über STARS EU',
    bc_network: 'Netzwerk',
    bc_activities: 'Aktivitäten',
    bc_spaces: 'Räume buchen',
    bc_signin: 'Anmelden',

    /* ASK QUESTIONS */
    ask_h1: 'Fragen stellen.',
    ask_sub: 'Erhalten Sie klare Antworten, nützliche Ressourcen und relevante Kurse. Unsere Community und Universitätsexperten helfen Ihnen.',
    ask_form_title: 'Eine Frage stellen',
    ask_topic_label: 'Worum geht es bei Ihrer Frage?',
    ask_question_label: 'Ihre Frage',
    ask_details_label: 'Weitere Details hinzufügen (optional)',
    ask_deadline_label: 'Zeitfrist',
    ask_deadline_helper: 'Legen Sie eine Frist fest, wenn Sie die Antwort vor einem bestimmten Datum benötigen.',
    ask_deadline_toggle: 'Frist festlegen',
    ask_who_label: 'Ich bin',
    ask_who_student: 'Studierende/r',
    ask_who_teacher: 'Lehrperson / Personal',
    ask_who_researcher: 'Forscher/in',
    ask_who_other: 'Sonstiges',
    ask_clear: 'Zurücksetzen',
    ask_submit: 'Frage einreichen',
    ask_recent: 'Neueste Fragen',
    ask_filter: 'Fragen filtern...',
    ask_toast: 'Frage erfolgreich eingereicht!',
    ask_select_topic: 'Thema auswählen',
    ask_opt_admission: 'Zulassung & Einschreibung',
    ask_opt_courses: 'Kurse & Lehrplan',
    ask_opt_exchange: 'Studierendenaustausch',
    ask_opt_housing: 'Wohnen & Unterkunft',
    ask_opt_support: 'Unterstützungsangebote',
    ask_opt_phd: 'Promotion & Forschung',
    ask_opt_other: 'Sonstiges',

    /* PHD */
    phd_h1: 'PhD Cluster',
    phd_sub: 'Entdecken Sie Doktorandenprogramme, Workshops, Betreuende, Förderungen und Forschungsgemeinschaften im STARS EU-Netzwerk.',
    phd_tab_programs: 'Doktorandenprogramme',
    phd_tab_workshops: 'Workshops',
    phd_tab_funding: 'Förderung',
    phd_tab_supervisors: 'Betreuende',
    phd_filter_field: 'Forschungsfeld',
    phd_filter_format: 'Format',
    phd_filter_uni: 'Universität',
    phd_filter_month: 'Monat',
    phd_filter_all_fields: 'Alle Felder',
    phd_filter_all_formats: 'Alle Formate',
    phd_filter_all_unis: 'Alle Universitäten',
    phd_filter_all_months: 'Alle Monate',
    phd_search_placeholder: 'Stichwörter...',
    phd_view_all: 'Alle Möglichkeiten anzeigen',
    phd_deadlines: 'Bewerbungsfristen laufen ab',
    phd_deadlines_sub: '3 Ausschreibungen enden diesen Monat',
    phd_opportunities: 'Hervorgehobene Möglichkeiten',
    phd_questions: 'PhD Community Fragen',
    phd_ask_one: 'Frage stellen',

    /* PLACEHOLDER pages */
    coming_soon: 'In Entwicklung',
    notify_title_about: 'Möchten Sie informiert werden, wenn diese Seite live geht?',
    notify_sub: 'Hinterlassen Sie Ihre E-Mail-Adresse.',
    notify_placeholder: 'ihre@hochschule.de',
    notify_btn: 'Benachrichtigen',
    notify_success: '✓ Sie sind auf der Liste!',

    /* SIGNIN */
    signin_h1: 'Willkommen zurück',
    signin_sub: 'Melden Sie sich bei HSB STARSCAPE an',
    signin_sso_uni: 'Weiter mit Uni-SSO',
    signin_sso_eu: 'Weiter mit EU Login',
    signin_sso_google: 'Weiter mit Google',
    signin_divider: 'oder mit E-Mail anmelden',
    signin_email: 'E-Mail-Adresse',
    signin_password: 'Passwort',
    signin_forgot: 'Passwort vergessen?',
    signin_btn: 'Anmelden',
    signin_no_account: 'Noch kein Konto?',
    signin_request: 'Zugang beantragen',
    signin_success_h2: 'Angemeldet!',
    signin_success_p: 'Willkommen zurück. Sie sind jetzt mit dem STARS EU-Netzwerk verbunden.',
    signin_home_btn: 'Zum Dashboard',
  }
};

function getLang() {
  return localStorage.getItem('hsb-lang') || 'en';
}

function setLang(lang) {
  localStorage.setItem('hsb-lang', lang);
  applyTranslations(lang);
  updateLangButton(lang);
}

function t(key) {
  const lang = getLang();
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || (TRANSLATIONS['en'][key]) || key;
}

function applyTranslations(lang) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];

  // data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] !== undefined) el.textContent = dict[key];
  });

  // data-i18n-html (for elements that need innerHTML)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key] !== undefined) el.innerHTML = dict[key];
  });

  // data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key] !== undefined) el.placeholder = dict[key];
  });

  // fire custom event so page-specific JS can react
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

function updateLangButton(lang) {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const label = btn.querySelector('.lang-label');
    if (label) label.textContent = lang.toUpperCase();
    btn.setAttribute('aria-label', lang === 'en' ? 'Sprache wechseln' : 'Switch language');
  });
}

function toggleLang() {
  setLang(getLang() === 'en' ? 'de' : 'en');
}

// Auto-apply on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations(getLang());
});
