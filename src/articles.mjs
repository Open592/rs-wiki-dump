import { WIKI_API_URL } from "./constants.mjs";
import { fetchFileFromDiskOrNull, writeFileToDiskOrNull } from "./disk.mjs";
import { sleep, stringToBase64Encoded } from "./helpers.mjs";

const allPagesQueryBaseUrl = `${WIKI_API_URL}?action=query&list=allpages&aplimit=max&format=json`;

/**
 * This function is responsible for fetching all pages
 * from the Runescape Wiki.
 *
 * The output of this function will be cached on local disk
 * to reduce the need to re-fetch. Our eventual use-case for
 * this data is to later fetch metadata about each page and
 * filter down to pages which were relevant back in 2010, so
 * there is no need to have a expiry for the cache. If it exists
 * we will use it.
 */
export async function fetchAllPages() {
	let batchCount = 0;
	// Media wiki `query` action returns a paginated list of pages
	// up to a maximum of ~500. Within the body of the response is
	// a pointer to the next page of data. We must continue fetching
	// pages until this pointer is empty.
	for await (const pages of queryAllPages()) {
		batchCount++;

		const startPage = pages[0];
		const endPage = pages[pages.length - 1];

		console.log(
			`Fetched batch ${batchCount}: Starting page: ${startPage.title} / Ending page: ${endPage.title}`,
		);
	}
}

async function* queryAllPages() {
	let next = null;

	while (true) {
		try {
			const { apcontinue, allPagesBatch } = await getAllPagesBatch(next);

			yield allPagesBatch;

			if (!apcontinue) {
				break;
			}

			next = apcontinue;

			await sleep(1000);
		} catch (e) {
			console.error(`Failed to fetch ${next} batch`, e);
		}
	}
}

/**
 * @typedef AllPagesBatchResult
 * @type {object}
 * @property {string | null} apcontinue
 * @property {string[]} allPagesBatch
 */

/**
 * Parses the result of a page of results from the `allpages` query
 * returning both the batch of pages as well as the pointer to the
 * next page.
 *
 * @param {string} batch
 * @returns {AllPagesBatchResult}
 */
function parseAllPagesBatch(batch) {
	const nextPointer = batch.continue;
	const query = batch.query;

	return {
		apcontinue: nextPointer?.apcontinue ?? null,
		allPagesBatch: query.allpages ?? [],
	};
}

/**
 * Gets the pages batch from either local disk or network.
 *
 * @param {string} apcontinue
 * @returns {Promise<AllPagesBatchResult>}
 */
async function getAllPagesBatch(apcontinue) {
	const batchFromDisk = await fetchAllPagesBatchFromDiskOrNull(apcontinue);

	if (batchFromDisk) {
		return parseAllPagesBatch(batchFromDisk);
	}

	const url = getAllPagesQueryUrl(apcontinue);

	console.log(`Fetching batch of pages from: ${url}`);

	const res = await fetch(url);
	const buffer = Buffer.from(await res.arrayBuffer());
	const json = JSON.parse(buffer);

	const diskFilename = getAllPagesBatchFilename(apcontinue);

	await writeFileToDiskOrNull(diskFilename, buffer);

	return parseAllPagesBatch(json);
}

/**
 * Gets the url for the particular page of the `allpages` query we want to
 * perform.
 *
 * @param {string | null} apcontinue The pointer to the page we want to query
 * @returns {string}
 */
function getAllPagesQueryUrl(apcontinue) {
	if (!apcontinue) {
		return allPagesQueryBaseUrl;
	}

	return `${allPagesQueryBaseUrl}&apcontinue=${apcontinue}`;
}

/**
 * Attempts to fetch all the pages on the wiki from the local
 * disk cache, returning null in case it doesn't exist.
 *
 * @param {string | null} apcontinue
 * @returns {Promise<string | null>}
 */
async function fetchAllPagesBatchFromDiskOrNull(apcontinue) {
	const allPagesBuf = await fetchFileFromDiskOrNull(
		getAllPagesBatchFilename(apcontinue),
	);

	if (!allPagesBuf) {
		return null;
	}

	try {
		return JSON.parse(allPagesBuf);
	} catch (_) {
		return null;
	}
}

/**
 * Get the file identifier for an all pages query file batch.
 *
 * This identifier is derived from the apcontinue value, or "head"
 * if it's `null`.
 *
 * @param {string | null} apcontinue
 * @returns {string}
 */
function getAllPagesBatchFilename(apcontinue) {
	const identifier = apcontinue ? stringToBase64Encoded(apcontinue) : "head";

	return `allPages.${identifier}.json`;
}
