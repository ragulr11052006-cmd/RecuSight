import { SubscriptionCategory, Currency } from '../types';

export interface CatalogSubscription {
  id: string;
  name: string;
  category: SubscriptionCategory;
  defaultCadence: 'monthly' | 'annually';
  defaultAmounts: Record<Currency, number>;
  aliases: string[];
  popularRank?: number;
}

export const POPULAR_SUBSCRIPTION_SERVICES: CatalogSubscription[] = [
  // 1. Streaming & Entertainment
  {
    id: 'netflix',
    name: 'Netflix',
    category: 'Streaming & Ent',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 199, USD: 15.49, EUR: 13.99, GBP: 10.99 },
    aliases: ['netflix', 'streaming', 'movies', 'series'],
    popularRank: 1,
  },
  {
    id: 'disney-hotstar',
    name: 'Disney+ Hotstar',
    category: 'Streaming & Ent',
    defaultCadence: 'annually',
    defaultAmounts: { INR: 899, USD: 12.99, EUR: 11.99, GBP: 9.99 },
    aliases: ['disney', 'hotstar', 'disney+', 'hotstar super', 'disney plus', 'cricket', 'streaming'],
    popularRank: 2,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    category: 'Streaming & Ent',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 119, USD: 10.99, EUR: 10.99, GBP: 10.99 },
    aliases: ['spotify', 'music', 'songs', 'podcast'],
    popularRank: 3,
  },
  {
    id: 'youtube-premium',
    name: 'YouTube Premium',
    category: 'Streaming & Ent',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 149, USD: 13.99, EUR: 12.99, GBP: 11.99 },
    aliases: ['youtube', 'youtube music', 'yt premium', 'google youtube'],
    popularRank: 4,
  },
  {
    id: 'amazon-prime',
    name: 'Amazon Prime',
    category: 'Streaming & Ent',
    defaultCadence: 'annually',
    defaultAmounts: { INR: 1499, USD: 139, EUR: 89.90, GBP: 95 },
    aliases: ['amazon', 'prime video', 'prime membership', 'amzn'],
    popularRank: 5,
  },
  {
    id: 'apple-music',
    name: 'Apple Music',
    category: 'Streaming & Ent',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 99, USD: 10.99, EUR: 10.99, GBP: 10.99 },
    aliases: ['apple music', 'itunes', 'apple'],
  },
  {
    id: 'apple-tv-plus',
    name: 'Apple TV+',
    category: 'Streaming & Ent',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 99, USD: 9.99, EUR: 9.99, GBP: 8.99 },
    aliases: ['apple tv', 'apple tv+', 'apple show'],
  },
  {
    id: 'sony-liv',
    name: 'SonyLIV',
    category: 'Streaming & Ent',
    defaultCadence: 'annually',
    defaultAmounts: { INR: 999, USD: 14.99, EUR: 12.99, GBP: 11.99 },
    aliases: ['sonyliv', 'sony liv', 'liv premium'],
  },
  {
    id: 'zee5',
    name: 'ZEE5',
    category: 'Streaming & Ent',
    defaultCadence: 'annually',
    defaultAmounts: { INR: 699, USD: 10.99, EUR: 9.99, GBP: 8.99 },
    aliases: ['zee5', 'zee 5'],
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    category: 'Streaming & Ent',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 99, USD: 7.99, EUR: 6.99, GBP: 5.99 },
    aliases: ['crunchyroll', 'anime'],
  },
  {
    id: 'audible',
    name: 'Audible Membership',
    category: 'Streaming & Ent',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 199, USD: 14.95, EUR: 9.95, GBP: 7.99 },
    aliases: ['audible', 'amazon audible', 'audiobooks'],
  },
  {
    id: 'jiocinema',
    name: 'JioCinema Premium',
    category: 'Streaming & Ent',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 29, USD: 1.99, EUR: 1.99, GBP: 1.50 },
    aliases: ['jiocinema', 'jio cinema', 'jio premium'],
  },

  // 2. Design & Creative Tools
  {
    id: 'adobe-creative-cloud',
    name: 'Adobe Creative Cloud',
    category: 'Design',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 4630, USD: 54.99, EUR: 62.49, GBP: 51.98 },
    aliases: ['adobe', 'creative cloud', 'photoshop', 'illustrator', 'premiere', 'after effects'],
    popularRank: 6,
  },
  {
    id: 'figma',
    name: 'Figma',
    category: 'Design',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 1290, USD: 15.00, EUR: 14.00, GBP: 12.00 },
    aliases: ['figma', 'figma organization', 'figjam', 'figma professional'],
    popularRank: 7,
  },
  {
    id: 'canva',
    name: 'Canva Pro',
    category: 'Design',
    defaultCadence: 'annually',
    defaultAmounts: { INR: 3999, USD: 119.99, EUR: 109.99, GBP: 99.99 },
    aliases: ['canva', 'canva pro', 'canva team', 'graphic design'],
    popularRank: 8,
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    category: 'Design',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 860, USD: 10.00, EUR: 9.20, GBP: 7.90 },
    aliases: ['midjourney', 'midjourney standard', 'ai art'],
  },
  {
    id: 'framer',
    name: 'Framer',
    category: 'Design',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 1200, USD: 15.00, EUR: 14.00, GBP: 12.00 },
    aliases: ['framer', 'framer web', 'framer pro'],
  },
  {
    id: 'webflow',
    name: 'Webflow',
    category: 'Design',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 1550, USD: 18.00, EUR: 16.50, GBP: 14.50 },
    aliases: ['webflow', 'webflow cms', 'site builder'],
  },

  // 3. AI & Developer Tools
  {
    id: 'chatgpt-plus',
    name: 'ChatGPT Plus',
    category: 'Ai Assist',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 1999, USD: 20.00, EUR: 22.00, GBP: 18.00 },
    aliases: ['chatgpt', 'openai', 'gpt4', 'gpt plus', 'chat gpt'],
    popularRank: 9,
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    category: 'Software & Dev',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 860, USD: 10.00, EUR: 9.50, GBP: 8.00 },
    aliases: ['github', 'copilot', 'github pro', 'git'],
    popularRank: 10,
  },
  {
    id: 'claude-pro',
    name: 'Claude Pro',
    category: 'Ai Assist',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 1999, USD: 20.00, EUR: 22.00, GBP: 18.00 },
    aliases: ['claude', 'anthropic', 'claude pro', 'claude ai'],
  },
  {
    id: 'perplexity-ai',
    name: 'Perplexity AI Pro',
    category: 'Ai Assist',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 1720, USD: 20.00, EUR: 20.00, GBP: 17.00 },
    aliases: ['perplexity', 'perplexity pro', 'ai search'],
  },
  {
    id: 'cursor-ai',
    name: 'Cursor Pro',
    category: 'Software & Dev',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 1720, USD: 20.00, EUR: 19.00, GBP: 16.00 },
    aliases: ['cursor', 'anysphere', 'cursor ai', 'cursor pro'],
  },
  {
    id: 'jetbrains',
    name: 'JetBrains All Products',
    category: 'Software & Dev',
    defaultCadence: 'annually',
    defaultAmounts: { INR: 24900, USD: 289, EUR: 269, GBP: 239 },
    aliases: ['jetbrains', 'intellij', 'pycharm', 'webstorm'],
  },

  // 4. Productivity & Business
  {
    id: 'linkedin-premium',
    name: 'LinkedIn Premium',
    category: 'Productivity',
    defaultCadence: 'annually',
    defaultAmounts: { INR: 5074.58, USD: 239.88, EUR: 220, GBP: 195 },
    aliases: ['linkedin', 'linkedin learning', 'sales navigator', 'premium career', 'linkedin premium career'],
    popularRank: 11,
  },
  {
    id: 'notion',
    name: 'Notion AI Plus',
    category: 'Productivity',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 850, USD: 10.00, EUR: 9.50, GBP: 8.00 },
    aliases: ['notion', 'notion workspace', 'notion plus'],
    popularRank: 12,
  },
  {
    id: 'slack',
    name: 'Slack Pro',
    category: 'Productivity',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 750, USD: 8.75, EUR: 8.25, GBP: 7.00 },
    aliases: ['slack', 'slack workspace', 'slack team'],
    popularRank: 13,
  },
  {
    id: 'microsoft-365',
    name: 'Microsoft 365',
    category: 'Productivity',
    defaultCadence: 'annually',
    defaultAmounts: { INR: 6199, USD: 69.99, EUR: 69.00, GBP: 59.99 },
    aliases: ['microsoft', 'office 365', 'microsoft 365 family', 'ms office', 'onedrive'],
    popularRank: 14,
  },
  {
    id: 'google-workspace',
    name: 'Google One / Workspace',
    category: 'Utilities & Cloud',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 130, USD: 1.99, EUR: 1.99, GBP: 1.59 },
    aliases: ['google', 'google one', 'google storage', 'gsuite', 'google workspace'],
    popularRank: 15,
  },
  {
    id: 'zoom',
    name: 'Zoom Pro',
    category: 'Productivity',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 1320, USD: 15.99, EUR: 14.99, GBP: 12.99 },
    aliases: ['zoom', 'zoom video', 'zoom meeting'],
  },
  {
    id: 'grammarly',
    name: 'Grammarly Premium',
    category: 'Productivity',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 999, USD: 12.00, EUR: 11.00, GBP: 9.50 },
    aliases: ['grammarly', 'grammarly business'],
  },
  {
    id: '1password',
    name: '1Password',
    category: 'Productivity',
    defaultCadence: 'annually',
    defaultAmounts: { INR: 2999, USD: 35.88, EUR: 33.00, GBP: 29.00 },
    aliases: ['1password', 'password manager', 'agilebits'],
  },
  {
    id: 'linear',
    name: 'Linear',
    category: 'Productivity',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 690, USD: 8.00, EUR: 7.50, GBP: 6.50 },
    aliases: ['linear', 'linear app', 'issue tracking'],
  },
  {
    id: 'asana',
    name: 'Asana Starter',
    category: 'Productivity',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 950, USD: 10.99, EUR: 10.50, GBP: 9.00 },
    aliases: ['asana', 'project management'],
  },
  {
    id: 'trello',
    name: 'Trello Standard',
    category: 'Productivity',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 430, USD: 5.00, EUR: 4.80, GBP: 4.00 },
    aliases: ['trello', 'atlassian trello'],
  },

  // 5. Cloud, Hosting & Utilities
  {
    id: 'aws',
    name: 'Amazon Web Services (AWS)',
    category: 'Utilities & Cloud',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 2999, USD: 35.00, EUR: 32.00, GBP: 28.00 },
    aliases: ['aws', 'amazon web services', 'ec2', 's3'],
  },
  {
    id: 'google-cloud',
    name: 'Google Cloud Platform (GCP)',
    category: 'Utilities & Cloud',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 3640, USD: 42.10, EUR: 38.70, GBP: 33.20 },
    aliases: ['gcp', 'google cloud', 'compute engine'],
  },
  {
    id: 'supabase-pro',
    name: 'Supabase Pro',
    category: 'Utilities & Cloud',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 2150, USD: 25.00, EUR: 23.00, GBP: 20.00 },
    aliases: ['supabase', 'supabase pro tier', 'postgres database'],
  },
  {
    id: 'vercel-pro',
    name: 'Vercel Pro',
    category: 'Utilities & Cloud',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 1750, USD: 20.00, EUR: 18.50, GBP: 16.00 },
    aliases: ['vercel', 'vercel pro team', 'nextjs hosting'],
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    category: 'Utilities & Cloud',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 999, USD: 12.00, EUR: 11.00, GBP: 9.50 },
    aliases: ['digitalocean', 'digital ocean', 'droplet'],
  },
  {
    id: 'hostinger',
    name: 'Hostinger Business Web',
    category: 'Utilities & Cloud',
    defaultCadence: 'annually',
    defaultAmounts: { INR: 3588, USD: 47.88, EUR: 44.00, GBP: 38.00 },
    aliases: ['hostinger', 'web hosting', 'domains'],
  },
  {
    id: 'godaddy',
    name: 'GoDaddy Domains & Hosting',
    category: 'Utilities & Cloud',
    defaultCadence: 'annually',
    defaultAmounts: { INR: 1899, USD: 22.99, EUR: 21.00, GBP: 18.00 },
    aliases: ['godaddy', 'domains', 'dns'],
  },

  // 6. Food, Telecom & Everyday Utilities
  {
    id: 'swiggy-one',
    name: 'Swiggy One',
    category: 'Other Misc',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 299, USD: 3.99, EUR: 3.50, GBP: 2.99 },
    aliases: ['swiggy', 'swiggy one', 'instamart', 'dineout'],
  },
  {
    id: 'zomato-gold',
    name: 'Zomato Gold',
    category: 'Other Misc',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 299, USD: 3.99, EUR: 3.50, GBP: 2.99 },
    aliases: ['zomato', 'zomato gold', 'blinkit'],
  },
  {
    id: 'jiofiber',
    name: 'JioFiber Broadband',
    category: 'Utilities & Cloud',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 999, USD: 11.99, EUR: 10.99, GBP: 9.50 },
    aliases: ['jiofiber', 'jio', 'reliance jio', 'broadband', 'wifi'],
  },
  {
    id: 'airtel-xstream',
    name: 'Airtel Xstream Fiber',
    category: 'Utilities & Cloud',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 999, USD: 11.99, EUR: 10.99, GBP: 9.50 },
    aliases: ['airtel', 'bharti airtel', 'xstream', 'airtel fiber'],
  },
  {
    id: 'tata-play',
    name: 'Tata Play Billed',
    category: 'Streaming & Ent',
    defaultCadence: 'monthly',
    defaultAmounts: { INR: 450, USD: 5.99, EUR: 5.50, GBP: 4.90 },
    aliases: ['tata play', 'tata sky', 'dth'],
  },
  {
    id: 'cult-fit',
    name: 'Cult.fit Pass',
    category: 'Fitness & Health',
    defaultCadence: 'annually',
    defaultAmounts: { INR: 14500, USD: 175, EUR: 160, GBP: 140 },
    aliases: ['cult', 'cultfit', 'cult.fit', 'gym', 'fitness'],
  },
];

/**
 * Filter catalog by search query (matching name, category, or aliases)
 */
export function searchCatalog(query: string, maxResults = 8): CatalogSubscription[] {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    // Return top popular ranked subscriptions if no query
    return POPULAR_SUBSCRIPTION_SERVICES
      .filter((s) => s.popularRank !== undefined)
      .sort((a, b) => (a.popularRank || 99) - (b.popularRank || 99))
      .slice(0, maxResults);
  }

  const results = POPULAR_SUBSCRIPTION_SERVICES.filter((item) => {
    const nameMatch = item.name.toLowerCase().includes(clean);
    const catMatch = item.category.toLowerCase().includes(clean);
    const aliasMatch = item.aliases.some((a) => a.toLowerCase().includes(clean) || clean.includes(a.toLowerCase()));
    return nameMatch || catMatch || aliasMatch;
  });

  // Sort: exact startsWith names first, then popular, then others
  results.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(clean);
    const bStarts = b.name.toLowerCase().startsWith(clean);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return (a.popularRank || 99) - (b.popularRank || 99);
  });

  return results.slice(0, maxResults);
}

/**
 * Find exact or nearest catalog match by name
 */
export function findCatalogItem(name: string): CatalogSubscription | undefined {
  const clean = name.trim().toLowerCase();
  if (!clean) return undefined;

  return POPULAR_SUBSCRIPTION_SERVICES.find((item) => {
    if (item.name.toLowerCase() === clean) return true;
    if (item.aliases.some((a) => a.toLowerCase() === clean)) return true;
    return false;
  });
}
