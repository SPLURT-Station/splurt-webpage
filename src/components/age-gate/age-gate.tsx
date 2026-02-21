import { createSignal, onMount, Show } from "solid-js";
import {
	getAgeConfirmationStatus,
	setAgeConfirmationStatus,
} from "../../utils/age-gate";
import "./age-gate.css";

interface Props {
	logoUrl?: string;
}

export default function AgeGate(props: Props) {
	const [show, setShow] = createSignal(false);
	const [mounted, setMounted] = createSignal(false);

	onMount(() => {
		setMounted(true);
		const confirmed = getAgeConfirmationStatus();
		if (!confirmed) {
			setShow(true);
		}
	});

	const handleContinue = () => {
		setAgeConfirmationStatus(true);
		setShow(false);
	};

	return (
		<Show when={mounted() && show()}>
			<div class="age-gate-overlay">
				<div
					aria-describedby="age-gate-description"
					aria-labelledby="age-gate-title"
					aria-modal="true"
					class="age-gate-modal relative w-[min(92vw,640px)] overflow-hidden"
					role="dialog"
				>
					<div class="age-gate-header mb-3 flex items-center gap-3">
						<div class="age-gate-logo-wrap relative inline-flex h-[72px] w-[72px] items-center justify-center">
							<img
								alt="Splurt Logo"
								class="age-gate-logo"
								height={72}
								loading="eager"
								src={props.logoUrl || "/splurtpaw2_alt3.png"}
								width={72}
							/>
							<span aria-hidden="true" class="age-gate-badge">
								18+
							</span>
						</div>
						<h2 class="age-gate-title m-0" id="age-gate-title">
							Adults Only
						</h2>
					</div>
					<p class="age-gate-text m-0 mb-5" id="age-gate-description">
						This website contains content intended for adults. By clicking
						<strong>Continue</strong>, you confirm that you are at least 18
						years of age.
					</p>
					<div class="age-gate-actions flex justify-end">
						<button
							class="age-continue-button"
							id="age-continue"
							onClick={handleContinue}
							type="button"
						>
							Continue
						</button>
					</div>
				</div>
			</div>
		</Show>
	);
}
