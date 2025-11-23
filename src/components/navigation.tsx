import { createSignal, Show } from "solid-js";
import "../styles/navigation.css";

type Props = {
	logoUrl?: string;
};

export default function Navigation(props: Props) {
	const [navOpen, setNavOpen] = createSignal(false);

	const toggleNav = () => {
		setNavOpen(!navOpen());
	};

	return (
		<nav class="site-nav fixed top-0 right-0 left-0 z-40 bg-background">
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
						<a class="page-link" href="/">
							About
						</a>
						<a class="page-link" href="/how-to-play">
							How To Play
						</a>
						<a class="page-link" href="/media">
							Media
						</a>
						<a
							class="page-link"
							href="https://wiki.splurt.space"
							rel="noopener external"
							target="_blank"
						>
							Wiki
						</a>
						<a
							class="page-link"
							href="https://wiki.splurt.space/Rules"
							rel="noopener external"
							target="_blank"
						>
							Rules
						</a>
					</div>
					<div class="social-links ml-auto flex items-center gap-2 pl-4">
						<a
							aria-label="Discord"
							class="discord-button"
							href="https://discord.gg/splurt"
							rel="noopener external"
							target="_blank"
						>
							Discord
						</a>
						<a class="play-now-button" href="/how-to-play">
							Play Now
						</a>
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
			<Show when={navOpen()}>
				<div class="sm:hidden">
					<div class="page-links flex flex-col p-4">
						<a class="page-link py-4" href="/">
							About
						</a>
						<a class="page-link py-4" href="/how-to-play">
							How To Play
						</a>
						<a class="page-link py-4" href="/media">
							Media
						</a>
						<a
							class="page-link py-4"
							href="https://wiki.splurt.space"
							rel="noopener external"
							target="_blank"
						>
							Wiki
						</a>
						<a
							class="page-link py-4"
							href="https://wiki.splurt.space/Rules"
							rel="noopener external"
							target="_blank"
						>
							Rules
						</a>
						<a
							class="discord-button mt-2"
							href="https://discord.gg/splurt"
							rel="noopener external"
							target="_blank"
						>
							Discord
						</a>
						<a class="play-now-button mt-2" href="/how-to-play">
							Play Now
						</a>
					</div>
				</div>
			</Show>
		</nav>
	);
}
