// Servidor Node.js completo com PWA integrado (sem arquivos externos)
const express = require("express");
const app = express();
const PORT = 3000;

// ---------------------------
// HTML principal do PWA
// ---------------------------
const html = `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Registro de Troca de Óleo - Moto</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#111827" />
  <style>
    body {font-family: Arial, sans-serif; background: #0f1724; color: #e6eef8; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;}
    .container {background: #111827; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.4); width: 350px;}
    h1 {font-size: 18px; margin-bottom: 12px; text-align:center;}
    label {display: block; margin-top: 10px;}
    input {width: 100%; padding: 8px; margin-top: 5px; border-radius: 6px; border: none; background: #1f2937; color: #e6eef8;}
    button {width: 100%; padding: 10px; margin-top: 12px; border: none; border-radius: 6px; background: #f59e0b; color: #111827; font-weight: bold; cursor: pointer;}
    button:hover {background: #fbbf24;}
    .muted {font-size: 13px; color: #9ca3af; margin-top: 10px; text-align: center;}
    ul {list-style: none; padding: 0; margin-top: 10px; max-height: 150px; overflow-y: auto; background: #1f2937; border-radius: 6px;}
    li {padding: 8px; border-bottom: 1px solid #374151;}
    li:last-child {border-bottom: none;}
    .alerta {color: #f87171; font-weight: bold;}
  </style>
</head>
<body>
  <div class="container">
    <h1>Registro de Troca de Óleo</h1>
    <label>Quilometragem atual da moto:</label>
    <input type="number" id="kmAtual" placeholder="Ex: 32000" />
    <label>Intervalo de troca (em km):</label>
    <input type="number" id="intervalo" placeholder="Ex: 1000" value="1000" />
    <button id="calcular">Registrar troca</button>
    <div id="resultado" class="muted">Preencha os campos e clique em registrar.</div>
    <h2 style="font-size:15px; margin-top:15px;">Histórico de trocas</h2>
    <ul id="historico"></ul>
    <button id="instalar" style="display:none;background:#10b981;">Instalar app</button>
    <button id="reinstalar" style="display:none;background:#3b82f6;">Reinstalar app</button>
  </div>

  <script>
    const STORAGE_KEY = 'registroOleoMoto';
    const HISTORICO_KEY = 'historicoTrocasMoto';
    let installPrompt;

    document.getElementById('calcular').addEventListener('click', () => {
      const kmAtual = parseInt(document.getElementById('kmAtual').value);
      const intervalo = parseInt(document.getElementById('intervalo').value);

      if (isNaN(kmAtual) || isNaN(intervalo)) {
        document.getElementById('resultado').textContent = 'Preencha os dois campos corretamente.';
        return;
      }

      const proximaTroca = kmAtual + intervalo;
      const data = new Date().toLocaleString();

      localStorage.removeItem(HISTORICO_KEY);
      const historico = [{ kmAtual, proximaTroca, data }];
      localStorage.setItem(HISTORICO_KEY, JSON.stringify(historico));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ kmAtual, intervalo, proximaTroca, data }));

      exibirUltimoRegistro({ kmAtual, proximaTroca });
      atualizarHistorico();
    });

    function exibirUltimoRegistro({ kmAtual, proximaTroca }) {
      const alerta = kmAtual >= proximaTroca ? '⚠️ <span class="alerta">Troca vencida!</span>' : '';
      document.getElementById('resultado').innerHTML = \`
        Último registro salvo:<br>
        <strong>Atual:</strong> \${kmAtual} km<br>
        <strong>Próxima troca:</strong> \${proximaTroca} km \${alerta}
      \`;
    }

    function atualizarHistorico() {
      const historico = JSON.parse(localStorage.getItem(HISTORICO_KEY)) || [];
      const lista = document.getElementById('historico');
      lista.innerHTML = '';
      historico.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = \`<strong>\${item.data}</strong><br>Atual: \${item.kmAtual} km → Próxima: \${item.proximaTroca} km\`;
        lista.appendChild(li);
      });
    }

    window.addEventListener('load', () => {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const { kmAtual, proximaTroca } = JSON.parse(data);
        exibirUltimoRegistro({ kmAtual, proximaTroca });
      }
      atualizarHistorico();

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => {
            console.log('Service Worker registrado.');

            // Mostra botão "Reinstalar" se houver nova versão
            reg.onupdatefound = () => {
              const newWorker = reg.installing;
              newWorker.onstatechange = () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  document.getElementById('reinstalar').style.display = 'block';
                }
              };
            };
          })
          .catch(err => console.log('Erro ao registrar Service Worker:', err));
      }
    });

    // Botão de instalação PWA
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      installPrompt = e;
      document.getElementById('instalar').style.display = 'block';
    });

    document.getElementById('instalar').addEventListener('click', async () => {
      if (installPrompt) {
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        console.log('Instalação:', outcome);
        installPrompt = null;
        document.getElementById('instalar').style.display = 'none';
      }
    });

    // Botão de reinstalar (atualizar app)
    document.getElementById('reinstalar').addEventListener('click', async () => {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.update();
        }
        alert('App atualizado! Recarregue a página.');
        document.getElementById('reinstalar').style.display = 'none';
      }
    });
  </script>
</body>
</html>
`;

// ---------------------------
// Manifesto do PWA
// ---------------------------
const manifest = {
  name: "Registros de Troca de Óleo",
  short_name: "Troca de Óleo",
  start_url: "./",
  display: "standalone",
  background_color: "#111827",
  theme_color: "#111827",
  icons: [
    { src: "https://imgs.search.brave.com/KVTqxmUy0jUw22IYmm2nd0GSPSxcBWLWs0ZYZOyb304/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9jZG4t/aWNvbnMtcG5nLmZs/YXRpY29uLmNvbS81/MTIvMjkwLzI5MDEz/NS5wbmc", sizes: "192x192", type: "image/png" },
    { src: "https://imgs.search.brave.com/KVTqxmUy0jUw22IYmm2nd0GSPSxcBWLWs0ZYZOyb304/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9jZG4t/aWNvbnMtcG5nLmZs/YXRpY29uLmNvbS81/MTIvMjkwLzI5MDEz/NS5wbmc", sizes: "512x512", type: "image/png" }
  ]
};

// ---------------------------
// Service Worker
// ---------------------------
const serviceWorker = `
const cacheName = 'registro-oleo-cache-v5'; // versão nova!
const assets = ['./', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== cacheName).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request)));
});
`;

// ---------------------------
// Rotas do servidor
// ---------------------------
app.get('/', (req, res) => res.send(html));
app.get('/manifest.json', (req, res) => {
  res.type('application/json');
  res.send(JSON.stringify(manifest));
});
app.get('/service-worker.js', (req, res) => {
  res.type('text/javascript');
  res.send(serviceWorker);
});

// ---------------------------
app.listen(PORT, () => console.log("PWA rodando em http://localhost:" + PORT));
