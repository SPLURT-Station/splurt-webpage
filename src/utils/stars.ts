/**
 * Generate random box-shadow values for stars
 * Replicates the SCSS multiple-box-shadow function
 * @param n - Number of stars to generate
 * @param maxSize - Maximum viewport size (default 2000 for 2000px)
 * @returns CSS box-shadow string
 */
export function generateStarShadows(n: number, maxSize = 2000): string {
	const shadows: string[] = [];
	const pinkColors = [
		"rgba(255, 80, 176, 0.9)",
		"rgba(255, 128, 208, 0.8)",
		"rgba(255, 100, 200, 0.85)",
		"rgba(255, 150, 220, 0.7)",
		"rgba(255, 80, 176, 0.75)",
		"rgba(255, 128, 208, 0.65)",
		"rgba(255, 100, 200, 0.8)",
		"rgba(255, 150, 220, 0.6)",
	];

	for (let i = 0; i < n; i++) {
		const x = Math.floor(Math.random() * maxSize);
		const y = Math.floor(Math.random() * maxSize);
		const color = pinkColors[Math.floor(Math.random() * pinkColors.length)];
		shadows.push(`${x}px ${y}px 0 0 ${color}`);
	}

	return shadows.join(", ");
}

/**
 * Generate star shadows with specific opacity ranges and different shapes
 * Some stars are normal dots, some are cross/plus shapes like in pixel art
 */
export function generateStarShadowsWithOpacity(
	n: number,
	maxSize = 2000,
	opacityRange: { min: number; max: number } = { min: 0.4, max: 0.9 },
	crossStarRatio = 0.3 // 30% of stars will be cross-shaped
): string {
	const shadows: string[] = [];
	const pinkBaseColors = [
		{ r: 255, g: 80, b: 176 },
		{ r: 255, g: 128, b: 208 },
		{ r: 255, g: 100, b: 200 },
		{ r: 255, g: 150, b: 220 },
	];

	for (let i = 0; i < n; i++) {
		const x = Math.floor(Math.random() * maxSize);
		const y = Math.floor(Math.random() * maxSize);
		const colorIndex = Math.floor(Math.random() * pinkBaseColors.length);
		const color = pinkBaseColors[colorIndex];
		const opacity =
			Math.random() * (opacityRange.max - opacityRange.min) + opacityRange.min;
		const colorStr = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity.toFixed(2)})`;

		// Randomly decide if this star should be a cross shape
		const isCross = Math.random() < crossStarRatio;

		if (isCross) {
			// Create cross/plus shape: center + 4 arms
			// Randomly choose cross size (1px or 2px arms)
			const armLength = Math.random() < 0.5 ? 1 : 2;

			// Center pixel (brightest)
			shadows.push(`${x}px ${y}px 0 0 ${colorStr}`);

			// Top arm
			shadows.push(`${x}px ${y - armLength}px 0 0 ${colorStr}`);
			// Bottom arm
			shadows.push(`${x}px ${y + armLength}px 0 0 ${colorStr}`);
			// Left arm
			shadows.push(`${x - armLength}px ${y}px 0 0 ${colorStr}`);
			// Right arm
			shadows.push(`${x + armLength}px ${y}px 0 0 ${colorStr}`);
		} else {
			// Normal circular dot star
			shadows.push(`${x}px ${y}px 0 0 ${colorStr}`);
		}
	}

	return shadows.join(", ");
}
