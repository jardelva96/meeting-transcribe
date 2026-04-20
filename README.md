<p align="center">
  <img src="docs/images/banner.svg" alt="Meeting Transcribe" width="100%"/>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285f4?logo=googlechrome&logoColor=white" alt="Chrome MV3"/></a>
  <a href="#"><img src="https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=000" alt="React 18"/></a>
  <a href="#"><img src="https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white" alt="Vite 6"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22d3ee" alt="MIT License"/></a>
  <a href="#"><img src="https://img.shields.io/badge/AI-OpenAI%20%7C%20Groq-a78bfa" alt="AI Providers"/></a>
</p>

<h1 align="center">Meeting Transcribe</h1>

<p align="center">
  Extensão Chrome que transcreve reuniões do <b>Google Meet</b> em tempo real, com painel lateral, ferramentas de IA e gerenciador completo de sessões em uma aba dedicada do navegador.
  <br/>
  Toda a transcrição e os dados ficam <b>salvos localmente no seu navegador</b> — nenhum servidor intermediário é usado.
</p>

---

## Prévia

<p align="center">
  <img src="docs/images/side-panel.svg" alt="Painel lateral com transcrição ao vivo" width="45%"/>
  &nbsp;&nbsp;
  <img src="docs/images/ai-tools.svg" alt="Ferramentas de IA" width="45%"/>
</p>

<p align="center">
  <i>Painel lateral com transcrição ao vivo e identificação de quem fala (esq.) e ferramentas de IA integradas (dir.)</i>
</p>

<p align="center">
  <img src="docs/images/manager.svg" alt="Gerenciador de sessões" width="92%"/>
</p>

<p align="center">
  <i>Gerenciador completo de sessões em aba dedicada do navegador</i>
</p>

---

## Visão geral

Meeting Transcribe tem dois modos de transcrição que funcionam em paralelo:

| Modo | Como funciona | Precisa de API? |
| --- | --- | :---: |
| **Google Meet CC** | Content script lê as legendas nativas do Meet direto do DOM, com speaker label e timestamp | ❌ Não |
| **Captura de áudio** | Captura o áudio da aba via `chrome.tabCapture` e envia para Whisper (Groq/OpenAI) | ✅ Sim |

Todas as sessões são persistidas em **IndexedDB** no próprio navegador. O histórico pode ser exportado em TXT ou JSON.

---

## Principais recursos

- **Painel lateral nativo** do Chrome (Side Panel API)
- **Transcrição em tempo real** com identificação de quem fala
- **Gerenciador de sessões** em aba dedicada (`manager.html`)
- **Ferramentas de IA** sobre a transcrição completa:
  - Resumo da reunião
  - Action items e próximos passos
  - E-mail de follow-up pronto
  - Perguntas e respostas (Q&A)
  - Análise de insights e tom da reunião
  - Pergunta livre via chat (ask-anything)
- **Exportação** para TXT e JSON
- **Notas livres** por sessão
- **Atalhos globais** (`Ctrl+Shift+T` / `Ctrl+Shift+M`)
- **Detecção automática** quando o usuário entra em uma chamada do Meet
- Suporte a **OpenAI** (gpt-4o-mini + whisper-1) e **Groq** (llama-3.3-70b + whisper-large-v3)
- **100% local** — chave de API fica no `localStorage`, nada é enviado para servidores terceiros

---

## Stack e arquitetura

<p align="center">
  <img src="docs/images/architecture.svg" alt="Arquitetura da extensão" width="92%"/>
</p>

| Camada | Tecnologia |
| --- | --- |
| Framework | React 18 |
| Bundler | Vite 6 (multi-entry: `sidepanel.html`, `popup.html`, `manager.html`) |
| Manifest | Chrome Extensions MV3 |
| Ícones | Lucide React (SVG) + PNGs gerados via Jimp |
| Detecção de voz | `hark.js` sobre `MediaStreamAudioSourceNode` |
| Banco local | IndexedDB (implementação custom em `src/services/db.js`) |
| Comunicação CS ↔ Panel | `chrome.storage.session` + `chrome.storage.onChanged` |
| Transcrição (áudio) | Whisper via Groq / OpenAI API |
| Geração com IA | OpenAI `gpt-4o-mini` ou Groq `llama-3.3-70b-versatile` |

### Estrutura de pastas

```
meeting-transcribe/
├── public/
│   ├── manifest.json          # Manifest V3
│   ├── service-worker.js      # background worker
│   ├── content-script.js      # leitor de CC do Meet
│   └── icons/                 # icon16.png, icon48.png, icon128.png
├── scripts/
│   └── gen-icons.js           # geração de PNGs via Jimp
├── src/
│   ├── App.jsx                # painel lateral principal
│   ├── components/
│   │   ├── AIChat.jsx         # chat de IA do side panel
│   │   ├── AIPanel.jsx        # painel de IA do manager
│   │   ├── Modal.jsx          # modal de confirmação custom
│   │   ├── Settings.jsx       # configuração de provedor/token
│   │   └── Sessions.jsx       # listagem de sessões salvas
│   ├── hooks/
│   │   ├── useDatabase.js     # wrapper sobre IndexedDB
│   │   ├── useSystemAudio.js  # captura de áudio da aba
│   │   └── useMeetCaption.js  # listener de captions do Meet
│   ├── manager/
│   │   ├── Manager.jsx        # aba de gerenciamento completa
│   │   └── manager.css
│   ├── popup/
│   │   └── Popup.jsx          # popup do ícone da extensão
│   ├── services/
│   │   ├── ai.js              # chamadas de chat completion
│   │   ├── db.js              # IndexedDB (sessions + entries)
│   │   └── groq.js            # transcrição via Whisper
│   └── styles/
│       └── app.css            # design system do painel
├── popup.html
├── sidepanel.html
├── manager.html
├── docs/
│   └── images/                # assets do README
└── vite.config.js             # multi-entry
```

---

## Instalação (uso local)

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/jardelva96/meeting-transcribe.git
cd meeting-transcribe
npm install
```

### 2. Build

```bash
npm run build
```

A pasta `dist/` conterá a extensão pronta.

### 3. Carregar no Chrome

1. Abra `chrome://extensions`
2. Ative o **Modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `dist/`
5. Pronto. O ícone de microfone aparecerá na barra do Chrome.

### 4. (Opcional) Configurar a IA

Clique no ícone da engrenagem no painel lateral → escolha **OpenAI** ou **Groq** → cole sua chave de API.

- OpenAI: https://platform.openai.com/api-keys
- Groq: https://console.groq.com/keys

A chave é salva apenas em `localStorage` e nunca sai do seu navegador.

---

## Como usar

### Em uma reunião do Google Meet

1. Entre na chamada.
2. Clique no botão **CC** (legendas) no rodapé do Meet.
3. Abra o painel lateral pela extensão ou com `Ctrl+Shift+M`.
4. A transcrição aparece automaticamente — **sem precisar de chave de API**.
5. Encerre a sessão pelo botão de parar quando quiser arquivar.

### Em qualquer outra reunião (Zoom, Teams, YouTube, etc.)

1. Abra o painel lateral.
2. Clique no botão âmbar de gravar (ou `Ctrl+Shift+T`).
3. O áudio da aba atual é capturado e enviado em trechos para o Whisper.
4. A transcrição aparece em tempo real.

### Ferramentas de IA

Na aba **Ferramentas de IA** você pode usar ações rápidas ou fazer perguntas livres sobre o conteúdo da reunião atual. Tudo roda sobre a transcrição, sem reenvio do áudio.

### Gerenciador

Clique no ícone de grade na topbar para abrir o **Manager** em uma aba nova: busca por reunião, histórico completo, exportação, exclusão com confirmação e execução de IA em sessões antigas.

---

## Atalhos

| Atalho | Ação |
| --- | --- |
| `Ctrl+Shift+T` | Iniciar / parar gravação de áudio |
| `Ctrl+Shift+M` | Abrir o painel lateral |

*(No macOS, `Cmd` no lugar de `Ctrl`.)*

---

## Permissões solicitadas

| Permissão | Motivo |
| --- | --- |
| `tabCapture` | capturar o áudio da aba para transcrição |
| `storage` | persistir configurações e sessões |
| `activeTab` | identificar a aba atual para captura |
| `sidePanel` | mostrar o painel lateral |
| `tabs` | abrir o gerenciador em nova aba |
| `host_permissions: https://meet.google.com/*` | injetar o content script que lê o CC |

Nenhuma dessas permissões envolve leitura do conteúdo de outras páginas além do Google Meet.

---

## Privacidade

- **O áudio nunca passa por um servidor do projeto.** Quando você usa o modo Whisper, o áudio vai diretamente do seu navegador para a API do provedor que você configurou (OpenAI ou Groq).
- **Transcrições ficam em IndexedDB local.** Nada é sincronizado para a nuvem.
- **Chaves de API ficam em `localStorage` do navegador.**
- **Content script do Meet** apenas lê as legendas já geradas pelo próprio Google — não grava nada, não intercepta áudio bruto.

---

## Desenvolvimento

```bash
npm run dev                 # Vite dev server (útil para testar UI fora da extensão)
npm run build               # gera dist/ pronta para carregar como unpacked extension
node scripts/gen-icons.js   # regenera os PNGs da extensão
```

Para recarregar as mudanças na extensão, use o botão de reload em `chrome://extensions`.

---

## Roadmap

- [ ] Limpeza automática de sessões antigas (> 90 dias, opt-in)
- [ ] Suporte ao CC do Microsoft Teams
- [ ] Upload de áudio para transcrição offline de reuniões já gravadas
- [ ] Modo claro / escuro configurável
- [ ] Integração com Google Drive para backup automático
- [ ] Importação de transcrições em TXT / VTT / SRT

---

## Licença e direitos autorais

Copyright © 2026 **Jardel Vieira Alves**. Todos os direitos reservados.

Distribuído sob a [Licença MIT](LICENSE) — você pode usar, copiar, modificar, incorporar em outros produtos e distribuir, desde que mantenha o aviso de copyright e a licença original.

Este software é fornecido "como está", sem garantias de qualquer tipo. Consulte o arquivo [LICENSE](LICENSE) para os termos completos.

### Marcas registradas

- *Google Meet* é uma marca registrada do Google LLC. Este projeto não é afiliado, endossado ou mantido pelo Google.
- *OpenAI*, *Whisper* e *GPT* são marcas registradas da OpenAI, L.L.C.
- *Groq* e *Llama* são marcas registradas de seus respectivos detentores.

---

## Autor

**Jardel Vieira Alves**
[github.com/jardelva96](https://github.com/jardelva96)

Contribuições, issues e sugestões são bem-vindas.
