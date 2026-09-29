# 📱 Instalação no Termux — Bot-Zap v4.2

## Passo 1: Atualizar Termux
```bash
pkg update && pkg upgrade -y
```

## Passo 2: Instalar dependências do sistema
```bash
pkg install nodejs-lts git python make clang -y
```

## Passo 3: Instalar ferramentas de build (pro sharp)
```bash
pkg install binutils libvips -y
```

## Passo 4: Navegar até a pasta do bot
```bash
cd /storage/emulated/0/Documents/Bot/Bot-zap-arena-019f81dc-bot-zap
```

## Passo 5: Permitir acesso ao storage (se ainda não fez)
```bash
termux-setup-storage
```

## Passo 6: Instalar as dependências do bot
```bash
npm install
```

> Se der erro no `sharp`, tenta:
> ```bash
> npm install --build-from-source
> ```
> Ou:
> ```bash
> npm install sharp --force
> ```

## Passo 7: Editar o config.js com seu número
```bash
nano config.js
```
Muda a linha `OWNER_NUMBER: '553799384375'` pro teu número (já tá ok se for esse).
Pra salvar: `Ctrl+O`, `Enter`, `Ctrl+X`

## Passo 8: Rodar o bot
```bash
node index.js
```

Vai aparecer um QR Code no terminal. Abre o WhatsApp → Aparelhos conectados → Conectar aparelho → Escaneia o QR.

---

## 🔄 Comandos úteis

### Rodar em background (não fecha quando sai do Termux):
```bash
npm install -g pm2
pm2 start index.js --name bot-zap
pm2 save
pm2 startup
```

### Ver logs:
```bash
pm2 logs bot-zap
```

### Parar o bot:
```bash
pm2 stop bot-zap
```

### Reiniciar:
```bash
pm2 restart bot-zap
```

### Rodar direto (sem PM2, fecha quando sair):
```bash
node index.js
```

### Rodar com auto-restart (fecha Ctrl+C pra parar):
```bash
npm run dev
```

---

## ❌ Se der erro no sharp:

### Opção A — Forçar build:
```bash
npm rebuild sharp
```

### Opção B — Instalar build tools:
```bash
pkg install python make g++ -y
npm install sharp --build-from-source
```

### Opção C — Usar versão compatível:
```bash
npm install sharp@0.32.6
```

---

## ❌ Se der erro "Cannot find module":
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## ❌ Se o QR não aparecer:
```bash
rm -rf auth_info
node index.js
```

---

## 📂 Resumo da estrutura:
```
/storage/emulated/0/Documents/Bot/Bot-zap-arena-019f81dc-bot-zap/
├── index.js          ← roda com: node index.js
├── config.js         ← edita teu número aqui
├── handlers/         ← código dos handlers
├── utils/            ← utilitários
├── auth_info/        ← sessão do WhatsApp (criada automaticamente)
├── data/             ← dados do bot (criada automaticamente)
└── downloads/        ← mídias baixadas (criada automaticamente)
```
