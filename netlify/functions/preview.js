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
    const res = await fetch(url, {
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
