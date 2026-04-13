const { Octokit } = require("@octokit/rest");

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
    const octokit = new Octokit({ auth: token });

    const encoded = Buffer.from(content).toString("base64");

    const updateData = {
      owner: "7juliusearl",
      repo: "sidelinq",
      path,
      message,
      content: encoded,
    };
    if (sha) updateData.sha = sha;

    await octokit.repos.createOrUpdateFileContents(updateData);

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("GitHub commit error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
