import fs from "fs-extra"
import path from "path"
import { pipeline } from "stream/promises"
import { createWriteStream } from "fs"
import { execSync, spawn } from "child_process"
import { createInterface } from "readline"
import Enquirer from "enquirer"
import os from "os"

export interface DevSetupOptions {
	version: string
}

export async function devSetup(options: DevSetupOptions): Promise<void> {
	let version = options.version

	const response = await fetch(
		"https://developers.arcgis.com/experience-builder/guide/downloads/"
	)
	const html = await response.text()
	// Extract version numbers from the page using a regex
	const versions = [...html.matchAll(/py-4 pr-3">v(\d+\.\d+)/g)].map(
		(m) => m[1]
	)

	if (options.version && options.version == "latest") {
		console.log("Setting up development environment for latest version...")
		const latestVersion = versions[0]
		version = latestVersion
	} else if (options.version === undefined) {
		const prompt = new Enquirer.Select({
			name: "version",
			message: "Choose an Experience Builder version",
			choices: versions,
			limit: 5
		})
		const chosenVersion = await prompt.run()
		version = chosenVersion
	}

	// Actually install and set up the chosen version of Experience Builder
	await installExperienceBuilder(version)

	// Ask user if they want to start the development servers now
	const approveStart = await new Enquirer.Confirm({
		name: "start",
		message: "Do you want to start the development server now?"
	}).run()

	if (!approveStart) {
		console.log(
			"You can start the development server later by running `npm start` in the client and server folders."
		)
		return
	}

	const clientDir = path.join(
		process.cwd(),
		`arcgis-experience-builder-${version}`,
		"client"
	)
	const serverDir = path.join(
		process.cwd(),
		`arcgis-experience-builder-${version}`,
		"server"
	)

	console.log("Starting development servers in new terminal windows...")

	openInNewTerminal(clientDir, "client")
	openInNewTerminal(serverDir, "server")
}

const ciWithSpinner = (message: string, cwd: string): Promise<void> => {
	const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
	let frameIndex = 0
	return new Promise((resolve, reject) => {
		const interval = setInterval(() => {
			frameIndex = (frameIndex + 1) % spinnerFrames.length
			process.stdout.write(`\r  ${spinnerFrames[frameIndex]} ${message}`)
		}, 80)
		process.stdout.write(`  ${spinnerFrames[0]} ${message}`)
		const proc = spawn("npm", ["ci"], { cwd, stdio: "pipe" })
		proc.on("close", (code) => {
			clearInterval(interval)
			if (code === 0) {
				process.stdout.write(`\r  ✔ ${message} done.\n`)
				resolve()
			} else {
				process.stdout.write(`\r  ✖ ${message} failed.\n`)
				reject(new Error(`npm ci exited with code ${code}`))
			}
		})
		proc.on("error", (err) => {
			clearInterval(interval)
			reject(err)
		})
	})
}

const openInNewTerminal = (cwd: string, label: string) => {
	const cmd = `cd "${cwd}" && npm start`

	if (process.platform === "darwin") {
		const script = `tell application "Terminal"\nactivate\ndo script "${cmd.replace(/"/g, '\\"')}"\nend tell`
		spawn("osascript", ["-e", script], {
			stdio: "ignore",
			detached: true
		}).unref()
	} else if (process.platform === "win32") {
		spawn("cmd.exe", ["/c", "start", "cmd.exe", "/k", cmd], {
			cwd,
			stdio: "ignore",
			detached: true,
			shell: true
		}).unref()
	} else {
		// Linux: try common terminal emulators in order
		const terminals = [
			{
				bin: "x-terminal-emulator",
				args: ["-e", `bash -c '${cmd}; exec bash'`]
			},
			{
				bin: "gnome-terminal",
				args: ["--", "bash", "-c", `${cmd}; exec bash`]
			},
			{ bin: "konsole", args: ["-e", "bash", "-c", `${cmd}; exec bash`] },
			{
				bin: "xfce4-terminal",
				args: ["-e", `bash -c '${cmd}; exec bash'`]
			},
			{ bin: "xterm", args: ["-e", `bash -c '${cmd}; exec bash'`] }
		]

		let launched = false
		for (const t of terminals) {
			try {
				execSync(`which ${t.bin}`, { stdio: "pipe" })
				spawn(t.bin, t.args, {
					cwd,
					stdio: "ignore",
					detached: true
				}).unref()
				launched = true
				break
			} catch {
				// not found, try next
			}
		}
		if (!launched) {
			console.log(
				`  ⚠ No supported terminal found. Run manually: cd "${cwd}" && npm start`
			)
			return
		}
	}
	console.log(`  ✔ Opened ${label} in a new terminal window.`)
}

const installExperienceBuilder = async (version: string): Promise<string> => {
	const url = `https://downloads.arcgis.com/dms/rest/download/secured/arcgis-experience-builder-${version}.zip?f=json&folder=software%2FExperienceBuilder%2F${version}`

	const res = await fetch(url)
	if (!res.ok) {
		throw new Error(
			`Failed to fetch download info: ${res.status} ${res.statusText}`
		)
	}
	const json = (await res.json()) as { url?: string }
	const downloadUrl = json.url
	if (!downloadUrl) {
		throw new Error("No download URL found in response")
	}

	// Download the zip file to a temporary location
	const zipPath = path.join(os.tmpdir(), `exb-install-${Date.now()}`)
	const extractDir = path.resolve(
		process.cwd(),
		`arcgis-experience-builder-${version}`
	)

	try {
		console.log(`Downloading zip`)
		const zipRes = await fetch(downloadUrl)
		if (!zipRes.ok || !zipRes.body) {
			throw new Error(
				`Failed to download zip: ${zipRes.status} ${zipRes.statusText}`
			)
		}
		await pipeline(
			zipRes.body as unknown as NodeJS.ReadableStream,
			createWriteStream(zipPath)
		)

		// Extract the zip file to a folder in the current directory
		console.log(`Extracting to ${extractDir}...`)
		await fs.ensureDir(extractDir)

		// Get total file count for progress bar (pipe through tail to avoid buffer overflow on large zips)
		const listSummary = execSync(`unzip -l "${zipPath}" | tail -1`, {
			encoding: "utf-8"
		})
		const countMatch = listSummary.match(/(\d+)\s+files?/)
		const totalFiles = countMatch ? parseInt(countMatch[1], 10) : 1

		await new Promise<void>((resolve, reject) => {
			let extracted = 0
			const proc = spawn("unzip", ["-o", zipPath, "-d", extractDir])
			const rl = createInterface({ input: proc.stdout })
			rl.on("line", (line) => {
				if (/^\s*(extracting|inflating|creating):/.test(line)) {
					extracted++
					const pct = Math.min(100, Math.round((extracted / totalFiles) * 100))
					const filled = Math.round(pct / 4)
					const bar = "█".repeat(filled) + "░".repeat(25 - filled)
					process.stdout.write(
						`\r  [${bar}] ${pct}% (${extracted}/${totalFiles})`
					)
				}
			})
			proc.stderr.on("data", () => {}) // suppress stderr
			proc.on("close", (code) => {
				process.stdout.write("\n")
				if (code === 0) resolve()
				else reject(new Error(`unzip exited with code ${code}`))
			})
			proc.on("error", reject)
		})

		// Remove any directory nesting (some zip versions include an extra top-level folder)
		const entries = await fs.readdir(extractDir)
		const hasClient = entries.includes("client")
		const hasServer = entries.includes("server")

		if (!hasClient || !hasServer) {
			// Check if there's a single nested directory containing client/ and server/
			const dirs = []
			for (const entry of entries) {
				const stat = await fs.stat(path.join(extractDir, entry))
				if (stat.isDirectory()) dirs.push(entry)
			}

			if (dirs.length === 1) {
				const nestedDir = path.join(extractDir, dirs[0])
				const nestedEntries = await fs.readdir(nestedDir)
				if (
					nestedEntries.includes("client") &&
					nestedEntries.includes("server")
				) {
					// Move all contents from the nested dir up to extractDir
					for (const item of nestedEntries) {
						await fs.move(
							path.join(nestedDir, item),
							path.join(extractDir, item),
							{ overwrite: true }
						)
					}
					await fs.remove(nestedDir)
				} else {
					throw new Error(
						"Extracted zip does not contain expected client/ and server/ folders"
					)
				}
			} else {
				throw new Error(
					"Extracted zip does not contain expected client/ and server/ folders"
				)
			}
		}

		// Install dependencies in client and server folders

		const clientDir = path.join(extractDir, "client")
		const serverDir = path.join(extractDir, "server")

		await ciWithSpinner("Installing client dependencies...", clientDir)
		await ciWithSpinner("Installing server dependencies...", serverDir)
		return extractDir
	} catch (err) {
		console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
		return ""
	} finally {
		// Clean up the zip file
		await fs.remove(zipPath)
	}
}
