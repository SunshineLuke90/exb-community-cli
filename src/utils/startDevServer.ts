import { spawn, execSync } from "child_process"

export function startDevServer(clientDir: string, serverDir: string) {
	console.log("Starting client and server development servers...")

	// Save terminal settings before spawning child processes (Unix/macOS only)
	let savedTermSettings: string | null = null
	if (process.platform !== "win32" && process.stdin.isTTY) {
		try {
			savedTermSettings = execSync("stty -g", {
				stdio: ["inherit", "pipe", "pipe"]
			})
				.toString()
				.trim()
		} catch {}
	}

	const restoreTerminal = () => {
		if (savedTermSettings) {
			try {
				execSync(`stty ${savedTermSettings}`, { stdio: "inherit" })
			} catch {}
		}
	}

	const serverProc = spawn("npm", ["start"], {
		cwd: serverDir,
		stdio: "ignore",
		detached: true
	})
	serverProc.unref()

	const clientProc = spawn("npm", ["start"], {
		cwd: clientDir,
		stdio: "inherit"
	})

	let isShuttingDown = false
	const shutdown = () => {
		if (isShuttingDown) return
		isShuttingDown = true

		if (serverProc && !serverProc.killed && serverProc.pid) {
			try {
				process.kill(-serverProc.pid)
			} catch {}
		}
		if (clientProc && !clientProc.killed) {
			try {
				clientProc.kill()
			} catch {}
		}
		restoreTerminal()
		process.exit()
	}
	process.on("SIGINT", shutdown)
	process.on("SIGTERM", shutdown)
	clientProc.on("exit", shutdown)
}
