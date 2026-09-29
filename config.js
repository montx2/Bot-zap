/**
 * config.js — v3.5 Elegante Minimalista
 * Só 1 notificação por view-once, sem spam, bonito
 */

export const CONFIG = {
  OWNER_NUMBER: '553799384375',

  SESSION_DIR: './auth_info',
  DOWNLOADS_DIR: './downloads',
  DATA_DIR: './data',

  MARK_ONLINE: true,
  DEBUG_UPSERT: false,
  SILENT_MODE: true,

  PREFIX: ['!', '.', '/'],

  SPY_REVEAL_COMMANDS: ['.o.', '.o', '!0', '.0', 'o.'],
  SPY_PENDING_COMMANDS: ['.1', '!1'],
  SPY_PING_COMMANDS: ['.ping', '.p'],
  SPY_STATS_COMMANDS: ['.2', '!2', '.stats'],

  // 100% silencioso no chat de origem, e sem status no PV — só 1 msg completa
  SPY_SILENT: true,
  SPY_SILENT_PRIVATE_STATUS: true,   // não manda "detectei, baixando..."
  SPY_SILENT_PRIVATE_ERRORS: true,   // não manda erro no PV

  STEALTH: { DELETE_SPY_CMD: false, DELETE_DELAY_MS: 1200 },

  FEATURES: {
    VIEW_ONCE_AUTO: true,
    ANTI_DELETE: true,
    ANTI_EDIT: true,
    GHOST_MODE: true,
    SAVE_VO_TO_DISK: true,
    DISK_HISTORY: true,
    DAILY_DIGEST: false,          // desligado pra ficar minimalista
    PRIORITY_ALERTS: false,       // sem alertas extras — só 1 notificação completa
    MEDIA_VAULT: false,           // desligado pra não poluir, só VO
    OCR_VIEW_ONCE: false,
    PENDING_QUEUE: true,
    LID_MAP: true,
    GROUP_SPY: false,
    CALL_SPY: false,
    PRESENCE_SPY: false,

    // 🔥 NOVAS FEATURES CABULOSAS v4.0
    STATUS_SAVER: true,           // salva stories/status automaticamente
    SAVE_STATUS_TO_DISK: true,    // salva stories em disco
    REACTION_SPY: true,           // espia reações nas suas mensagens
    READ_SPY: true,               // espia quem leu suas mensagens
    DEVICE_SPY: true,             // detecta dispositivo + mudanças
    PATTERN_ANALYZER: true,       // análise de padrões de atividade
    SMART_ALERTS: true,           // alertas inteligentes (atividade anômala)
    NETWORK_MAPPER: true,         // mapeia conexões entre alvos

    // 💀 FEATURES PESADAS (quem não tem medo)
    HEAVY_MONITOR: true,          // monitor periódico dos alvos
    BLOCK_DETECTOR: true,         // detecta quando te bloqueiam
    PROFILE_PIC_MONITOR: true,    // detecta mudança de foto de perfil
    ABOUT_MONITOR: true,          // detecta mudança de status/about

    // 🧠 FEATURES INTELIGENTES
    FORWARD_SPY: true,            // detecta mensagens encaminhadas
    REPLY_TRACKER: true,          // rastreia replies (quem respondeu quem)
    AUDIO_TRANSCRIBER: true,      // transcreve áudios automaticamente (precisa GROQ_API_KEY)
    SENTIMENT_ANALYSIS: true,     // análise de sentimento das conversas
    WEEKLY_REPORT: true,          // relatório semanal automático (domingo 20h)
    AUTO_REPLY: true,             // respostas automáticas (configurável via !autoreply)

    // 🎨 STICKER
    STICKER_CREATOR: true,        // cria figurinhas com !sticker
    STICKER_AUTO_RENAME: true,    // renomeia figurinhas recebidas automaticamente
  },

  // Heavy Monitor — checa alvos periodicamente
  HEAVY_MONITOR: {
    TIMER_MS: 1800_000,           // a cada 30 min
    CHECK_INTERVAL_MS: 3600_000,  // mínimo 1h entre checks do mesmo alvo
  },

  // Forward Spy
  FORWARD_SPY: { ONLY_WATCH: true },

  // Reply Tracker
  REPLY_TRACKER: { ONLY_WATCH: true },

  // Audio Transcriber (precisa GROQ_API_KEY no .env)
  AUDIO_TRANSCRIBER: {
    ONLY_WATCH: true,
    MAX_SECONDS: 300,             // máximo 5 min por áudio
  },

  // Status Saver — salva stories de contatos observados
  STATUS_SAVER: {
    ONLY_WATCH: true,             // só de alvos na watch list
  },

  // Reaction Spy — espia reações
  REACTION_SPY: {
    ONLY_OWN_MESSAGES: true,      // só reações nas suas mensagens (+ watched chats)
    NOTIFY: true,
  },

  // Read Spy — espia quem leu
  READ_SPY: {
    ONLY_WATCH: true,
    NOTIFY: true,
    TYPING_NOTIFY: true,          // avisa quando alguém tá digitando pra você
  },

  // Device Spy — detecta dispositivo
  DEVICE_SPY: {
    ONLY_WATCH: true,
    NOTIFY: true,                 // notifica mudanças de dispositivo
  },

  // Smart Alerts — alertas inteligentes
  SMART_ALERTS: {
    ONLY_WATCH: true,
  },

  GHOST: {
    ENABLED_ON_START: false,
    ONLY_WATCH_LIST: true,
    MIRROR_TEXT: true,
    MIRROR_MEDIA: true,
    MIRROR_STICKERS: false,
    IGNORE_FROM_ME: true,
    HEADER_EMOJI: '•',
  },

  MEDIA_VAULT: {
    DIR: './downloads/vault',
    ONLY_WATCH: true,
    REQUIRE_GHOST: false,
    SKIP_VIEW_ONCE: true,
  },

  ANTI_DELETE: { ONLY_WATCH: false, PRIORITIZE_WATCH: true },
  PRESENCE_SPY: { ONLY_WATCH: true, REQUIRE_GHOST: false, NOTIFY: false },

  DISK: {
    DIR: './data',
    MSG_CACHE_DIR: './data/msg-cache',
    HISTORY_DIR: './data/history',
    EDITS_DIR: './data/edits',
    VAULT_DIR: './downloads/vault',
    VO_DIR: './downloads/viewonce',
    MSG_CACHE_TTL_MS: 1000 * 60 * 60 * 72,
    MSG_CACHE_MAX: 12000,
    HISTORY_MAX_LINES: 8000,
    DEFAULT_LAST_COUNT: 15,
    MAX_LAST_COUNT: 30,
    EDITS_MAX_PER_MSG: 30,
  },

  ALERTS: {
    ON_VIEW_ONCE: false,     // sem mensagem extra de alerta
    ON_DELETE: false,
    ON_KEYWORD: false,
    ON_LONG_AUDIO_SEC: 60,
    EMOJI: '•',
    VO_MINIMAL: false,       // sem badge extra "👁 sender..."
  },

  DIGEST: { TIME: '22:00', TIMEZONE: 'America/Sao_Paulo' },

  RECONNECT: {
    MAX_DELAY_MS: 30_000,
    INITIAL_DELAY_MS: 1500,
    MAX_ATTEMPTS: Infinity,
    HEARTBEAT_MS: 60_000,       // 60s pra console ficar limpo
    WS_CHECK_MS: 20_000,
    INTERNET_CHECK_MS: 30_000,
    PRESENCE_KEEPALIVE_MS: 90_000,
    STALE_UPSERT_SEC: 600,
  },

  STORE_TTL_MS: 1000 * 60 * 60 * 24,
  STORE_MAX_SIZE: 6000,
  DOWNLOAD_RETRIES: 5,
  DOWNLOAD_RETRY_DELAY_MS: 1000,
};
