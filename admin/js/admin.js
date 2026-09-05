(function () {
  let CONFIG = null;
  let CURRENT = null;
  let activeImageInput = null;

  const $ = (id) => document.getElementById(id);

  function init() {
    fetch('config.yml')
      .then(r => {
        if (!r.ok) throw new Error('Tidak dapat memuat admin/config.yml');
        return r.text();
      })
      .then(text => {
        CONFIG = window.jsyaml.load(text);
        window.GitHub.init(CONFIG.site);
        bindLogin();
      })
      .catch(err => {
        alert(err.message);
      });
  }

  function bindLogin() {
    const token = window.GitHub.getToken();
    if (token) {
      window.GitHub.setToken(token);
      startApp();
    } else {
      $('login-screen').hidden = false;
      $('main-screen').hidden = true;
      $('login-btn').onclick = doLogin;
      $('token-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doLogin();
      });
    }
  }

  async function doLogin() {
    const token = $('token-input').value.trim();
    if (!token) return;
    window.GitHub.setToken(token);
    try {
      await window.GitHub.getUser();
      await startApp();
    } catch (e) {
      $('login-error').textContent = e.message;
      window.GitHub.removeToken();
    }
  }

  async function startApp() {
    $('login-screen').hidden = true;
    $('main-screen').hidden = false;
    $('logout').hidden = false;
    $('logout').onclick = () => {
      window.GitHub.removeToken();
      location.reload();
    };
    try {
      const user = await window.GitHub.getUser();
      $('user-info').textContent = user.login;
      renderSidebar();
      showHome();
    } catch (e) {
      alert(e.message);
      window.GitHub.removeToken();
      location.reload();
    }
  }

  function renderSidebar() {
    const sb = $('sidebar');
    sb.innerHTML = '';

    const addSection = (title, items, clickFn) => {
      const h = document.createElement('h3');
      h.textContent = title;
      sb.appendChild(h);
      const ul = document.createElement('ul');
      items.forEach(it => {
        const li = document.createElement('li');
        li.textContent = it.label;
        li.onclick = () => clickFn(it);
        ul.appendChild(li);
      });
      sb.appendChild(ul);
    };

    addSection('Collections', CONFIG.collections, loadCollection);
    addSection('Pages', CONFIG.pages, loadPage);
    addSection('Data', CONFIG.data, loadData);

    const mh = document.createElement('h3');
    mh.textContent = 'Media';
    sb.appendChild(mh);
    const mul = document.createElement('ul');
    const mli = document.createElement('li');
    mli.textContent = 'Uploads';
    mli.onclick = loadMedia;
    mul.appendChild(mli);
    sb.appendChild(mul);
  }

  function showHome() {
    $('workspace').innerHTML = '<h2>Selamat datang di Admin</h2><p>Pilih konten di sidebar untuk mengedit.</p>';
  }

  function message(text, isError) {
    const d = document.createElement('div');
    d.className = 'message' + (isError ? ' error' : '');
    d.textContent = text;
    return d;
  }

  async function loadCollection(collection) {
    const ws = $('workspace');
    ws.innerHTML = `<h2>${collection.label}</h2>`;
    const newBtn = document.createElement('button');
    newBtn.textContent = '+ Baru';
    newBtn.onclick = () => newCollectionItem(collection);
    ws.appendChild(newBtn);
    const list = document.createElement('ul');
    list.className = 'item-list';
    try {
      const items = await window.GitHub.listDir(collection.folder);
      items.sort((a, b) => a.name.localeCompare(b.name));
      items.forEach(it => {
        if (it.type !== 'file' || it.name === 'README.md') return;
        const li = document.createElement('li');
        li.textContent = it.name;
        li.onclick = () => openCollectionItem(collection, it.path);
        list.appendChild(li);
      });
      ws.appendChild(list);
    } catch (e) {
      ws.appendChild(message(e.message, true));
    }
  }

  async function openCollectionItem(collection, path) {
    const ws = $('workspace');
    ws.innerHTML = `<h2>${path}</h2>`;
    try {
      const file = await window.GitHub.getFile(path);
      const parsed = window.Jekyll.splitFile(file.text);
      CURRENT = {
        type: 'collection',
        collection,
        path,
        sha: file.sha,
        front: parsed.front,
        body: parsed.body
      };
      renderEditor();
    } catch (e) {
      ws.appendChild(message(e.message, true));
    }
  }

  async function loadPage(page) {
    const ws = $('workspace');
    ws.innerHTML = `<h2>${page.label}</h2>`;
    try {
      const file = await window.GitHub.getFile(page.file);
      const parsed = window.Jekyll.splitFile(file.text);
      CURRENT = {
        type: 'page',
        page,
        path: page.file,
        sha: file.sha,
        front: parsed.front,
        body: parsed.body
      };
      renderEditor();
    } catch (e) {
      ws.appendChild(message(e.message, true));
    }
  }

  async function loadData(data) {
    const ws = $('workspace');
    ws.innerHTML = `<h2>${data.label}</h2>`;
    try {
      const file = await window.GitHub.getFile(data.file);
      const obj = window.Jekyll.parseData(file.text);
      CURRENT = {
        type: 'data',
        data,
        path: data.file,
        sha: file.sha,
        obj
      };
      renderDataEditor();
    } catch (e) {
      ws.appendChild(message(e.message, true));
    }
  }

  function renderDataEditor() {
    const ws = $('workspace');
    const form = document.createElement('div');
    const row = document.createElement('div');
    row.className = 'form-row';
    const label = document.createElement('label');
    label.textContent = 'YAML';
    const ta = document.createElement('textarea');
    ta.id = 'data-yaml';
    ta.rows = 24;
    ta.value = window.Jekyll.dumpData(CURRENT.obj);
    row.appendChild(label);
    row.appendChild(ta);
    form.appendChild(row);

    const act = document.createElement('div');
    act.className = 'actions';
    const save = document.createElement('button');
    save.textContent = 'Simpan';
    save.onclick = saveData;
    act.appendChild(save);
    form.appendChild(act);
    ws.appendChild(form);
  }

  async function saveData() {
    try {
      const obj = window.jsyaml.load($('data-yaml').value);
      const text = window.Jekyll.dumpData(obj);
      const res = await window.GitHub.putFile(CURRENT.path, text, CURRENT.sha, `Update ${CURRENT.path}`);
      CURRENT.sha = res.content.sha;
      CURRENT.obj = obj;
      $('workspace').insertBefore(message('Data disimpan.'), $('workspace').firstChild);
    } catch (e) {
      alert('Gagal menyimpan: ' + e.message);
    }
  }

  function fieldType(name) {
    return (CONFIG.field_types && CONFIG.field_types[name]) || { label: name, widget: 'string' };
  }

  function inferWidget(value, spec) {
    if (spec && spec.widget) return spec;
    if (typeof value === 'number') return { widget: 'number' };
    if (typeof value === 'boolean') return { widget: 'boolean' };
    if (value !== null && typeof value === 'object') return { widget: 'yaml' };
    return { widget: 'string' };
  }

  function createFieldRow(key, value) {
    const spec = fieldType(key);
    const info = inferWidget(value, spec);
    const row = document.createElement('div');
    row.className = 'form-row';
    const label = document.createElement('label');
    label.textContent = spec.label || key;
    row.appendChild(label);

    let input;
    if (info.widget === 'text' || info.widget === 'markdown') {
      input = document.createElement('textarea');
      input.id = 'field-' + key;
      input.value = value === null || value === undefined ? '' : value;
      input.rows = 4;
    } else if (info.widget === 'yaml') {
      input = document.createElement('textarea');
      input.id = 'field-' + key;
      input.value = window.jsyaml.dump(value).trim();
      input.rows = 8;
      input.style.fontFamily = 'monospace';
    } else if (info.widget === 'select') {
      input = document.createElement('select');
      input.id = 'field-' + key;
      (info.options || []).forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        if (value === opt) o.selected = true;
        input.appendChild(o);
      });
      if (!info.options || !info.options.length) {
        const o = document.createElement('option');
        o.value = value || '';
        o.textContent = value || '';
        input.appendChild(o);
      }
    } else if (info.widget === 'boolean') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.id = 'field-' + key;
      input.checked = !!value;
    } else if (info.widget === 'number') {
      input = document.createElement('input');
      input.type = 'number';
      input.id = 'field-' + key;
      input.value = value === null || value === undefined ? '' : value;
    } else if (info.widget === 'image') {
      const wrap = document.createElement('div');
      wrap.className = 'img-field';
      input = document.createElement('input');
      input.type = 'text';
      input.id = 'field-' + key;
      input.value = value === null || value === undefined ? '' : value;
      const pick = document.createElement('button');
      pick.textContent = 'Pilih';
      pick.type = 'button';
      pick.onclick = (ev) => {
        ev.preventDefault();
        openImagePicker(input);
      };
      wrap.appendChild(input);
      wrap.appendChild(pick);
      row.appendChild(wrap);
      return row;
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.id = 'field-' + key;
      input.value = value === null || value === undefined ? '' : value;
    }
    row.appendChild(input);
    return row;
  }

  function renderEditor() {
    const ws = $('workspace');
    ws.innerHTML = '<h2>' + (CURRENT.path) + '</h2>';
    const form = document.createElement('div');

    Object.keys(CURRENT.front).forEach(key => {
      form.appendChild(createFieldRow(key, CURRENT.front[key]));
    });

    const bodyRow = document.createElement('div');
    bodyRow.className = 'form-row editor-body';
    const bodyLabel = document.createElement('label');
    bodyLabel.textContent = fieldType('body').label || 'Body';
    const bodyTa = document.createElement('textarea');
    bodyTa.id = 'field-body';
    bodyTa.value = CURRENT.body;
    const preview = document.createElement('div');
    preview.className = 'preview';
    preview.innerHTML = typeof window.marked.parse === 'function' ? window.marked.parse(CURRENT.body || '') : CURRENT.body || '';
    bodyTa.oninput = () => {
      preview.innerHTML = typeof window.marked.parse === 'function' ? window.marked.parse(bodyTa.value || '') : bodyTa.value || '';
    };
    bodyRow.appendChild(bodyLabel);
    bodyRow.appendChild(bodyTa);
    bodyRow.appendChild(preview);
    form.appendChild(bodyRow);

    const act = document.createElement('div');
    act.className = 'actions';
    const save = document.createElement('button');
    save.textContent = 'Simpan';
    save.onclick = saveEditor;
    act.appendChild(save);
    if (CURRENT.type === 'collection') {
      const dup = document.createElement('button');
      dup.textContent = 'Duplikat';
      dup.onclick = duplicateItem;
      act.appendChild(dup);
    }
    const del = document.createElement('button');
    del.textContent = 'Hapus';
    del.className = 'danger';
    del.onclick = deleteItem;
    act.appendChild(del);
    form.appendChild(act);
    ws.appendChild(form);
  }

  async function saveEditor() {
    try {
      const front = {};
      Object.keys(CURRENT.front).forEach(key => {
        const spec = fieldType(key);
        const info = inferWidget(CURRENT.front[key], spec);
        const el = document.getElementById('field-' + key);
        let val;
        if (!el) {
          val = CURRENT.front[key];
        } else if (info.widget === 'boolean') {
          val = el.checked;
        } else if (info.widget === 'number') {
          val = el.value === '' ? null : Number(el.value);
        } else if (info.widget === 'yaml') {
          val = window.jsyaml.load(el.value);
        } else if (info.widget === 'select') {
          val = el.value;
        } else if (el.value !== undefined) {
          val = el.value;
        } else {
          val = CURRENT.front[key];
        }
        if (val === '') val = null;
        front[key] = val;
      });

      const body = $('field-body').value;
      const text = window.Jekyll.composeFile(front, body);
      const res = await window.GitHub.putFile(CURRENT.path, text, CURRENT.sha, `Update ${CURRENT.path}`);
      CURRENT.sha = res.content.sha;
      CURRENT.front = front;
      CURRENT.body = body;
      $('workspace').insertBefore(message('Disimpan.'), $('workspace').firstChild);
    } catch (e) {
      alert('Gagal menyimpan: ' + e.message);
    }
  }

  async function deleteItem() {
    if (!confirm('Hapus file ini?')) return;
    try {
      await window.GitHub.deleteFile(CURRENT.path, CURRENT.sha, `Delete ${CURRENT.path}`);
      $('workspace').innerHTML = '<h2>Terhapus</h2>' + message('File telah dihapus.');
    } catch (e) {
      alert(e.message);
    }
  }

  async function getTemplateFront(collection) {
    try {
      const items = await window.GitHub.listDir(collection.folder);
      const first = items
        .filter(it => it.type === 'file' && (it.name.endsWith('.md') || it.name.endsWith('.markdown')))
        .sort((a, b) => a.name.localeCompare(b.name))[0];
      if (first) {
        const file = await window.GitHub.getFile(first.path);
        const parsed = window.Jekyll.splitFile(file.text);
        return { front: parsed.front, ext: first.name.split('.').pop() };
      }
    } catch (e) { /* ignore */ }
    return { front: {}, ext: 'markdown' };
  }

  async function newCollectionItem(collection) {
    const title = prompt('Judul baru:');
    if (!title) return;
    const { front: template, ext } = await getTemplateFront(collection);
    const filename = collection.name === 'posts'
      ? window.Jekyll.postFilename(null, title)
      : window.Jekyll.slugFilename(title, ext || 'markdown');
    const path = collection.folder + '/' + filename;
    const front = {};
    if (template && Object.keys(template).length) {
      Object.keys(template).forEach(key => {
        if (key === 'title') front[key] = title;
        else if (key === 'date') front[key] = new Date().toISOString();
        else if (typeof template[key] === 'number') front[key] = null;
        else if (typeof template[key] === 'boolean') front[key] = false;
        else if (template[key] !== null && typeof template[key] === 'object') front[key] = null;
        else front[key] = null;
      });
    } else {
      front.title = title;
      front.date = new Date().toISOString();
      front.layout = collection.name === 'posts' ? 'page' : 'default';
    }
    const text = window.Jekyll.composeFile(front, '');
    try {
      const res = await window.GitHub.putFile(path, text, undefined, `Create ${title}`);
      CURRENT = {
        type: 'collection',
        collection,
        path,
        sha: res.content.sha,
        front,
        body: ''
      };
      renderEditor();
    } catch (e) {
      alert(e.message);
    }
  }

  async function duplicateItem() {
    if (CURRENT.type !== 'collection') return;
    const title = prompt('Judul duplikat:', (CURRENT.front.title || 'Copy') + ' (Copy)');
    if (!title) return;
    const ext = CURRENT.path.split('.').pop() || 'markdown';
    const filename = window.Jekyll.slugFilename(title, ext);
    const path = CURRENT.collection.folder + '/' + filename;
    const front = Object.assign({}, CURRENT.front);
    front.title = title;
    if ('date' in front) front.date = new Date().toISOString();
    const text = window.Jekyll.composeFile(front, CURRENT.body);
    try {
      const res = await window.GitHub.putFile(path, text, undefined, `Duplicate ${title} from ${CURRENT.path}`);
      CURRENT = {
        type: 'collection',
        collection: CURRENT.collection,
        path,
        sha: res.content.sha,
        front,
        body: CURRENT.body
      };
      renderEditor();
      $('workspace').insertBefore(message('Duplikat dibuat.'), $('workspace').firstChild);
    } catch (e) {
      alert(e.message);
    }
  }

  async function loadMedia() {
    const ws = $('workspace');
    ws.innerHTML = '<h2>Media Library</h2><p>Kelola koleksi gambar di _uploads.</p>';

    const up = document.createElement('div');
    up.className = 'form-row';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    const upBtn = document.createElement('button');
    upBtn.textContent = 'Upload';
    upBtn.onclick = () => uploadMedia(fileInput);
    up.appendChild(fileInput);
    up.appendChild(upBtn);
    ws.appendChild(up);

    const grid = document.createElement('div');
    grid.className = 'media-grid';
    grid.id = 'media-grid';
    ws.appendChild(grid);

    try {
      const items = await window.GitHub.listDir(CONFIG.media.folder);
      items.sort((a, b) => a.name.localeCompare(b.name));
      items.forEach(it => {
        if (it.type !== 'file') return;
        const div = document.createElement('div');
        div.className = 'media-item';
        const img = document.createElement('img');
        img.src = `https://raw.githubusercontent.com/${CONFIG.site.owner}/${CONFIG.site.repo}/${CONFIG.site.branch}/${it.path}`;
        img.onerror = () => { img.hidden = true; };
        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = it.name;
        const size = document.createElement('div');
        size.className = 'size';
        size.textContent = formatBytes(it.size);
        const path = `${CONFIG.site.public_folder}${it.name}`;
        const copy = document.createElement('button');
        copy.textContent = 'Copy';
        copy.onclick = () => { navigator.clipboard.writeText(path); copy.textContent = 'Copied!'; };
        const del = document.createElement('button');
        del.textContent = 'Delete';
        del.className = 'danger';
        del.onclick = async () => { if (confirm(`Hapus ${it.name}?`)) await deleteMedia(it.path, it.sha); };
        const actions = document.createElement('div');
        actions.className = 'actions';
        actions.appendChild(copy);
        actions.appendChild(del);
        div.appendChild(img);
        div.appendChild(name);
        div.appendChild(size);
        div.appendChild(actions);
        grid.appendChild(div);
      });
    } catch (e) {
      ws.appendChild(message(e.message, true));
    }
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async function uploadMedia(input) {
    const files = Array.from(input.files);
    if (!files.length) return;
    for (const file of files) {
      try {
        const b64 = await readFileAsDataURL(file);
        const path = CONFIG.media.folder + '/' + file.name;
        await window.GitHub.putFileRaw(path, b64, undefined, `Upload ${file.name}`);
      } catch (e) {
        alert(e.message);
        return;
      }
    }
    loadMedia();
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function deleteMedia(path, sha) {
    try {
      await window.GitHub.deleteFile(path, sha, `Delete ${path}`);
      loadMedia();
    } catch (e) {
      alert(e.message);
    }
  }

  function openImagePicker(input) {
    activeImageInput = input;
    const modal = $('media-modal');
    modal.hidden = false;
    const list = $('media-list');
    list.innerHTML = '';
    window.GitHub.listDir(CONFIG.media.folder).then(items => {
      items.forEach(it => {
        if (it.type !== 'file') return;
        const div = document.createElement('div');
        div.className = 'media-thumb';
        div.title = it.name;
        const img = document.createElement('img');
        img.src = `https://raw.githubusercontent.com/${CONFIG.site.owner}/${CONFIG.site.repo}/${CONFIG.site.branch}/${it.path}`;
        img.onerror = () => { img.hidden = true; };
        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = it.name;
        div.appendChild(img);
        div.appendChild(name);
        div.onclick = () => {
          activeImageInput.value = `${CONFIG.site.public_folder}${it.name}`;
          modal.hidden = true;
        };
        list.appendChild(div);
      });
    });
  }

  $('close-media').onclick = () => {
    $('media-modal').hidden = true;
  };

  init();
})();
