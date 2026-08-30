window.Jekyll = (function () {
  const FRONT_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;

  function splitFile(text) {
    const m = text.match(FRONT_RE);
    if (!m) return { front: {}, body: text };
    const front = window.jsyaml.load(m[1]) || {};
    return { front, body: m[2] };
  }

  function composeFile(front, body) {
    const yaml = window.jsyaml.dump(front).trim();
    return `---\n${yaml}\n---\n\n${body}`;
  }

  function parseData(text) {
    return window.jsyaml.load(text) || {};
  }

  function dumpData(obj) {
    return window.jsyaml.dump(obj);
  }

  function slugify(s) {
    return (s || 'untitled').toString().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60);
  }

  function pad(n) {
    return n.toString().padStart(2, '0');
  }

  function dateString(d) {
    d = d || new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function postFilename(date, title) {
    const d = date ? new Date(date) : new Date();
    return `${dateString(d)}-${slugify(title)}.markdown`;
  }

  function slugFilename(title, ext) {
    ext = ext || 'md';
    return `${slugify(title)}.${ext}`;
  }

  return {
    splitFile,
    composeFile,
    parseData,
    dumpData,
    slugify,
    postFilename,
    slugFilename
  };
})();
