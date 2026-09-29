# 🔥 Bot-Zap v4.0 — MODO ESPIÃO

> O bot mais cabuloso do WhatsApp. Invisível. Completo. Impiedoso.

Bot pessoal WhatsApp que transforma seu zap numa **máquina de inteligência**: view-once, anti-delete, anti-edit, fantasma, stalker de perfis, analytics de padrões, detector de dispositivos, salvador de stories, espião de reações e muito mais.

---

## 🔥 O que faz (v4.0)

### Core — Nunca Perder Nada

| Feature | Detalhe |
|---|---|
| **👁️ View-Once Absoluto** | 7 camadas de wrappers + 5 estratégias de download. Salva automático sem comando |
| **✏️ Anti-Edit Total** | Chain completa de edições: original → todas as versões |
| **🗑️ Anti-Delete** | Cache RAM + DISCO 72h. Texto e mídia |
| **👻 Fantasma** | Espelha sem marcar azul. Filtros por contato |

### v4.0 — Modo Espião

| Feature | Detalhe |
|---|---|
| **🔥 `!stalk`** | Stalker completo: foto de perfil, about, grupos em comum, dispositivos, padrões, tempo de resposta |
| **📊 `!analytics`** | Dashboard com gráficos ASCII de atividade por hora/dia, dispositivos, top palavras |
| **🧠 `!patterns`** | Horários de pico, horários inativos, dia mais ativo, palavras mais usadas |
| **⏱️ `!speed`** | Velocidade de resposta: média, mediana, min, max |
| **🔗 `!network`** | Mapa de conexões entre alvos via grupos em comum |
| **📸 Status Saver** | Baixa stories automaticamente dos contatos observados |
| **😂 Reaction Spy** | Detecta reações (emojis) nas suas mensagens |
| **✅ Read Spy** | Detecta quem leu suas msgs + digitando/gravando pra você |
| **📱 Device Spy** | Detecta iPhone/Android/Web + notifica mudanças |
| **🚨 Smart Alerts** | Detecta atividade em horários incomuns (ex: 3h da manhã) |

---

## 🚀 Instalação

```bash
npm install
# edite config.js → OWNER_NUMBER
node index.js              # QR no console
# ou 24/7
pm2 start ecosystem.config.cjs
pm2 logs viewonce-bot
```

### Windows

```bat
install.bat
start.bat          # simples
start-pm2.bat      # 24h background
logs.bat           # ver QR/logs
```

---

## ⌨️ Comandos

### Rápidos
```
.o.              revela VO citado (silencioso)
.1               pendentes (VO que falhou)
.2               stats
.ping            status
```

### Stalker & Analytics (v4.0)
```
!stalk 55...          🔥 stalkeia perfil completo
!analytics            📊 ranking global de alvos
!analytics 55...      📊 analytics detalhado
!patterns 55...       🧠 análise de padrões
!speed 55...          ⏱️ velocidade de resposta
!network              🔗 mapa de conexões
```

### Fantasma
```
!ghost on/off
!watch add 55... Nome
!watch rm 55...
!watch list
!watch filter 55... media-only
!watch filter 55... keywords:pix,urgente
!watch filter 55... alert:ajuda
!watch filter 55... mute/unmute
```

### Espiar
```
!peek 55... 5     espiar sem azul
!last 55... 20    histórico local
!log palavra      busca
!resumo           digest diário
!alert add pix    keywords globais
```

---

## 📁 Estrutura

```
├── index.js                  # Core blindado
├── config.js                 # Configuração única
├── handlers/
│   ├── viewOnce.js           # View-once 5 estratégias
│   ├── antiEdit.js           # Anti-edit chain
│   ├── antiDelete.js         # Anti-delete RAM+DISCO
│   ├── ghost.js              # Fantasma
│   ├── commands.js           # Todos os comandos
│   ├── stalker.js            # 🔥 Profile stalker + analytics
│   ├── patternAnalyzer.js    # 🧠 Cérebro: padrões + dispositivos
│   ├── statusSaver.js        # 📸 Status/stories saver
│   ├── reactionSpy.js        # 😂 Reaction spy
│   ├── readSpy.js            # ✅ Read receipt + typing spy
│   ├── deviceSpy.js          # 📱 Device fingerprint
│   ├── smartAlert.js         # 🚨 Alertas inteligentes
│   ├── networkMapper.js      # 🔗 Mapa de rede
│   ├── peek.js               # Espiar sem azul
│   └── ...
├── utils/
│   ├── helpers.js            # Utilitários
│   ├── ghostState.js         # Estado do fantasma
│   ├── diskStore.js          # Persistência disco
│   ├── stats.js              # Estatísticas
│   ├── lidMap.js             # LID ↔ PN
│   └── ...
└── ecosystem.config.cjs      # PM2
```

---

## 🔥 Features Automáticas (v4.0)

Essas rodam **sem comando**, automaticamente:

- **📸 Status Saver** — Baixa stories de contatos observados
- **😂 Reaction Spy** — Avisa quando reagem nas suas msgs
- **✅ Read Spy** — Avisa quando alguém leu sua msg
- **⌨️ Typing Spy** — Avisa quando alguém tá digitando pra você
- **📱 Device Spy** — Detecta dispositivo + avisa mudanças
- **🧠 Pattern Analyzer** — Rastreia tudo para alimentar analytics
- **🚨 Smart Alerts** — Detecta atividade anômala

---

## 🔒 Segurança

- `auth_info/` nunca commitar
- Comandos só `fromMe`
- Nunca marca azul
- Nunca marca como "lido"
- Dados ficam em `./data/` (gitignore)

## Stack

Node ≥18 · Baileys 6.7.23 · pino · qrcode-terminal

## Licença

MIT — uso pessoal, por sua conta.

---

**v4.0 MODO ESPIÃO:** o bot mais cabuloso do zapzap. Nunca mais perca nada. Nunca mais fique no escuro.
