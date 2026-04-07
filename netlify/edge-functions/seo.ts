type SeoMeta = {
  title: string;
  description: string;
  image: string;
  url: string;
  type: 'website' | 'article';
};

function envGet(key: string): string | null {
  try {
    // Netlify Edge Functions run on Deno.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const denoEnv = (globalThis as any)?.Deno?.env;
    if (denoEnv?.get) return denoEnv.get(key) ?? null;
  } catch {
    // ignore
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = (globalThis as any)?.process;
  return (p?.env?.[key] as string | undefined) ?? null;
}

function isBotUserAgent(uaRaw: string | null): boolean {
  const ua = (uaRaw ?? '').toLowerCase();
  if (!ua) return false;
  return (
    ua.includes('whatsapp') ||
    ua.includes('facebookexternalhit') ||
    ua.includes('facebot') ||
    ua.includes('twitterbot') ||
    ua.includes('telegrambot') ||
    ua.includes('linkedinbot') ||
    ua.includes('slackbot') ||
    ua.includes('discordbot') ||
    ua.includes('googlebot') ||
    ua.includes('bingbot')
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripHtml(input: string): string {
  return input.replaceAll(/<[^>]*>/g, ' ').replaceAll(/\s+/g, ' ').trim();
}

function truncate(input: string, maxLen: number): string {
  if (input.length <= maxLen) return input;
  return input.slice(0, maxLen).trimEnd() + '…';
}

function extractYouTubeId(url: string): string | null {
  const patterns: RegExp[] = [
    /youtube\.com\/watch\?v=([^&\s?#]+)/i,
    /youtu\.be\/([^&\s?#]+)/i,
    /youtube\.com\/embed\/([^&\s?#]+)/i,
    /youtube\.com\/shorts\/([^&\s?#]+)/i,
    /youtube\.com\/live\/([^&\s?#]+)/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    const id = m?.[1];
    if (id && /^[0-9A-Za-z_-]{11}$/.test(id)) return id;
  }
  return null;
}

function toAbsoluteUrl(url: string, origin: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${origin}${url}`;
  return `${origin}/${url}`;
}

function defaultMeta(origin: string, url: string): SeoMeta {
  const title = 'تمبدغه بلاس';
  const description = 'وكالة إخبارية تقدم آخر الأخبار والتقارير والمقالات والفيديوهات.';
  const image = `${origin}/branding/og.png`;
  return { title, description, image, url, type: 'website' };
}

async function fetchArticleMeta(args: {
  origin: string;
  url: string;
  lang: 'ar' | 'fr';
  slug: string;
}): Promise<SeoMeta | null> {
  const supabaseUrl = envGet('SUPABASE_URL') ?? envGet('VITE_SUPABASE_URL');
  const supabaseAnonKey = envGet('SUPABASE_ANON_KEY') ?? envGet('VITE_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const select = encodeURIComponent(
    'title_ar,title_fr,content_ar,content_fr,content_type,image_url,video_url,video_thumbnail,status,slug'
  );
  const endpoint =
    `${supabaseUrl}/rest/v1/posts?select=${select}` +
    `&slug=eq.${encodeURIComponent(args.slug)}` +
    `&status=eq.published&limit=1`;

  const res = await fetch(endpoint, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;

  const rows = (await res.json()) as Array<Record<string, unknown>>;
  const row = rows?.[0];
  if (!row) return null;

  const titleKey = args.lang === 'fr' ? 'title_fr' : 'title_ar';
  const contentKey = args.lang === 'fr' ? 'content_fr' : 'content_ar';
  const rawTitle = String(row[titleKey] ?? '').trim();
  const rawContent = String(row[contentKey] ?? '').trim();
  const contentType = String(row.content_type ?? '').trim();

  const title = rawTitle || 'تمبدغه بلاس';
  const description = truncate(stripHtml(rawContent || ''), 160) || defaultMeta(args.origin, args.url).description;

  const isVideoPost = contentType === 'فيديو' || contentType === 'video';
  const videoThumbnail = (row.video_thumbnail as string | null | undefined) ?? null;
  const videoUrl = (row.video_url as string | null | undefined) ?? null;
  const imageUrl = (row.image_url as string | null | undefined) ?? null;

  let image = imageUrl ?? null;
  if (isVideoPost) {
    image = videoThumbnail;
    if (!image && videoUrl) {
      const id = extractYouTubeId(videoUrl);
      if (id) image = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
  }

  if (image) {
    if (!image.startsWith('http://') && !image.startsWith('https://')) {
      // Support older records that store storage paths (same behavior as app helpers).
      image = `${supabaseUrl}/storage/v1/object/public/news-images/${image.replace(/^\/+/, '')}`;
    }
    image = toAbsoluteUrl(image, args.origin);
  } else {
    image = `${args.origin}/branding/og.png`;
  }

  return {
    title,
    description,
    image,
    url: args.url,
    type: 'article',
  };
}

function renderHtml(meta: SeoMeta): string {
  const title = escapeHtml(meta.title);
  const desc = escapeHtml(meta.description);
  const image = escapeHtml(meta.image);
  const url = escapeHtml(meta.url);
  const type = meta.type;

  return `<!DOCTYPE html>
<html lang="ar">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${desc}" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" type="image/png" href="/favicon.png" />

    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="${type}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${image}" />
  </head>
  <body>
    <noscript><a href="${url}">${title}</a></noscript>
  </body>
</html>`;
}

function isArticlePath(pathname: string): { lang: 'ar' | 'fr'; slug: string } | null {
  const m = pathname.match(/^\/(ar|fr)\/([^/]+)\/?$/);
  if (!m) return null;
  const lang = m[1] as 'ar' | 'fr';
  const slug = m[2];

  // Exclude known non-article routes that match the same pattern.
  const reserved = new Set([
    'videos',
    'contact',
    'streams',
    'search',
    'login',
    'register',
    'admin',
    'category',
  ]);
  if (reserved.has(slug)) return null;
  return { lang, slug };
}

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const ua = request.headers.get('user-agent');
  if (!isBotUserAgent(ua)) return context.next();

  const url = new URL(request.url);
  const origin = url.origin;

  const article = isArticlePath(url.pathname);
  const meta =
    (article
      ? await fetchArticleMeta({
          origin,
          url: url.toString(),
          lang: article.lang,
          slug: article.slug,
        })
      : null) ?? defaultMeta(origin, url.toString());

  return new Response(renderHtml(meta), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Force revalidation so fixes propagate as fast as possible.
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
};

