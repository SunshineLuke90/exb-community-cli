import fs from "fs-extra"
import path from "path"
import { startDevServer } from "../utils/startDevServer"

export function start(): void {
	const clientDir = process.cwd()
	const serverDir = path.join(process.cwd(), "..", "server")

	if (!fs.existsSync(path.join(clientDir, "your-extensions"))) {
		console.error("Error: Run this from the ExB client folder.")
		return
	}

	startDevServer(clientDir, serverDir)
}
