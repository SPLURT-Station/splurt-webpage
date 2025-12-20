"use strict";
module.exports = {
	apps: [
		{
			name: "splurt-webpage",
			script: "./dist/server/entry.mjs",
			interpreter: "bun",
			instances: 1,
			exec_mode: "fork",
			env: {
				NODE_ENV: "production",
				PORT: 4321,
				HOST: "0.0.0.0",
				PATH: process.env.HOME
					? `${process.env.HOME}/.bun/bin:${process.env.PATH}`
					: process.env.PATH,
			},
			error_file: "./logs/pm2-error.log",
			out_file: "./logs/pm2-out.log",
			log_file: "./logs/pm2-combined.log",
			time: true,
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			merge_logs: true,
			autorestart: true,
			max_restarts: 10,
			min_uptime: "10s",
			max_memory_restart: "1G",
			watch: false,
			ignore_watch: ["node_modules", "logs", ".git"],
		},
	],
};
