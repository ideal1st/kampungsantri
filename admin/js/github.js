window.GitHub = (function () {
  let cfg = {};

  function getToken() {
    return localStorage.getItem('gh_token');
  }

  function setToken(token) {
    if (token) localStorage.setItem('gh_token', token);
  }

  function removeToken() {
    localStorage.removeItem('gh_token');
  }

  function base64Encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function base64Decode(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\s/g, ''))));
  }

  async function api(path, options) {
    const token = getToken();
    const headers = {
      'Accept': 'application/vnd.github+json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}${path}`;
    const res = await fetch(url, Object.assign({}, options, {
      headers: Object.assign({}, headers, options && options.headers || {})
    }));

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `GitHub API error ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function listDir(path, ref) {
    ref = ref || cfg.branch;
    return api(`/contents/${path}?ref=${ref}`);
  }

  async function getFile(path, ref) {
    ref = ref || cfg.branch;
    const data = await api(`/contents/${path}?ref=${ref}`);
    const text = base64Decode(data.content);
    return { path, sha: data.sha, text, data };
  }

  async function putFileRaw(path, b64Content, sha, message, branch) {
    const body = {
      message: message || `Update ${path}`,
      content: b64Content,
      branch: branch || cfg.branch
    };
    if (sha) body.sha = sha;
    return api(`/contents/${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  function putFile(path, text, sha, message, branch) {
    return putFileRaw(path, base64Encode(text), sha, message, branch);
  }

  function deleteFile(path, sha, message, branch) {
    return api(`/contents/${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message || `Delete ${path}`,
        sha,
        branch: branch || cfg.branch
      })
    });
  }

  return {
    init: (config) => { cfg = config; },
    getToken,
    setToken,
    removeToken,
    base64Encode,
    base64Decode,
    api,
    listDir,
    getFile,
    putFile,
    putFileRaw,
    deleteFile
  };
})();
