/**
 * Bot-Zap v3 Ultimate — AUTO VO + 24/7 Blindado
 * Foco: quando VO chega, já vai pro PV automaticamente — mesmo com CIPHERTEXT
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  Browsers,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { lookup } from 'dns/promises';

import { CONFIG } from './config.js';
import { logger, baileysLogger, isBenignCryptoNoise, noteCryptoNoise, installCryptoFilter } from './utils/logger.js';
import { createStore } from './utils/store.js';
import { createDiskStore } from './utils/diskStore.js';
import { getOwnerJid, extractText } from './utils/helpers.js';
import { loadGhostState, getGhostState } from './utils/ghostState.js';
import { startDigestScheduler, stopDigestScheduler } from './utils/digest.js';
import { autoVOHunter } from './handlers/viewOnce.js';
import { handleGhostMirror } from './handlers/ghost.js';
import { cacheIncoming, handleRevoke } from './handlers/antiDelete.js';
import { handleCommands, autoRevealById } from './handlers/commands.js';
import { handleEdit, cacheTextSnapshot, handleEditUpdate } from './handlers/antiEdit.js';
import { warmupEdits } from './utils/editHistory.js';
import { onHistorySet } from './handlers/peek.js';
import { isIncompleteMessage, keysSuggestViewOnce, hasMediaOrTextContent } from './utils/messageShape.js';
import { handleMediaVault } from './handlers/mediaVault.js';
import { handleGroupParticipants } from './handlers/groupSpy.js';
import { handleCallEvent } from './handlers/callSpy.js';
import { handlePresenceUpdate } from './handlers/presenceSpy.js';
import { expandJids, learnFromMessageKey } from './utils/lidMap.js';
import { handleStatusMessage } from './handlers/statusSaver.js';
import { handleReaction } from './handlers/reactionSpy.js';
import { handleReadReceipt, handleDirectTyping } from './handlers/readSpy.js';
import { handleDeviceSpy } from './handlers/deviceSpy.js';
import { trackMessage, trackResponse, flushPatterns } from './handlers/patternAnalyzer.js';
import { checkSmartAlert } from './handlers/smartAlert.js';
import { runPeriodicMonitor } from './handlers/heavyFeatures.js';
import { handleForwardSpy } from './handlers/forwardSpy.js';
import { handleReplyTracker } from './handlers/replyTracker.js';
import { handleAudioTranscriber } from './handlers/audioTranscriber.js';
import { checkSentimentAlert } from './handlers/sentiment.js';
import { scheduleWeeklyReport } from './handlers/weeklyReport.js';
import { handleAutoReply } from './handlers/autoReply.js';
import { handleAutoStickerRename } from './handlers/stickerCreator.js';

// instala filtro ANTES de tudo — limpa Bad MAC do console
installCryptoFilter();

const store = createStore(CONFIG);
const disk = createDiskStore(CONFIG);

let sockRef = null;
let reconnectAttempts = 0;
let isConnecting = false;
let heartbeatTimer = null;
let wsCheckTimer = null;
let internetCheckTimer = null;
let presenceTimer = null;
let heavyMonitorTimer = null;
let lastUpsertAt = 0;
let upsertCount = 0;
let lastInternetOk = true;
let bootTime = Date.now();
let shuttingDown = false;

const BOT_STARTED_AT_SEC = Math.floor(Date.now() / 1000);

const pendingIncomplete = new Map();
const PENDING_MAX = 90; // 90 tries = ~5 min de tentativa BRUTAL
const PENDING_RETRY_MS = 3000;
const PENDING_FAST_MS = 500; // 500ms nos primeiros 8 tries = frenético
const recentCipherByChat = new Map(); // jid -> [{id, at}]
const cipherNotifyCache = new Map(); // jid -> lastNotify ts

function raw(line = '') {
  if (CONFIG.DEBUG_UPSERT === false && String(line).startsWith('[UPSERT')) return;
  try { process.stdout.write(String(line) + (String(line).endsWith('\n') ? '' : '\n')); } catch {}
}

function isFatal(code) {
  return code === DisconnectReason.loggedOut || code === DisconnectReason.badSession || code === DisconnectReason.multideviceMismatch;
}
function isRestart(code) {
  return code === DisconnectReason.restartRequired || code === 515;
}
function idKey(msg) {
  return `${msg?.key?.remoteJid || ''}::${msg?.key?.id || ''}`;
}
async function ensureDirs() {
  for (const d of [CONFIG.DATA_DIR, CONFIG.DISK?.MSG_CACHE_DIR, CONFIG.DISK?.HISTORY_DIR, CONFIG.DISK?.EDITS_DIR, CONFIG.DOWNLOADS_DIR, `${CONFIG.DOWNLOADS_DIR}/viewonce`, `${CONFIG.DOWNLOADS_DIR}/vault`]) {
    if (d && !existsSync(d)) await mkdir(d, { recursive: true }).catch(() => {});
  }
}

async function checkInternet() {
  try {
    await lookup('1.1.1.1');
    await lookup('google.com').catch(() => lookup('cloudflare.com'));
    lastInternetOk = true;
    return true;
  } catch {
    try { await lookup('web.whatsapp.com'); lastInternetOk = true; return true; } catch { lastInternetOk = false; return false; }
  }
}

async function processCompleteMessage(sock, msg, source) {
  const dedupe = `processed::${msg.key.remoteJid}::${msg.key.id}`;
  if (store.has(dedupe) && store.get(dedupe)?.done) return;

  const topKeys = Object.keys(msg.message || {}).join(',');
  if (keysSuggestViewOnce(msg.message)) raw(`>>> POSSÍVEL VO (${source}) keys=${topKeys} fromMe=${!!msg.key.fromMe}`);

  cacheIncoming(store, msg, disk);
  cacheTextSnapshot(store, msg);
  if (CONFIG.FEATURES?.LID_MAP !== false) learnFromMessageKey(msg.key).catch(() => {});

  // 🔥 v4.0: Rastreia padrões de atividade + detecta dispositivo
  if (CONFIG.FEATURES?.PATTERN_ANALYZER) {
    trackMessage(msg, CONFIG).catch(() => {});
  }
  if (CONFIG.FEATURES?.DEVICE_SPY) {
    handleDeviceSpy(sock, msg, CONFIG, logger).catch(() => {});
  }
  if (CONFIG.FEATURES?.SMART_ALERTS) {
    checkSmartAlert(sock, msg, CONFIG, logger).catch(() => {});
  }

  // 🔥 v4.0: Reactions
  if (CONFIG.FEATURES?.REACTION_SPY && msg.message?.reactionMessage) {
    handleReaction(sock, msg, CONFIG, logger).catch(() => {});
  }

  // 🔥 v4.0: Track resposta do dono (para medir velocidade de resposta dos contatos)
  if (msg.key.fromMe && CONFIG.FEATURES?.PATTERN_ANALYZER) {
    // fromJid = dono, toJid = contato que recebeu a resposta
    const ownerJid = sock.user?.id || '';
    trackResponse(ownerJid, msg.key.remoteJid, CONFIG).catch(() => {});
  }

  // 🧠 Forward Spy
  if (CONFIG.FEATURES?.FORWARD_SPY) {
    handleForwardSpy(sock, msg, CONFIG, logger).catch(() => {});
  }

  // 🧠 Reply Tracker
  if (CONFIG.FEATURES?.REPLY_TRACKER) {
    handleReplyTracker(sock, msg, CONFIG, logger, store, disk).catch(() => {});
  }

  // 🧠 Audio Transcriber
  if (CONFIG.FEATURES?.AUDIO_TRANSCRIBER && msg.message?.audioMessage) {
    handleAudioTranscriber(sock, msg, CONFIG, logger).catch(() => {});
  }

  // 🧠 Sentiment Analysis
  if (CONFIG.FEATURES?.SENTIMENT_ANALYSIS && !msg.key.fromMe) {
    const textForSentiment = extractText(msg.message);
    if (textForSentiment) {
      checkSentimentAlert(sock, msg.key.remoteJid, textForSentiment, CONFIG, logger).catch(() => {});
    }
  }

  // 🧠 Auto-Reply
  if (CONFIG.FEATURES?.AUTO_REPLY && !msg.key.fromMe) {
    handleAutoReply(sock, msg, CONFIG, logger).catch(() => {});
  }

  // 🎨 Auto Sticker Rename (renomeia figurinhas recebidas)
  if (CONFIG.FEATURES?.STICKER_AUTO_RENAME && !msg.key.fromMe) {
    handleAutoStickerRename(sock, msg, CONFIG, logger).catch(() => {});
  }

  // 🔥 v4.0: AUTO VO HUNTER — tenta pegar VO de TODA mensagem, sem comando
  if (CONFIG.FEATURES.VIEW_ONCE_AUTO !== false) {
    await autoVOHunter(sock, msg, CONFIG, logger, disk);
  }
  if (CONFIG.FEATURES.MEDIA_VAULT) {
    await handleMediaVault(sock, msg, CONFIG, logger).catch(() => {});
  }
  if (CONFIG.FEATURES.GHOST_MODE) {
    await handleGhostMirror(sock, msg, CONFIG, logger, disk);
  }
  await handleCommands(sock, msg, CONFIG, logger, store, disk);

  const protoEdit = msg.message?.protocolMessage;
  if (protoEdit && (protoEdit.type === 14 || protoEdit.type === 'MESSAGE_EDIT' || protoEdit.editedMessage)) {
    await handleEdit(sock, msg, store, CONFIG, logger, disk).catch(() => {});
  }

  store.set(dedupe, { done: true });
  pendingIncomplete.delete(idKey(msg));
}

// recovery idêntico ao .o. — INSTANTÂNEO 500ms nos primeiros tries
function scheduleIncomplete(sock, msg) {
  const k = idKey(msg);
  if (!msg.key?.id || !msg.key?.remoteJid) return;
  let entry = pendingIncomplete.get(k);
  if (!entry) {
    entry = { msg, tries: 0, timer: null, firstAt: Date.now() };
    pendingIncomplete.set(k, entry);
  } else entry.msg = msg;
  if (entry.timer) return;

  const tick = async () => {
    const cur = pendingIncomplete.get(k);
    if (!cur) return;
    cur.tries++;

    // 0.5s × 8 = 4 segundos de tentativa frenética, depois 3s
    const isFast = cur.tries <= 8;
    try {
      const ok = await autoRevealById(sock, { chatJid: cur.msg.key.remoteJid, messageId: cur.msg.key.id, pushName: cur.msg.pushName, msgTimestamp: cur.msg.messageTimestamp }, CONFIG, logger, store, disk, false);
      if (ok) {
        logger.info(`[AUTO-VO INSTANT] resolvido em ${cur.tries}º try (${isFast ? '500ms' : '3s'}) id=${msg.key.id} — foi automático sem digitar .o.`);
        pendingIncomplete.delete(k);
        recentCipherByChat.delete(cur.msg.key.remoteJid);
        return;
      }
    } catch (e) { if (CONFIG.DEBUG_UPSERT) logger.warn(`[AUTO-VO] try ${cur.tries} falhou ${e.message}`); }

    const fromStore = store.getMessage?.(msg.key);
    if (fromStore && hasMediaOrTextContent(fromStore)) {
      await processCompleteMessage(sock, { ...cur.msg, message: fromStore, key: msg.key }, 'pending-store-auto-instant');
      logger.info(`[AUTO-VO INSTANT] RAM id=${msg.key.id}`);
      pendingIncomplete.delete(k);
      return;
    }
    const fromDisk = disk?.getMessage ? await disk.getMessage(msg.key.remoteJid, msg.key.id) : null;
    if (fromDisk?.message && hasMediaOrTextContent(fromDisk.message)) {
      await processCompleteMessage(sock, fromDisk, 'pending-disk-auto-instant');
      logger.info(`[AUTO-VO INSTANT] disco id=${msg.key.id}`);
      pendingIncomplete.delete(k);
      return;
    }

    try {
      if (typeof sock.assertSessions === 'function') {
        const jids = [...new Set([msg.key.remoteJid, msg.key.remoteJidAlt, msg.key.participant, msg.key.participantAlt].filter(Boolean))];
        if (jids.length) await sock.assertSessions(jids, true);
      }
    } catch {}
    if (typeof sock.requestPlaceholderResend === 'function') {
      try { await sock.requestPlaceholderResend(msg.key); } catch {}
      // BRUTAL: resend duplo quando fast + presence
      if (isFast) {
        setTimeout(() => sock.requestPlaceholderResend(msg.key).catch(() => {}), 200);
        setTimeout(() => sock.requestPlaceholderResend(msg.key).catch(() => {}), 500);
      }
    }
    // Force available presence para acordar a conexão
    try { await sock.sendPresenceUpdate('available'); } catch {}
    if (typeof sock.updateMediaMessage === 'function' && cur.tries % 2 === 0) {
      try {
        const refreshed = await sock.updateMediaMessage(cur.msg);
        if (refreshed?.message && hasMediaOrTextContent(refreshed.message)) {
          await processCompleteMessage(sock, refreshed, 'pending-media-auto-instant');
          logger.info(`[AUTO-VO INSTANT] reupload id=${msg.key.id}`);
          pendingIncomplete.delete(k);
          return;
        }
      } catch {}
    }
    if (cur.tries % 3 === 0 && typeof sock.fetchMessageHistory === 'function') {
      try {
        const keyForHistory = { remoteJid: cur.msg.key.remoteJid, id: cur.msg.key.id, fromMe: false, participant: cur.msg.key.participant };
        await sock.fetchMessageHistory(8, keyForHistory, Date.now() - 120_000);
      } catch {}
    }

    if (cur.tries >= PENDING_MAX) {
      pendingIncomplete.delete(k);
      logger.warn(`[AUTO-VO] desisti id=${msg.key.id} — mas .o. ainda funciona manual`);
      return;
    }
    const nextDelay = isFast ? PENDING_FAST_MS : PENDING_RETRY_MS;
    cur.timer = setTimeout(tick, nextDelay);
    if (cur.timer.unref) cur.timer.unref();
  };

  entry.timer = setTimeout(tick, 400);
  if (entry.timer.unref) entry.timer.unref();
}

async function startBot() {
  if (isConnecting || shuttingDown) return;
  isConnecting = true;

  try {
    await ensureDirs();
    await disk.ready();
    await loadGhostState(CONFIG);
    await warmupEdits();

    if (sockRef) {
      try { sockRef.ev?.removeAllListeners?.(); sockRef.ws?.close?.(); } catch {}
      sockRef = null;
    }

    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);
    raw(`[boot] session=${CONFIG.SESSION_DIR} exists=${existsSync(CONFIG.SESSION_DIR)} ${state.creds.me?.id ? `me=${state.creds.me.id}` : 'SEM SESSÃO - escaneie QR'}`);

    let version;
    try { const f = await fetchLatestBaileysVersion(); version = f.version; } catch {}

    const sock = makeWASocket({
      ...(version ? { version } : {}),
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, baileysLogger) },
      logger: baileysLogger,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
      emitOwnEvents: true,
      fireInitQueries: true,
      getMessage: async (key) => {
        const ram = store.getMessage(key);
        if (ram) return ram;
        if (key?.remoteJid && key?.id && disk?.getMessage) {
          const m = await disk.getMessage(key.remoteJid, key.id);
          return m?.message;
        }
        return undefined;
      },
      shouldSyncHistoryMessage: (m) => {
        try { const t = m?.syncType; return t === 6 || t === 'ON_DEMAND' || t === proto?.HistorySync?.HistorySyncType?.ON_DEMAND; } catch { return false; }
      },
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 15,
      defaultQueryTimeoutMs: 90_000,
      connectTimeoutMs: 90_000,
      keepAliveIntervalMs: 20_000,
    });

    sockRef = sock;
    sock.ev.on('creds.update', saveCreds);
    sock.readMessages = async () => {};

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (CONFIG.DEBUG_UPSERT) raw(`[conn] ${connection || '-'} qr=${!!qr}`);

      if (qr) {
        // 🔥 CONEXÃO POR CÓDIGO DE PAREAMENTO (sem QR!)
        // Usa o número do config.js ou pede pro usuário
        if (!state.creds.me?.id && typeof sock.requestPairingCode === 'function') {
          try {
            const phoneNumber = CONFIG.OWNER_NUMBER || '';
            if (phoneNumber) {
              console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log('📱 CONECTANDO POR NÚMERO DE TELEFONE...');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log(`📞 Número: +${phoneNumber}`);
              console.log('⏳ Gerando código de pareamento...\n');

              const code = await sock.requestPairingCode(phoneNumber);

              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log('🔑 SEU CÓDIGO DE PAREAMENTO:');
              console.log('');
              console.log(`        ${code}`);
              console.log('');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log('');
              console.log('📲 Agora no seu WhatsApp:');
              console.log('   1. Abra o WhatsApp');
              console.log('   2. Vá em Configurações → Aparelhos conectados');
              console.log('   3. Toque em "Conectar um aparelho"');
              console.log('   4. Toque em "Conectar com número de telefone"');
              console.log('   5. Digite o código acima ☝️');
              console.log('');
              console.log('⏳ Aguardando pareamento...');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            } else {
              console.log('⚠️ Número não configurado! Edite config.js → OWNER_NUMBER');
              console.log('   Mostrando QR como fallback...\n');
              // Fallback: mostra QR no terminal
              const qrcode = await import('qrcode-terminal');
              qrcode.default.generate(qr, { small: true });
            }
          } catch (err) {
            console.log(`⚠️ Pareamento falhou: ${err.message}`);
            console.log('   Mostrando QR como fallback...\n');
            const qrcode = await import('qrcode-terminal');
            qrcode.default.generate(qr, { small: true });
          }
        } else {
          // Já tem sessão, não precisa de QR/code
          console.log('📱 QR recebido mas sessão já existe, reconectando...');
        }
      }

      if (connection === 'close') {
        isConnecting = false;
        stopDigestScheduler();
        clearTimers();
        // Limpa pendingIncomplete COM os timers
        for (const [, entry] of pendingIncomplete) {
          if (entry?.timer) clearTimeout(entry.timer);
        }
        pendingIncomplete.clear();

        const code = lastDisconnect?.error instanceof Boom ? lastDisconnect.error.output?.statusCode : lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || '?';
        const fatal = isFatal(code);
        const restartReq = isRestart(code);

        if (fatal) {
          logger.error('Sessão morta — apague auth_info e escaneie QR novamente');
          return;
        }

        const hasNet = await checkInternet();
        let delay;
        if (!hasNet) { delay = 8000; logger.warn('[reconnect] sem internet, aguardando 8s'); }
        else if (restartReq) { reconnectAttempts = 0; delay = 800; }
        else { reconnectAttempts++; delay = Math.min(CONFIG.RECONNECT.INITIAL_DELAY_MS * 2 ** Math.min(reconnectAttempts - 1, 5), CONFIG.RECONNECT.MAX_DELAY_MS); }

        const jitter = Math.random() * 600;
        setTimeout(() => startBot().catch(e => logger.error(e.message)), delay + jitter);
      } else if (connection === 'open') {
        isConnecting = false;
        reconnectAttempts = 0;
        bootTime = Date.now();
        logger.info('🔥 bot v4.0 MODO ESPIÃO — online e pronto pra zoar');
        raw('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        raw('  🔥 v4.0 MODO ESPIÃO');
        raw('  💀 stalker + analytics + VO auto');
        raw('  📸 status saver + reaction spy');
        raw('  🚫 block detector + device spy');
        raw('  😈 ninguém escapa desse bot');
        raw('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try { await sock.sendPresenceUpdate('available'); } catch {}

        try { logger.info(`Dono: ${getOwnerJid(sock).split('@')[0]} | VO Auto=ON | ghost=${getGhostState().enabled ? 'ON' : 'OFF'}`); } catch {}

        startDigestScheduler(() => sockRef, CONFIG, disk, logger);
        scheduleWeeklyReport(() => sockRef, CONFIG, logger);
        startWatchdogs(sock);
      }
    });

    sock.ev.on('messages.upsert', async (payload) => {
      const { messages, type } = payload || {};
      lastUpsertAt = Date.now();
      upsertCount += messages?.length || 0;

      if (type !== 'notify' && type !== 'append') return;

      for (const msg of messages || []) {
        try {
          const stubType = msg?.messageStubType;
          const isCipher = stubType === proto.WebMessageInfo.StubType.CIPHERTEXT || stubType === 2;

          if (isCipher) {
            const jid = msg.key?.remoteJid || '';
            const id = msg.key?.id || '';
            const participant = msg.key?.participant || '';

            // guarda histórico de ciphers por chat
            if (jid && id) {
              const arr = recentCipherByChat.get(jid) || [];
              arr.push({ id, at: Date.now() });
              recentCipherByChat.set(jid, arr.filter(x => Date.now() - x.at < 180_000).slice(-30));
            }

            // tenta recuperar sessão agressivamente — PN + LID + participante
            try {
              if (typeof sock.assertSessions === 'function') {
                const baseTargets = [jid, msg.key.remoteJidAlt, participant, msg.key.participantAlt].filter(Boolean);
                // expande LID map se tiver
                let all = [...new Set(baseTargets)];
                try {
                  for (const b of baseTargets) {
                    const exp = await expandJids(b);
                    all.push(...exp);
                  }
                  all = [...new Set(all)];
                } catch {}
                if (all.length) {
                  await sock.assertSessions(all, true);
                  if (CONFIG.DEBUG_UPSERT) raw(`[CIPHER] assertSessions ${all.length} jids`);
                }
              }
            } catch (e) { if (CONFIG.DEBUG_UPSERT) logger.warn(`assert ${e.message}`); }

            try { await sock.sendPresenceUpdate('available'); } catch {}
            // REMOVIDO composing — ficava aparecendo "digitando" e não é discreto
            // só available global, invisível

            if (msg.key && typeof sock.requestPlaceholderResend === 'function') {
              try { await sock.requestPlaceholderResend(msg.key); } catch {}
              // segunda tentativa 1.5s depois
              setTimeout(() => sock.requestPlaceholderResend(msg.key).catch(() => {}), 1500);
            }

            scheduleIncomplete(sock, { key: msg.key, message: msg.message || {}, messageTimestamp: msg.messageTimestamp });

            // avisa dono só 1x a cada 2 min pra não spam, mas explica que é automático
            const lastN = cipherNotifyCache.get(jid);
            if (!lastN || Date.now() - lastN > 120_000) {
              cipherNotifyCache.set(jid, Date.now());
              // tenta adivinhar se era VO pelo histórico recente? não dá, mas avisa que tentará automático
              logger.info(`[CIPHERTEXT] ${jid} id=${id} — tentando decriptar auto por 2 min`);
            }

            continue;
          }

          if (!msg?.message && !msg?.messageStubType) continue;
          // 🔥 v4.0: Status Saver — processa ANTES de pular
          if (msg.key?.remoteJid === 'status@broadcast') {
            if (CONFIG.FEATURES?.STATUS_SAVER) {
              handleStatusMessage(sock, msg, CONFIG, logger).catch(() => {});
            }
            continue;
          }

          const incomplete = msg.message ? isIncompleteMessage(msg) : true;
          const looksVO = msg.message ? keysSuggestViewOnce(msg.message) : false;

          if (type === 'append' && !looksVO && !incomplete) {
            let ts = Number(msg.messageTimestamp) || 0;
            if (ts > 1e12) ts = Math.floor(ts / 1000);
            if (ts && ts < BOT_STARTED_AT_SEC - 3600) continue;
          }

          const isRevoke = msg.message?.protocolMessage?.type === proto.Message.ProtocolMessage.Type.REVOKE;
          if (isRevoke) {
            if (CONFIG.FEATURES.ANTI_DELETE) await handleRevoke(sock, msg, store, CONFIG, logger, disk);
            continue;
          }

          const protoMsg = msg.message?.protocolMessage;
          if (protoMsg && (protoMsg.type === 14 || protoMsg.type === 'MESSAGE_EDIT' || protoMsg.editedMessage)) {
            await handleEdit(sock, msg, store, CONFIG, logger, disk);
            continue;
          }
          if (msg.message?.editedMessage) {
            await handleEdit(sock, msg, store, CONFIG, logger, disk);
            continue;
          }
          if (msg.message?.protocolMessage) continue;
          if (!msg.message) continue;

          if (incomplete) {
            cacheIncoming(store, msg, disk);
            cacheTextSnapshot(store, msg);
            scheduleIncomplete(sock, msg);
            continue;
          }

          const k = idKey(msg);
          if (pendingIncomplete.has(k)) {
            const p = pendingIncomplete.get(k);
            if (p?.timer) clearTimeout(p.timer);
            pendingIncomplete.delete(k);
            logger.info(`[AUTO] CIPHERTEXT resolvido automaticamente id=${msg.key.id}`);
          }
          if (msg.key?.remoteJid && hasMediaOrTextContent(msg.message)) recentCipherByChat.delete(msg.key.remoteJid);

          await processCompleteMessage(sock, msg, type);
        } catch (err) {
          if (isBenignCryptoNoise(err)) { noteCryptoNoise(); continue; }
          logger.error(`[MSG] ${err.stack || err.message}`);
        }
      }
    });

    sock.ev.on('messages.update', async (updates) => {
      for (const { key, update } of updates || []) {
        try {
          if (CONFIG.FEATURES.ANTI_DELETE) {
            const stubRevoke = update?.messageStubType === proto.WebMessageInfo.StubType.REVOKE || update?.messageStubType === 1;
            const protoRevoke = update?.message?.protocolMessage?.type === proto.Message.ProtocolMessage.Type.REVOKE;
            if (stubRevoke || protoRevoke) {
              await handleRevoke(sock, { key, messageTimestamp: Math.floor(Date.now() / 1000), message: { protocolMessage: { key: update?.message?.protocolMessage?.key || key, type: proto.Message.ProtocolMessage.Type.REVOKE } } }, store, CONFIG, logger, disk);
              continue;
            }
          }
          if (update?.message) {
            const isEditWrapper = update.message.editedMessage || update.message.protocolMessage?.editedMessage || update.message.protocolMessage?.type === 14;
            if (isEditWrapper || update.message.editedMessage) {
              await handleEditUpdate(sock, key, update, store, CONFIG, logger, disk);
            } else if (hasMediaOrTextContent(update.message)) {
              const ik = `${key.remoteJid}::${key.id}`;
              if (pendingIncomplete.has(ik)) {
                const p = pendingIncomplete.get(ik);
                if (p?.timer) clearTimeout(p.timer);
                pendingIncomplete.delete(ik);
              }
              // se veio conteúdo real de um id que antes era CIPHERTEXT, é AUTO RECUPERAÇÃO
              const wasCipher = recentCipherByChat.has(key.remoteJid);
              await processCompleteMessage(sock, { key, message: update.message, messageTimestamp: update.messageTimestamp || Math.floor(Date.now() / 1000), pushName: update.pushName }, wasCipher ? 'update-auto-cipher' : 'update');
              if (wasCipher) recentCipherByChat.delete(key.remoteJid);
            }
          }
        } catch (e) {
          if (isBenignCryptoNoise(e)) continue;
          logger.error(`update ${e.message}`);
        }
      }
    });

    sock.ev.on('group-participants.update', async (ev) => { try { await handleGroupParticipants(sock, ev, CONFIG, logger); } catch {} });
    sock.ev.on('call', async (ev) => { try { await handleCallEvent(sock, ev, CONFIG, logger); } catch {} });
    sock.ev.on('presence.update', async (ev) => {
      try {
        await handlePresenceUpdate(sock, ev, CONFIG, logger);
        // 🔥 v4.0: detecta typing direcionado ao dono
        if (CONFIG.FEATURES?.READ_SPY && ev?.presences) {
          const ownerJid = sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;
          if (ownerJid && ev.id === ownerJid) {
            for (const [who, info] of Object.entries(ev.presences)) {
              handleDirectTyping(sock, who, info, CONFIG, logger).catch(() => {});
            }
          }
        }
      } catch {}
    });

    // 🔥 v4.0: Read Receipts (message-receipt.update)
    sock.ev.on('message-receipt.update', async (updates) => {
      try {
        await handleReadReceipt(sock, updates, CONFIG, logger);
      } catch {}
    });

    sock.ev.on('messaging-history.set', async (payload) => {
      try {
        const { messages, syncType } = payload || {};
        onHistorySet({ messages: messages || [], syncType }, logger);
        for (const m of messages || []) {
          if (!m?.message || !m?.key) continue;
          cacheIncoming(store, m, disk);
          cacheTextSnapshot(store, m);
          if (hasMediaOrTextContent(m.message) && keysSuggestViewOnce(m.message)) {
            await processCompleteMessage(sock, m, 'history');
          }
        }
      } catch (e) { logger.warn(`history ${e.message}`); }
    });

    return sock;
  } catch (err) {
    isConnecting = false;
    throw err;
  }
}

function startWatchdogs(sock) {
  clearTimers();
  const hbMs = CONFIG.RECONNECT.HEARTBEAT_MS || 30_000;
  const wsMs = CONFIG.RECONNECT.WS_CHECK_MS || 15_000;
  const netMs = CONFIG.RECONNECT.INTERNET_CHECK_MS || 20_000;
  const presenceMs = CONFIG.RECONNECT.PRESENCE_KEEPALIVE_MS || 60_000;

  heartbeatTimer = setInterval(() => {
    const t = new Date().toLocaleTimeString('pt-BR');
    const age = lastUpsertAt ? `${Math.round((Date.now() - lastUpsertAt) / 1000)}s` : 'nunca';
    const ws = !!(sockRef?.ws?.isOpen || sockRef?.ws?.readyState === 1);
    const up = Math.round((Date.now() - bootTime) / 1000);
    raw(`[hb ${t}] ws=${ws} up=${up}s upserts=${upsertCount} last=${age} net=${lastInternetOk ? 'ok' : 'down'} pending=${pendingIncomplete.size}`);
    if (lastUpsertAt && Date.now() - lastUpsertAt > (CONFIG.RECONNECT.STALE_UPSERT_SEC || 300) * 1000) {
      try { sockRef?.sendPresenceUpdate?.('available'); } catch {}
    }
    // Limpa Maps antigos pra evitar memory leak
    const now = Date.now();
    for (const [jid, arr] of recentCipherByChat) {
      const fresh = arr.filter(x => now - x.at < 180_000);
      if (!fresh.length) recentCipherByChat.delete(jid);
      else recentCipherByChat.set(jid, fresh);
    }
    for (const [jid, ts] of cipherNotifyCache) {
      if (now - ts > 600_000) cipherNotifyCache.delete(jid);
    }
  }, hbMs);
  if (heartbeatTimer.unref) heartbeatTimer.unref();

  wsCheckTimer = setInterval(() => {
    const wsOpen = !!(sockRef?.ws?.isOpen || sockRef?.ws?.readyState === 1);
    if (!wsOpen && !isConnecting) { logger.warn('[watchdog] ws fechado — reconectando'); startBot().catch(() => {}); }
  }, wsMs);
  if (wsCheckTimer.unref) wsCheckTimer.unref();

  internetCheckTimer = setInterval(async () => {
    const ok = await checkInternet();
    if (!ok) logger.warn('[watchdog] sem internet');
    else if (ok && !lastInternetOk) { logger.info('[watchdog] internet voltou'); if (sockRef && !sockRef.ws?.isOpen) startBot().catch(() => {}); }
  }, netMs);
  if (internetCheckTimer.unref) internetCheckTimer.unref();

  if (CONFIG.MARK_ONLINE !== false) {
    presenceTimer = setInterval(() => { if (sockRef?.user) sockRef.sendPresenceUpdate('available').catch(() => {}); }, presenceMs);
    if (presenceTimer.unref) presenceTimer.unref();
  }

  // 🔥 v4.0: Heavy Monitor (block detector + profile pic + about)
  const heavyMs = CONFIG.HEAVY_MONITOR?.TIMER_MS || 1800_000; // 30 min default
  heavyMonitorTimer = setInterval(() => { runPeriodicMonitor(sockRef, CONFIG, logger).catch(() => {}); }, heavyMs);
  if (heavyMonitorTimer.unref) heavyMonitorTimer.unref();
}

function clearTimers() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (wsCheckTimer) clearInterval(wsCheckTimer);
  if (internetCheckTimer) clearInterval(internetCheckTimer);
  if (presenceTimer) clearInterval(presenceTimer);
  if (heavyMonitorTimer) clearInterval(heavyMonitorTimer);
  heartbeatTimer = wsCheckTimer = internetCheckTimer = presenceTimer = heavyMonitorTimer = null;
}

process.on('uncaughtException', (err) => {
  if (isBenignCryptoNoise(err)) return noteCryptoNoise('uncaught');
  logger.error(`[uncaught] ${err.stack || err.message}`);
});
process.on('unhandledRejection', (r) => {
  if (isBenignCryptoNoise(r)) return noteCryptoNoise('reject');
  const msg = r instanceof Error ? r.stack : String(r);
  logger.error(`[reject] ${msg}`);
});
process.on('SIGINT', () => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('SIGINT — desligando');
  stopDigestScheduler();
  clearTimers();
  flushPatterns().catch(() => {});
  try { sockRef?.ws?.close?.(); } catch {}
  setTimeout(() => process.exit(0), 800);
});
process.on('SIGTERM', () => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('SIGTERM — desligando');
  stopDigestScheduler();
  clearTimers();
  flushPatterns().catch(() => {});
  setTimeout(() => process.exit(0), 800);
});

raw('[boot] Bot-Zap v4.0 MODO ESPIÃO starting...');
logger.info('Iniciando v4.0 — MODO ESPIÃO: stalker, analytics, status, reactions, device spy');

startBot().catch((err) => {
  logger.error(`Fatal boot: ${err.stack || err.message}`);
  setTimeout(() => startBot().catch(e => { logger.error(`Fatal retry: ${e.message}`); process.exit(1); }), 5000);
});
