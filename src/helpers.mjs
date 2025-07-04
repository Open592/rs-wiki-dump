/**
 * Waits for a given number of milliseconds.
 */
export async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stringToBase64Encoded(string) {
	const buf = Buffer.from(string);

	return buf.toString("base64url");
}

export function base64EncodedToString(base64Encoded) {
	const buf = Buffer.from(base64Encoded, "base64");

	return buf.toString("utf-8");
}
