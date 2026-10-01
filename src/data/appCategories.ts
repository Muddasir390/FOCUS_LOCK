import type { InstalledApp } from '../types';

export type AppCategory =
  | 'social'
  | 'banking'
  | 'games'
  | 'productivity'
  | 'entertainment'
  | 'communication'
  | 'shopping'
  | 'other';

export const CATEGORY_LABELS: Record<AppCategory, string> = {
  social: 'Social',
  banking: 'Banking',
  games: 'Games',
  productivity: 'Productivity',
  entertainment: 'Entertainment',
  communication: 'Communication',
  shopping: 'Shopping',
  other: 'Other',
};

/** Android's OS-declared app category only covers these; many apps (esp. banking) never set it. */
const OS_CATEGORY_MAP: Record<string, AppCategory> = {
  GAME: 'games',
  SOCIAL: 'social',
  PRODUCTIVITY: 'productivity',
  NEWS: 'entertainment',
  AUDIO: 'entertainment',
  VIDEO: 'entertainment',
  IMAGE: 'entertainment',
};

/**
 * Exact package-name overrides, for apps where keyword matching below could
 * still get it wrong or be ambiguous. Checked before keyword matching.
 */
const PACKAGE_OVERRIDES: Record<string, AppCategory> = {
  'com.whatsapp': 'communication',
  'com.whatsapp.w4b': 'communication', // WhatsApp Business
  'org.telegram.messenger': 'communication',
  'com.facebook.orca': 'communication', // Messenger
  'org.thoughtcrime.securesms': 'communication', // Signal
  'com.google.android.gm': 'communication', // Gmail
};

/**
 * Keyword rules checked against the app's label and package name (lowercased),
 * in priority order. This is the main classifier: no static package list can
 * cover every bank, messenger or shop in the world, but their names are
 * reliably recognizable. Order matters where a keyword could plausibly belong
 * to more than one category.
 */
const KEYWORD_RULES: { category: AppCategory; keywords: string[] }[] = [
  {
    category: 'banking',
    keywords: [
      'bank',
      'banking',
      'credit union',
      'creditunion',
      'paypal',
      'venmo',
      'cash app',
      'cashapp',
      'zelle',
      'wallet',
      'crypto',
      'coinbase',
      'binance',
      'robinhood',
      'fidelity',
      'vanguard',
      'chase',
      'wells fargo',
      'wellsfargo',
      'citibank',
      'capital one',
      'capitalone',
      'hsbc',
      'barclays',
      'santander',
      'revolut',
      'chime',
      'payoneer',
      'credit karma',
      'creditkarma',
    ],
  },
  {
    category: 'communication',
    keywords: [
      'whatsapp',
      'telegram',
      'messenger',
      'signal',
      'discord',
      'skype',
      'viber',
      'wechat',
      'slack',
      'zoom',
      'teams',
      'webex',
      'gmail',
      'outlook',
      'mail',
      'messages',
      'messaging',
      'dialer',
      'phone',
      'contacts',
    ],
  },
  {
    category: 'social',
    keywords: [
      'facebook',
      'instagram',
      'tiktok',
      'musically',
      'snapchat',
      'twitter',
      'reddit',
      'linkedin',
      'pinterest',
      'tumblr',
      'threads',
      'mastodon',
      'bereal',
      'bumble',
      'tinder',
      'hinge',
    ],
  },
  {
    category: 'shopping',
    keywords: [
      'amazon',
      'ebay',
      'etsy',
      'shein',
      'aliexpress',
      'walmart',
      'target',
      'flipkart',
      'myntra',
      'shop',
      'shopping',
      'wish',
      'depop',
      'mercari',
    ],
  },
  {
    category: 'entertainment',
    keywords: [
      'netflix',
      'youtube',
      'spotify',
      'disney',
      'hulu',
      'hbo',
      'prime video',
      'primevideo',
      'twitch',
      'soundcloud',
      'pandora',
      'deezer',
      'podcast',
    ],
  },
  {
    category: 'productivity',
    keywords: [
      'docs',
      'sheets',
      'slides',
      'office',
      'word',
      'excel',
      'powerpoint',
      'notion',
      'evernote',
      'todoist',
      'calendar',
      'drive',
      'dropbox',
      'onedrive',
      'trello',
      'asana',
      'jira',
    ],
  },
];

function keywordCategory(app: Pick<InstalledApp, 'packageName' | 'appName'>): AppCategory | null {
  const haystack = `${app.appName} ${app.packageName}`.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some(keyword => haystack.includes(keyword))) {
      return rule.category;
    }
  }
  return null;
}

/**
 * Resolves an app's category: a user override (if they corrected it) wins,
 * then the curated package list, then keyword matching on the name/package,
 * then the OS-declared category, then "other".
 */
export function getAppCategory(
  app: Pick<InstalledApp, 'packageName' | 'appName' | 'osCategory'>,
  overrides: Readonly<Record<string, AppCategory>> = {},
): AppCategory {
  if (overrides[app.packageName]) return overrides[app.packageName];
  if (PACKAGE_OVERRIDES[app.packageName]) return PACKAGE_OVERRIDES[app.packageName];

  const byKeyword = keywordCategory(app);
  if (byKeyword) return byKeyword;

  if (app.osCategory && OS_CATEGORY_MAP[app.osCategory]) {
    return OS_CATEGORY_MAP[app.osCategory];
  }
  return 'other';
}
