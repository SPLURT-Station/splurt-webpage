import { createSignal, onMount } from "solid-js";
import "./navigation.css";

// Iconify icons as inline SVG components
function DiscordIcon(props: {
	class?: string;
	width?: number;
	height?: number;
	fill?: string;
}) {
	return (
		<svg
			aria-hidden="true"
			class={props.class}
			fill={props.fill || "currentColor"}
			height={props.height || 24}
			viewBox="0 0 24 24"
			width={props.width || 24}
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Discord</title>
			<path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.1.1 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.1 16.1 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02M8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12m6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12" />
		</svg>
	);
}

function GithubIcon(props: {
	class?: string;
	width?: number;
	height?: number;
	fill?: string;
}) {
	return (
		<svg
			aria-hidden="true"
			class={props.class}
			fill={props.fill || "currentColor"}
			height={props.height || 24}
			viewBox="0 0 24 24"
			width={props.width || 24}
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>GitHub</title>
			<path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2" />
		</svg>
	);
}

function PatreonIcon(props: {
	class?: string;
	width?: number;
	height?: number;
	fill?: string;
}) {
	return (
		<svg
			aria-hidden="true"
			class={props.class}
			fill={props.fill || "currentColor"}
			height={props.height || 24}
			viewBox="0 0 512 512"
			width={props.width || 24}
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Patreon</title>
			<path d="M489.7 153.8c-.1-65.4-51-119-110.7-138.3C304.8-8.5 207-5 136.1 28.4C50.3 68.9 23.3 157.7 22.3 246.2C21.5 319 28.7 510.6 136.9 512c80.3 1 92.3-102.5 129.5-152.3c26.4-35.5 60.5-45.5 102.4-55.9c72-17.8 121.1-74.7 121-150z" />
		</svg>
	);
}

interface Props {
	logoUrl?: string;
}

export default function Navigation(props: Props) {
	const [navOpen, setNavOpen] = createSignal(false);
	const [currentPath, setCurrentPath] = createSignal("");

	onMount(() => {
		setCurrentPath(window.location.pathname);
	});

	const toggleNav = () => {
		setNavOpen(!navOpen());
	};

	const closeNav = () => {
		setNavOpen(false);
	};

	const isActive = (path: string) => {
		const current = currentPath();
		if (path === "/") {
			return current === "/" || current === "";
		}
		return current.startsWith(path);
	};

	return (
		<nav
			class="site-nav fixed top-0 right-0 left-0 z-40 bg-background font-pixel"
			classList={{ "nav-menu-open": navOpen() }}
		>
			<div class="mx-auto flex h-14 max-w-7xl px-2">
				<a
					aria-label="Home"
					class="nav-logo relative block overflow-hidden"
					href="/"
				>
					<img
						alt="S.P.L.U.R.T. Station"
						class="m-1 h-12 w-12"
						height="48"
						src={props.logoUrl || "/splurtpaw2_alt3.png"}
						width="48"
					/>
				</a>
				<div class="nav-links hidden grow sm:flex">
					<div class="page-links flex">
						<a
							class="page-link flex items-center px-4 font-semibold text-white uppercase tracking-normal"
							classList={{ active: isActive("/") }}
							href="/"
						>
							About
						</a>
						<a
							class="page-link flex items-center px-4 font-semibold text-white uppercase tracking-normal"
							classList={{ active: isActive("/how-to-play") }}
							href="/how-to-play"
						>
							How To Play
						</a>
						<a
							class="page-link flex items-center px-4 font-semibold text-white uppercase tracking-normal"
							classList={{ active: isActive("/media") }}
							href="/media"
						>
							Media
						</a>
						<a
							class="page-link flex items-center px-4 font-semibold text-white uppercase tracking-normal"
							href="https://wiki.splurt.space"
							rel="noopener external"
							target="_blank"
						>
							Wiki
						</a>
						<a
							class="page-link flex items-center px-4 font-semibold text-white uppercase tracking-normal"
							href="https://wiki.splurt.space/Rules"
							rel="noopener external"
							target="_blank"
						>
							Rules
						</a>
					</div>
					<div class="nav-right-section ml-auto flex items-center gap-3">
						<div class="nav-separator" />
						<a
							class="cta--highlighted cursor-pointer rounded px-4 py-2 font-semibold uppercase tracking-normal transition-all"
							href="/how-to-play"
						>
							Play Now
						</a>
						<div class="nav-separator" />
						<div class="social-icons flex items-center gap-3 px-2">
							<a
								aria-label="Discord"
								class="social-icon"
								href="https://discord.gg/splurt"
								rel="noopener external"
								target="_blank"
							>
								<DiscordIcon
									aria-hidden="true"
									class="discord-icon"
									fill="currentColor"
									height={20}
									width={20}
								/>
							</a>
							<a
								aria-label="GitHub"
								class="social-icon"
								href="https://github.com/splurt-station"
								rel="noopener external"
								target="_blank"
							>
								<GithubIcon
									aria-hidden="true"
									class="github-icon"
									fill="currentColor"
									height={20}
									width={20}
								/>
							</a>
							<a
								aria-label="Patreon"
								class="social-icon"
								href="https://patreon.com/SPLURTstation13?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"
								rel="noopener external"
								target="_blank"
							>
								<PatreonIcon
									aria-hidden="true"
									class="patreon-icon"
									fill="currentColor"
									height={20}
									width={20}
								/>
							</a>
						</div>
					</div>
				</div>
				<div class="ml-auto flex items-center pl-4 sm:hidden">
					<button
						aria-label="Toggle navigation"
						class="toggle-nav"
						classList={{ active: navOpen() }}
						onClick={toggleNav}
						type="button"
					>
						<span class="top" />
						<span class="mid" />
						<span class="bottom" />
					</button>
				</div>
			</div>
			<div
				aria-label="Navigation menu"
				aria-modal="true"
				class="mobile-menu sm:hidden"
				classList={{ "mobile-menu-open": navOpen() }}
				role="dialog"
			>
				<button
					aria-label="Close menu"
					class="mobile-menu-backdrop"
					onClick={closeNav}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							closeNav();
						}
					}}
					type="button"
				/>
				<div class="mobile-menu-content">
					<div class="mobile-page-links">
						<a
							class="mobile-page-link"
							classList={{ active: isActive("/") }}
							href="/"
							onClick={closeNav}
						>
							About
						</a>
						<a
							class="mobile-page-link"
							classList={{ active: isActive("/how-to-play") }}
							href="/how-to-play"
							onClick={closeNav}
						>
							How To Play
						</a>
						<a
							class="mobile-page-link"
							classList={{ active: isActive("/media") }}
							href="/media"
							onClick={closeNav}
						>
							Media
						</a>
						<a
							class="mobile-page-link"
							href="https://wiki.splurt.space"
							onClick={closeNav}
							rel="noopener external"
							target="_blank"
						>
							Wiki
						</a>
						<a
							class="mobile-page-link"
							href="https://wiki.splurt.space/Rules"
							onClick={closeNav}
							rel="noopener external"
							target="_blank"
						>
							Rules
						</a>
					</div>
					<div class="mobile-social-icons">
						<a
							aria-label="Discord"
							class="mobile-social-icon"
							href="https://discord.gg/splurt"
							rel="noopener external"
							target="_blank"
						>
							<DiscordIcon
								aria-hidden="true"
								class="discord-icon"
								fill="currentColor"
								height={24}
								width={24}
							/>
						</a>
						<a
							aria-label="GitHub"
							class="mobile-social-icon"
							href="https://github.com/splurt-station"
							rel="noopener external"
							target="_blank"
						>
							<GithubIcon
								aria-hidden="true"
								class="github-icon"
								fill="currentColor"
								height={24}
								width={24}
							/>
						</a>
						<a
							aria-label="Patreon"
							class="mobile-social-icon"
							href="https://patreon.com/SPLURTstation13?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"
							rel="noopener external"
							target="_blank"
						>
							<PatreonIcon
								aria-hidden="true"
								class="patreon-icon"
								fill="currentColor"
								height={24}
								width={24}
							/>
						</a>
					</div>
				</div>
			</div>
		</nav>
	);
}
