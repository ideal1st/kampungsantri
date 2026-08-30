# Admin Dashboard Setup

The admin dashboard is a client-side, static application located in `admin/`. It talks directly to the GitHub API so you can edit Jekyll content from the browser — no Node.js or Python backend is required.

## Requirements

- A Jekyll site hosted on GitHub Pages.
- A GitHub account with **write access** to this repository.
- A modern browser with `fetch` and `localStorage` support.

## 1. Authentication with a Personal Access Token

The simplest and recommended way to start is with a GitHub Personal Access Token (PAT).

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**: https://github.com/settings/tokens
2. Click **Generate new token (classic)**.
3. Give it a name like `kampungsantri-admin` and select the **`repo`** scope.
4. Copy the token — GitHub only shows it once.
5. Open the published admin at `https://kampungsantri.or.id/admin/`  
   (or `https://ideal1st.github.io/kampungsantri/admin/` if you are not using a custom domain).
6. Paste the token into the login screen and click **Login**.

The token is stored in your browser's `localStorage` only. It is never sent to any other server.

## 2. How Content Is Configured

The dashboard loads `admin/config.yml`, which was generated from the repository's Jekyll structure. It contains:

- All Jekyll collections (`_posts`, `_agendas`, `_aktivitas`, `_cultures`, `_fasilitas`, `_visits`, `_misi`, `_psb`, `_schools`, `_teachers`, `_testimonies`, `_values`, `_guests`).
- Top-level pages (`aktivitas.markdown`, `pendidikan.markdown`, `psb.markdown`, `sambutan.markdown`, `index.html`, `404.md`).
- `_data/` files (`nav.yml`, `nav2.yml`, `carousel.yml`, `template.yml`).
- Media settings for `_uploads/`.
- Field-type hints used to render the editor.

You can customize `admin/config.yml` later to add new fields, rename labels, or change widget types.

## 3. Editing Content

1. Select a **Collection**, **Page**, **Data** file, or **Media** from the sidebar.
2. Edit the form fields.
3. Click **Simpan** to commit the change directly to the `gh-pages` branch.
4. Use **+ Baru** inside a collection to create a new post or entry.
5. In the **Media / Uploads** view, upload images or click a thumbnail to copy its public path for use in front-matter image fields.

## 4. Optional: GitHub OAuth Gateway

If you prefer not to share a PAT, or you want multi-user access, create a **GitHub OAuth App** and a small serverless gateway (for example, a Cloudflare Worker).

### 4.1 Create the GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps**.
2. Click **New OAuth App**.
3. Set **Authorization callback URL** to your gateway URL, e.g. `https://your-worker.your-account.workers.dev/auth`.
4. Copy the **Client ID** and **Client Secret**.

### 4.2 Example Cloudflare Worker Gateway

Store `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as Worker secrets.

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/auth') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response('Missing code', { status: 400 });
      }

      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code
        })
      });

      return new Response(res.body, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response('Admin OAuth gateway');
  }
};
```

The admin application can then be extended to:

1. Redirect the user to `https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&scope=repo&redirect_uri=YOUR_GATEWAY/auth`.
2. Receive the `code` from the redirect.
3. Call the gateway to exchange the `code` for an `access_token`.
4. Store the token in `localStorage` the same way the PAT flow does.

## 5. Local Testing

From the repository root:

```bash
jekyll serve
```

Then open `http://localhost:4000/admin/` in your browser. This also confirms the main Jekyll build is not broken by the new `admin/` folder.

## 6. Security Notes

- **Keep tokens private.** Never commit a token to the repository.
- **Always use HTTPS** when accessing the admin on a live site.
- The included PAT flow is designed for a trusted, single-user environment on a personal device.
- For shared or production use, prefer the OAuth gateway and fine-grained tokens.
- All changes are committed directly to the live `gh-pages` branch. There is no draft/publish step.
