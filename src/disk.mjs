import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DISK_DIRECTORY_NAME = "__disk__";

/**
 * Reads the provided filename from the disk directory, or null.
 *
 * @param {string} filename
 * @returns {Promise<Buffer | null>}
 */
export async function fetchFileFromDiskOrNull(filename) {
	const filePath = join(DISK_DIRECTORY_NAME, filename);

	try {
		return await readFile(filePath);
	} catch (_) {
		return null;
	}
}

/**
 * Writes the provided file to the disk directory, failing if it
 * already exists.
 */
export async function writeFileToDiskOrNull(filename, buffer) {
	const filePath = join(DISK_DIRECTORY_NAME, filename);

	return writeFile(filePath, buffer);
}
