exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const url = event.queryStringParameters.url;
  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: "url parameter required" }) };
  }

  // Security: only allow http/https
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Only http/https allowed" }) };
    }
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid URL" }) };
  }

  try {
    // ── Resolve short URLs (amzn.to, bit.ly, etc.) ──────────────
    let finalUrl = url;
    let loopCount = 0;
    while (loopCount < 3) {
      if (!/^https?:\/\//i.test(finalUrl)) break;
      const urlHost = new URL(finalUrl).hostname;
      const shortDomains = ["amzn.to", "bit.ly", "t.co", "goo.gl", "tinyurl.com", "a.co"];
      if (shortDomains.some(d => urlHost === d || urlHost.endsWith("." + d))) {
        try {
          // Use manual redirect to catch the location without crashing if the final target (like Amazon) returns a 503
          const redirectRes = await fetch(finalUrl, {
            method: "HEAD",
            redirect: "manual",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            },
          });
          const loc = redirectRes.headers.get("location");
          if (loc) {
            finalUrl = new URL(loc, finalUrl).toString();
          } else {
            break;
          }
        } catch {
          break;
        }
        loopCount++;
      } else {
        break; // Not a shortlink
      }
    }

    // ── Amazon-specific handling ─────────────────────────────────
    // Amazon blocks serverless function scraping (returns 503 CAPTCHA pages)
    // and they recently deprecated the /images/P/ fallback, returning 1x1 transparent GIFs.
    // So for Amazon, we gracefully return empty data rather than a broken image or crashing.
    const isAmazon = /amazon\.(com|co\.\w{2,}|de|fr|it|es|ca|com\.au|co\.jp|in)/i.test(finalUrl);
    if (isAmazon) {
      const slugMatch = finalUrl.match(/amazon\.[^/]+\/([^/]+)\/dp\//);
      let title = "";
      if (slugMatch) {
         title = decodeURIComponent(slugMatch[1]).replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      }
      return {
        statusCode: 200,
        body: JSON.stringify({ title, image: "", description: "" }),
        headers: { "Content-Type": "application/json" },
      };
    }
    // ── Generic OG scraping for non-Amazon URLs ─────────────────
    const res = await fetch(finalUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 8000,
    });

    const html = await res.text();

    // Extract og:title
    const titleMatch = html.match(/<meta[^>]+\bproperty=["']og:title["'][^>]+\bcontent=["']([^"']+)["']/i)
                     || html.match(/<meta[^>]+\bcontent=["']([^"']+)["'][^>]+\bproperty=["']og:title["']/i)
                     || html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim() : "";

    // Extract og:image
    const imgMatch = html.match(/<meta[^>]+\bproperty=["']og:image["'][^>]+\bcontent=["']([^"']+)["']/i)
                  || html.match(/<meta[^>]+\bcontent=["']([^"']+)["'][^>]+\bproperty=["']og:image["']/i)
                  || html.match(/<meta[^>]+\bname=["']twitter:image["'][^>]+\bcontent=["']([^"']+)["']/i);
    const image = imgMatch ? imgMatch[1] : "";

    // Extract og:description
    const descMatch = html.match(/<meta[^>]+\bproperty=["']og:description["'][^>]+\bcontent=["']([^"']+)["']/i)
                   || html.match(/<meta[^>]+\bcontent=["']([^"']+)["'][^>]+\bproperty=["']og:description["']/i)
                   || html.match(/<meta[^>]+\bname=["']description["'][^>]+\bcontent=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].replace(/&amp;/g, "&").trim() : "";

    return {
      statusCode: 200,
      body: JSON.stringify({ title, image, description }),
      headers: { "Content-Type": "application/json" }
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch URL: " + err.message }) };
  }
};
