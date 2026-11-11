module.exports = {
  apps: [
    {
      name: "clipcraft",
      script: "scripts/serve.mjs",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      restart_delay: 3000,
      min_uptime: "10s",
      max_restarts: 100,
      kill_timeout: 5000,
      time: true,
      out_file: "./logs/clipcraft.out.log",
      error_file: "./logs/clipcraft.err.log",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "8080",
      },
    },
  ],
};
