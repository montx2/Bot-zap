# 🔍 Auditoria Completa — Bot-Zap v4.2

## 🔴 CRÍTICO (quebra funcionalidade)

### 1. `trackResponse` chamada com argumentos ERRADOS
**Arquivo:** `index.js:144`
```js
trackResponse(msg.key.remoteJid, msg.key.remoteJid, CONFIG)
```
Os dois primeiros args são **iguais**! A função espera `(fromJid, toJid, config)`.
**Impacto:** `!speed` NUNCA mostra dados corretos. Tempo de resposta nunca é rastreado.

### 2. Comando `!relatório` duplicado (conflito)
**Arquivo:** `handlers/commands.js:393,417`
- Linha 393: `['weekly', 'semanal', 'relatório', 'report']` → vai pro weekly
- Linha 417: `['analytics', ..., 'relatório', 'relatorio']` → NUNCA executa
**Impacto:** `!relatório` sempre vai pro weekly, analytics nunca é chamado por esse alias.

### 3. `getChatName` sempre retorna string vazia para DMs
**Arquivo:** `utils/helpers.js`
```js
const m = s.groupMetadata ? undefined : undefined; // ← sempre undefined!
```
**Impacto:** Nome do chat aparece vazio em todos os handlers (ghost, antiDelete, VO).

### 4. `handleViewOnce` importado mas nunca usado no index.js
**Arquivo:** `index.js:27`
```js
import { handleViewOnce, autoVOHunter } from './handlers/viewOnce.js';
```
Só `autoVOHunter` é usado. `handleViewOnce` está importado à toa.

---

## 🟠 ALTO (pode causar problemas em produção)

### 5. `createInterface` importado mas nunca usado
**Arquivo:** `index.js:15` — leftover de desenvolvimento.

### 6. `hasViewOnceHint` declarado mas nunca usado
**Arquivo:** `handlers/viewOnce.js:341` — computado em toda mensagem mas resultado descartado.

### 7. `buildViewOnceCaption` exportado mas nunca importado
**Arquivo:** `utils/helpers.js:30` — viewOnce.js usa `buildVOCaptionZueiro` próprio.

### 8. Memory leak: Maps nunca limpos
**Arquivo:** `index.js`
- `recentCipherByChat` — só filtra entries antigas por chat mas nunca remove chats vazios
- `cipherNotifyCache` — nunca limpo
- **Impacto:** Uso de RAM cresce indefinidamente em bots 24/7.

### 9. Timers stale após reconexão
**Arquivo:** `index.js` `scheduleIncomplete`
- Quando a conexão fecha, `pendingIncomplete.clear()` remove as entries mas NÃO limpa os `setTimeout` individuais.
- Os timers continuam rodando e referenciam o `sock` antigo.
- **Impacto:** Erros silenciosos, possível crash.

### 10. `autoVOHunter` faz JSON.stringify desnecessário
**Arquivo:** `handlers/viewOnce.js:341`
```js
const raw = JSON.stringify(Object.keys(msg.message));
const hasViewOnceHint = /viewOnce/i.test(raw);
```
Gera string de TODA mensagem e nunca usa o resultado. Overhead em toda mensagem.

---

## 🟡 MÉDIO (qualidade / performance)

### 11. Imports dinâmicos desnecessários em hot path
- `index.js:153` — importa `extractText` dinamicamente para sentiment
- `handlers/antiEdit.js:265` — importa `bump` dinamicamente a cada edição
- `handlers/ghost.js:48` — importa `getFilterFor, applyContentFilter` a cada espelhamento
**Impacto:** Overhead desnecessário no hot path.

### 12. Store cleanup vs TTL mismatch
- Store TTL: 24h (`config.STORE_TTL_MS`)
- Cleanup: a cada 5 min
- Mensagens ficam 24h na RAM mesmo que o bot rode 24/7
**Sugestão:** Reduzir TTL ou fazer cleanup mais inteligente.

### 13. DiskStore bootCleanup pesado
- Faz `readdir` + `stat` de TODOS os arquivos a cada 30 min
- Com 12000 arquivos no cache = 12000 stat calls a cada 30 min
**Sugestão:** Batch ou reduzir frequência.

### 14. `analytics` duplicado no array de comandos
```js
['analytics', 'analytics', 'dashboard', ...]
```

### 15. Sentiment analysis com vocabulário limitado
- Faltam gírias brasileiras comuns: "tankar", "de base", "mlk", "parça", etc.
- "saudade" está em NEGATIVE mas pode ser positiva dependendo do contexto.

---

## 🟢 BAIXO (estilo / menor impacto)

### 16. Config diz "v3.5" mas bot é v4.2
### 17. `MIRROR_STICKERS: false` no config mas handler tenta processar
### 18. `package.json` keywords desatualizadas
### 19. `ghost.js` — dynamic import de funções que já estão importadas no topo de outros arquivos
### 20. Sem rate limiting para sendMessage — se muitos eventos acontecem ao mesmo tempo, pode floodar o WhatsApp

---

## ✅ O que funciona bem

- **44/44 módulos** carregam sem erro
- **Sintaxe** 100% limpa em todos os arquivos
- **Error handling** robusto (try/catch em todos os handlers)
- **Dedup** de mensagens funciona corretamente
- **Reconexão** com exponential backoff + jitter
- **Crypto noise filter** funciona perfeitamente
- **Disk store** com serialize/deserialize de Buffers correto
- **LRU store** com cleanup automático
