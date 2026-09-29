/**
 * PM2 — Bot-Zap v3 Ultimate 24/7 Blindado
 * - auto-restart exponencial
 * - memória 500M
 * - log rotation
 * - cron restart diário opcional
 */
module.exports = {
  apps: [
    {
      name: 'viewonce-bot',
      script: 'index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      min_uptime: '15s',
      max_restarts: 100,
      restart_delay: 3000,
      exp_backoff_restart_delay: 2000,
      kill_timeout: 5000,
      wait_ready: false,
      // restart diário às 04:00 para limpar leaks (opcional)
      cron_restart: '0 4 * * *',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      },
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'DD-MM HH:mm:ss',
      merge_logs: true,
      time: true,
      // evita loop infinito se falhar na inicialização
      autorestart_delay: 100,
      // health check interno PM2
      health_check_grace_period: 10000,
    },
  ],
};
