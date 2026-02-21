#!/usr/bin/env bun
/**
 * Image enrichment and optimization script
 * Enriches images with metadata and creates optimized versions for web use
 *
 * Usage:
 *   bun src/utils/enrich-image.ts <image-path> [options]
 *
 * Options:
 *   --title <title>           Image title
 *   --description <desc>      Image description
 *   --author <author>          Author name or HTML link (e.g., '<a href="...">Name</a>')
 *   --sources <urls>           Comma-separated list of source URLs
 *   --output <path>            Output directory (default: same as input)
 *   --quality <number>         JPEG/WebP quality 1-100 (default: 95)
 *   --format <format>          Output format: webp, jpg, png (default: webp)
 *   --width <pixels>           Max width (maintains aspect ratio, optional)
 *   --no-optimize              Skip image optimization, only create metadata
 *   --overwrite                Overwrite existing files
 *   --read                     Read and display metadata from image (no processing)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import sharp from "sharp";
import type { ImageMetadataInfo } from "./image-metadata";
import {
	getFilenameWithoutExtension,
	readImageMetadataFromFile,
} from "./image-metadata";

interface EnrichOptions {
	title?: string;
	description?: string;
	author?: string;
	sources?: string[];
	output?: string;
	quality?: number;
	format?: "webp" | "jpg" | "png";
	width?: number;
	noOptimize?: boolean;
	overwrite?: boolean;
	read?: boolean;
}

/**
 * Show help message
 */
function showHelp(): void {
	console.log(`
Image Enrichment and Optimization Tool

Usage:
  bun src/utils/enrich-image.ts <image-path> [options]

Options:
  --title <title>           Image title
  --description <desc>      Image description
  --author <author>         Author name or HTML link (e.g., '<a href="...">Name</a>')
  --sources <urls>          Comma-separated list of source URLs
  --output <path>           Output directory (default: same as input)
  --quality <number>         JPEG/WebP quality 1-100 (default: 95)
  --format <format>         Output format: webp, jpg, png (default: webp)
  --width <pixels>           Max width (maintains aspect ratio, optional)
  --no-optimize             Skip image optimization, only create metadata
  --overwrite               Overwrite existing files
  --read                    Read and display metadata from image (no processing)

Examples:
  bun src/utils/enrich-image.ts image.png --title "My Image" --description "A cool image"
  bun src/utils/enrich-image.ts image.jpg --author '<a href="https://artist.com">Artist</a>' --sources "https://artstation.com/art,https://deviantart.com/art"
  bun src/utils/enrich-image.ts image.png --read
`);
}

/**
 * Check if next argument is valid (not another flag)
 */
function hasValidNextArg(nextArg: string | undefined): boolean {
	return !!nextArg && !nextArg.startsWith("--");
}

/**
 * Parse string arguments (title, description, author, output)
 */
function parseStringArg(
	arg: string,
	nextArg: string | undefined,
	options: EnrichOptions
): { consumed: boolean; skipNext: boolean } {
	if (!nextArg) {
		return { consumed: false, skipNext: false };
	}

	if (arg === "--title") {
		options.title = nextArg;
		return { consumed: true, skipNext: true };
	}
	if (arg === "--description") {
		options.description = nextArg;
		return { consumed: true, skipNext: true };
	}
	if (arg === "--author") {
		options.author = nextArg;
		return { consumed: true, skipNext: true };
	}
	if (arg === "--output") {
		options.output = nextArg;
		return { consumed: true, skipNext: true };
	}
	return { consumed: false, skipNext: false };
}

/**
 * Parse numeric arguments (quality, width)
 */
function parseNumericArg(
	arg: string,
	nextArg: string | undefined,
	options: EnrichOptions
): { consumed: boolean; skipNext: boolean } {
	if (!nextArg) {
		return { consumed: false, skipNext: false };
	}

	if (arg === "--quality") {
		options.quality = Number.parseInt(nextArg, 10);
		return { consumed: true, skipNext: true };
	}
	if (arg === "--width") {
		options.width = Number.parseInt(nextArg, 10);
		return { consumed: true, skipNext: true };
	}
	return { consumed: false, skipNext: false };
}

/**
 * Parse format argument
 */
function parseFormatArg(
	arg: string,
	nextArg: string | undefined,
	options: EnrichOptions
): { consumed: boolean; skipNext: boolean } {
	if (arg !== "--format" || !nextArg) {
		return { consumed: false, skipNext: false };
	}

	if (nextArg === "webp" || nextArg === "jpg" || nextArg === "png") {
		options.format = nextArg;
		return { consumed: true, skipNext: true };
	}
	console.error(`Invalid format: ${nextArg}. Must be webp, jpg, or png`);
	process.exit(1);
}

/**
 * Parse sources argument
 */
function parseSourcesArg(
	arg: string,
	nextArg: string | undefined,
	options: EnrichOptions
): { consumed: boolean; skipNext: boolean } {
	if (arg === "--sources" && nextArg) {
		options.sources = nextArg.split(",").map((s) => s.trim());
		return { consumed: true, skipNext: true };
	}
	return { consumed: false, skipNext: false };
}

/**
 * Parse a single CLI argument with value
 */
function parseArgWithValue(
	arg: string,
	nextArg: string | undefined,
	options: EnrichOptions
): { consumed: boolean; skipNext: boolean } {
	if (!hasValidNextArg(nextArg)) {
		return { consumed: false, skipNext: false };
	}

	const stringResult = parseStringArg(arg, nextArg, options);
	if (stringResult.consumed) {
		return stringResult;
	}

	const numericResult = parseNumericArg(arg, nextArg, options);
	if (numericResult.consumed) {
		return numericResult;
	}

	const formatResult = parseFormatArg(arg, nextArg, options);
	if (formatResult.consumed) {
		return formatResult;
	}

	const sourcesResult = parseSourcesArg(arg, nextArg, options);
	if (sourcesResult.consumed) {
		return sourcesResult;
	}

	return { consumed: false, skipNext: false };
}

/**
 * Parse a single CLI argument
 */
function parseArg(
	arg: string,
	nextArg: string | undefined,
	options: EnrichOptions
): { consumed: boolean; skipNext: boolean } {
	const withValue = parseArgWithValue(arg, nextArg, options);
	if (withValue.consumed) {
		return withValue;
	}

	if (arg === "--no-optimize") {
		options.noOptimize = true;
		return { consumed: true, skipNext: false };
	}
	if (arg === "--overwrite") {
		options.overwrite = true;
		return { consumed: true, skipNext: false };
	}
	if (arg === "--read") {
		options.read = true;
		return { consumed: true, skipNext: false };
	}

	return { consumed: false, skipNext: false };
}

/**
 * Parse CLI arguments
 */
function parseArgs(): {
	imagePath: string;
	options: EnrichOptions;
} {
	const args = process.argv.slice(2);

	if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
		showHelp();
		process.exit(0);
	}

	const imagePath = args[0];
	const options: EnrichOptions = {};

	let index = 1;
	while (index < args.length) {
		const arg = args[index];
		const nextArg = args[index + 1];
		const result = parseArg(arg, nextArg, options);

		if (!result.consumed) {
			console.error(`Unknown option: ${arg}`);
			process.exit(1);
		}

		index += 1;
		if (result.skipNext) {
			index += 1;
		}
	}

	return { imagePath, options };
}

/**
 * Apply image format conversion using Sharp
 */
function applyFormat(
	// biome-ignore lint/suspicious/noExplicitAny: Sharp pipeline type is complex
	pipeline: any,
	format: "webp" | "jpg" | "png",
	quality: number
	// biome-ignore lint/suspicious/noExplicitAny: Sharp pipeline return type is complex
): any {
	switch (format) {
		case "webp":
			return pipeline.webp({ quality });
		case "jpg":
			return pipeline.jpeg({ quality });
		case "png":
			return pipeline.png({ compressionLevel: 9 });
		default:
			return pipeline;
	}
}

/**
 * Embed metadata in image using EXIF UserComment field
 * Metadata is stored as a base64-encoded JSON string
 */
function embedMetadata(
	// biome-ignore lint/suspicious/noExplicitAny: Sharp types are complex
	pipeline: any,
	metadata: ImageMetadataInfo
	// biome-ignore lint/suspicious/noExplicitAny: Sharp pipeline return type is complex
): any {
	const metadataJson = JSON.stringify(metadata);
	const base64Metadata = Buffer.from(metadataJson, "utf8").toString("base64");

	const metadataObj: Record<string, unknown> = {
		exif: {
			IFD0: {
				UserComment: base64Metadata,
			},
		},
	};

	return pipeline.withMetadata(metadataObj);
}

/**
 * Optimize image using Sharp
 */
async function optimizeImage(
	inputPath: string,
	outputPath: string,
	options: {
		quality?: number;
		format?: "webp" | "jpg" | "png";
		width?: number;
		metadata?: ImageMetadataInfo;
	}
): Promise<void> {
	try {
		let pipeline = sharp(inputPath);

		if (options.metadata) {
			pipeline = embedMetadata(pipeline, options.metadata);
		}

		if (options.width) {
			pipeline = pipeline.resize(options.width, null, {
				withoutEnlargement: true,
				fit: "inside",
			});
		}

		const format = options.format || "webp";
		const quality = options.quality || 95;
		pipeline = applyFormat(pipeline, format, quality);

		await pipeline.toFile(outputPath);
		console.log(`✓ Optimized image saved to: ${outputPath}`);
		if (options.metadata) {
			console.log("✓ Metadata embedded in image");
		}
	} catch (error) {
		console.warn(
			"Sharp error:",
			error instanceof Error ? error.message : error
		);
		const inputData = readFileSync(inputPath);
		writeFileSync(outputPath, inputData);
		console.log(`✓ Image copied to: ${outputPath} (no optimization applied)`);
	}
}

/**
 * Process image without optimization but with metadata embedding
 */
async function processImageWithoutOptimization(
	inputPath: string,
	outputPath: string,
	metadata: ImageMetadataInfo
): Promise<void> {
	try {
		let pipeline = sharp(inputPath);
		pipeline = embedMetadata(pipeline, metadata);
		await pipeline.toFile(outputPath);
		console.log(
			`✓ Image copied to: ${outputPath} (optimization skipped, metadata embedded)`
		);
	} catch {
		const inputData = readFileSync(inputPath);
		writeFileSync(outputPath, inputData);
		console.log(`✓ Image copied to: ${outputPath} (optimization skipped)`);
		console.warn("⚠ Metadata not embedded (Sharp required)");
	}
}

/**
 * Build metadata object from options
 */
function buildMetadata(options: EnrichOptions): ImageMetadataInfo {
	const metadata: ImageMetadataInfo = {};
	if (options.title) {
		metadata.title = options.title;
	}
	if (options.description) {
		metadata.description = options.description;
	}
	if (options.author) {
		metadata.author = options.author;
	}
	if (options.sources && options.sources.length > 0) {
		metadata.sources = options.sources;
	}
	return metadata;
}

/**
 * Check if metadata has any content
 */
function hasMetadata(metadata: ImageMetadataInfo): boolean {
	return !!(
		metadata.title ||
		metadata.description ||
		metadata.author ||
		metadata.sources
	);
}

/**
 * Determine output path from input
 */
function getOutputPath(
	inputPath: string,
	options: EnrichOptions
): {
	outputPath: string;
	outputDir: string;
	outputFormat: "webp" | "jpg" | "png";
} {
	const inputDir = dirname(inputPath);
	const parsed = parse(inputPath);
	const inputName = getFilenameWithoutExtension(parsed.name);
	const outputDir = options.output ? resolve(options.output) : inputDir;
	const outputFormat = options.format || "webp";
	const outputExt = outputFormat === "jpg" ? ".jpg" : `.${outputFormat}`;
	const outputPath = join(outputDir, `${inputName}${outputExt}`);
	return { outputPath, outputDir, outputFormat };
}

/**
 * Display metadata in a readable format
 */
function displayMetadata(metadata: ImageMetadataInfo, filename: string): void {
	console.log("=== Image Metadata ===\n");

	const title = metadata.title || filename;
	console.log(`Title: ${title}`);

	if (metadata.description) {
		console.log(`\nDescription:\n${metadata.description}`);
	}

	if (metadata.author) {
		console.log(`\nArtist: ${metadata.author}`);
	}

	if (metadata.sources && metadata.sources.length > 0) {
		console.log("\nSources:");
		for (const source of metadata.sources) {
			console.log(`  - ${source}`);
		}
	}

	console.log("\n✓ Metadata read successfully!");
}

/**
 * Read and display metadata from image
 */
async function readImageMetadata(imagePath: string): Promise<void> {
	const inputPath = resolve(imagePath);
	if (!existsSync(inputPath)) {
		console.error(`Error: Image file not found: ${inputPath}`);
		process.exit(1);
	}

	console.log(`Reading metadata from: ${inputPath}\n`);

	try {
		const metadata = await readImageMetadataFromFile(inputPath);

		if (!metadata) {
			console.log("No metadata found in image.");
			process.exit(0);
		}

		const parsed = parse(inputPath);
		const filename = getFilenameWithoutExtension(parsed.name);
		displayMetadata(metadata, filename);
	} catch (error) {
		console.error("Error reading metadata:", error);
		process.exit(1);
	}
}

/**
 * Main function
 */
async function main() {
	const { imagePath, options } = parseArgs();

	if (options.read) {
		await readImageMetadata(imagePath);
		return;
	}

	const inputPath = resolve(imagePath);
	if (!existsSync(inputPath)) {
		console.error(`Error: Image file not found: ${inputPath}`);
		process.exit(1);
	}

	const { outputPath, outputDir, outputFormat } = getOutputPath(
		inputPath,
		options
	);

	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true });
	}

	if (existsSync(outputPath) && !options.overwrite) {
		console.error(
			`Error: Output file already exists: ${outputPath}\nUse --overwrite to replace it.`
		);
		process.exit(1);
	}

	const metadata = buildMetadata(options);
	const hasMeta = hasMetadata(metadata);

	if (options.noOptimize) {
		await processImageWithoutOptimization(inputPath, outputPath, metadata);
	} else {
		await optimizeImage(inputPath, outputPath, {
			quality: options.quality,
			format: outputFormat,
			width: options.width,
			metadata: hasMeta ? metadata : undefined,
		});
	}

	if (!hasMeta) {
		console.warn(
			"No metadata provided. Use --title, --description, --author, or --sources to add metadata."
		);
	}

	console.log("\n✓ Image enrichment complete!");
}

// Run the script
main().catch((error) => {
	console.error("Error:", error);
	process.exit(1);
});
