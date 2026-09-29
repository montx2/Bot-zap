#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# Bot-Zap v4.2 — Instalador automático pro Termux
# Roda esse script UMA VEZ e tá pronto
# ============================================================

echo "🔥 Bot-Zap v4.2 — Instalador Termux"
echo "===================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Atualiza Termux
echo -e "${YELLOW}[1/6] Atualizando Termux...${NC}"
pkg update -y && pkg upgrade -y

# Instala Node.js e dependências
echo -e "${YELLOW}[2/6] Instalando Node.js e dependências...${NC}"
pkg install nodejs-lts git python make clang binutils -y

# Tenta instalar libvips (pro sharp)
echo -e "${YELLOW}[3/6] Instalando libvips (pro sharp)...${NC}"
pkg install libvips -y 2>/dev/null || echo -e "${RED}libvips não disponível, tentando sem...${NC}"

# Storage access
echo -e "${YELLOW}[4/6] Configurando storage...${NC}"
termux-setup-storage 2>/dev/null || true

# Entra na pasta do bot
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
echo -e "${GREEN}Pasta: $(pwd)${NC}"

# Instala dependências npm
echo -e "${YELLOW}[5/6] Instalando dependências do bot...${NC}"
npm install 2>&1

# Verifica se o sharp instalou
echo -e "${YELLOW}[6/6] Verificando instalação...${NC}"
if node -e "require('sharp'); console.log('✅ sharp OK')" 2>/dev/null; then
    echo -e "${GREEN}✅ Tudo instalado com sucesso!${NC}"
else
    echo -e "${RED}⚠️ Sharp falhou, tentando rebuild...${NC}"
    npm rebuild sharp 2>/dev/null
    if node -e "require('sharp'); console.log('✅ sharp OK')" 2>/dev/null; then
        echo -e "${GREEN}✅ Sharp rebuild funcionou!${NC}"
    else
        echo -e "${YELLOW}⚠️ Sharp com problema. Tentando versão alternativa...${NC}"
        npm install sharp@0.32.6 2>/dev/null
    fi
fi

echo ""
echo "===================================="
echo -e "${GREEN}✅ INSTALAÇÃO CONCLUÍDA!${NC}"
echo ""
echo "Próximos passos:"
echo ""
echo "  1. Edita teu número no config.js:"
echo "     nano config.js"
echo ""
echo "  2. Roda o bot:"
echo "     node index.js"
echo ""
echo "  3. Escaneia o QR Code no WhatsApp"
echo ""
echo "  Dica: pra rodar em background:"
echo "     npm install -g pm2"
echo "     pm2 start index.js --name bot-zap"
echo ""
echo "===================================="
