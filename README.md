# Affiliate Links Site

Minimal, clean link gallery — like Linktree but yours.

## How to Add a New Category

Open `links.json` and add a new object to the `categories` array:

```json
{
  "id": "my-category",        ← URL slug: site.com/#my-category
  "name": "My Category",      ← Display name
  "description": "...",       ← Short description (optional)
  "icon": "🎯",               ← Emoji icon
  "links": []
}
```

## How to Add a Link

Inside any category's `"links"` array:

```json
{
  "title": "Product Name",
  "description": "Why you love it (optional)",
  "url": "https://your-affiliate-link.com",
  "image": "https://image-url.com/img.jpg",   ← optional
  "badge": "Top Pick"                          ← optional label
}
```

## Site Settings

Edit the `"site"` block in `links.json`:
- `name` — site title
- `tagline` — subtitle shown on home
- `avatar` — path or URL to your profile photo
- `accent` — primary color (default: #111111)

## Deploy

1. Push this folder to a GitHub repo
2. Connect the repo to Netlify
3. Netlify auto-deploys on every push

## Sharing a Category

Each category page has its own shareable URL:
```
https://yoursite.netlify.app/#video-guestbook
```
