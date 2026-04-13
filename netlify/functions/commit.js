exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: "GitHub token not configured" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { path, content, message, sha } = body;
  if (!path || !content || !message) {
    return { statusCode: 400, body: "Missing required fields: path, content, message" };
  }

  try {
    const encoded = Buffer.from(content).toString("base64");

    const url = `https://api.github.com/repos/7juliusearl/sidelinq/contents/${path}`;
    const updateData = {
      message,
      content: encoded,
    };
    if (sha) updateData.sha = sha;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: "token " + token,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Sidelinq-CMS"
      },
      body: JSON.stringify(updateData)
    });

    const data = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data.message || "GitHub API error" }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("GitHub commit error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
