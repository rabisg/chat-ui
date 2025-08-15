import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Downloads and caches Google Fonts for server-side rendering
 */
class FontLoader {
	private fontCache = new Map<string, ArrayBuffer>();
	private cacheDir = join(tmpdir(), "chat-ui-fonts");

	constructor() {
		// Ensure cache directory exists
		this.ensureCacheDir();
	}

	private async ensureCacheDir() {
		try {
			await fs.mkdir(this.cacheDir, { recursive: true });
		} catch (error) {
			// Directory might already exist, ignore error
		}
	}

	/**
	 * Downloads font file from Google Fonts
	 */
	private async downloadFont(url: string): Promise<ArrayBuffer> {
		const response = await fetch(url, {
			headers: {
				// User agent for woff2 format
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to download font: ${response.statusText}`);
		}

		return response.arrayBuffer();
	}

	/**
	 * Gets Google Fonts CSS and extracts font URLs
	 */
	private async getFontUrls(family: string, weights: number[]): Promise<Record<number, string>> {
		const weightsParam = weights.join(";");
		const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:wght@${weightsParam}&display=swap`;

		const response = await fetch(cssUrl, {
			headers: {
				// User agent for woff2 format
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch font CSS: ${response.statusText}`);
		}

		const css = await response.text();
		const fontUrls: Record<number, string> = {};

		// Parse CSS to extract font URLs for each weight
		for (const weight of weights) {
			const regex = new RegExp(`font-weight: ${weight};[\\s\\S]*?src: url\\(([^)]+)\\)`, "g");
			const match = regex.exec(css);
			if (match && match[1]) {
				fontUrls[weight] = match[1];
			}
		}

		return fontUrls;
	}

	/**
	 * Loads a font with caching
	 */
	async loadFont(family: string, weight: number): Promise<ArrayBuffer> {
		const cacheKey = `${family}-${weight}`;

		// Check memory cache first
		const cachedFont = this.fontCache.get(cacheKey);
		if (cachedFont) {
			return cachedFont;
		}

		// Check file cache
		const cacheFile = join(this.cacheDir, `${cacheKey}.woff2`);
		try {
			const cachedData = await fs.readFile(cacheFile);
			const arrayBuffer = new ArrayBuffer(cachedData.byteLength);
			const view = new Uint8Array(arrayBuffer);
			view.set(new Uint8Array(cachedData));
			this.fontCache.set(cacheKey, arrayBuffer);
			return arrayBuffer;
		} catch {
			// Cache miss, download font
		}

		// Download and cache the font
		const fontUrls = await this.getFontUrls(family, [weight]);
		const fontUrl = fontUrls[weight];

		if (!fontUrl) {
			throw new Error(`Font not found: ${family} weight ${weight}`);
		}

		const fontData = await this.downloadFont(fontUrl);

		// Cache to file system
		try {
			await fs.writeFile(cacheFile, Buffer.from(fontData));
		} catch (error) {
			console.warn("Failed to cache font to file system:", error);
		}

		// Cache in memory
		this.fontCache.set(cacheKey, fontData);

		return fontData;
	}

	/**
	 * Loads multiple fonts at once
	 */
	async loadFonts(family: string, weights: number[]): Promise<Record<number, ArrayBuffer>> {
		const fonts: Record<number, ArrayBuffer> = {};

		// Load fonts in parallel
		const fontPromises = weights.map(async (weight) => {
			const fontData = await this.loadFont(family, weight);
			fonts[weight] = fontData;
		});

		await Promise.all(fontPromises);
		return fonts;
	}
}

// Create singleton instance
const fontLoader = new FontLoader();

/**
 * Loads Inter fonts for the given weights
 */
export async function loadInterFonts(
	weights: number[] = [400, 700]
): Promise<Record<number, ArrayBuffer>> {
	return fontLoader.loadFonts("Inter", weights);
}

/**
 * Loads a single Inter font
 */
export async function loadInterFont(weight: number = 400): Promise<ArrayBuffer> {
	return fontLoader.loadFont("Inter", weight);
}
