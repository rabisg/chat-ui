<script lang="ts">
	import { browser } from "$app/environment";
	import { onMount, onDestroy } from "svelte";
	import type { Root } from "react-dom/client";

	interface Action {
		humanFriendlyMessage: string;
		llmFriendlyMessage: string;
	}

	interface Props {
		content: string;
		sources?: unknown[];
		loading?: boolean;
		isLast?: boolean;
		onAction?: (action: Action) => void;
	}

	let { content, sources = [], loading = false, isLast = false, onAction }: Props = $props();
	let containerEl: HTMLDivElement | undefined = $state();
	let reactRoot: Root | null = null;
	let updateProps:
		| ((newProps: { content: string; sources: unknown[]; isStreaming: boolean; onAction?: (action: Action) => void }) => void)
		| null = null;

	// Determine if content is currently streaming
	// Streaming happens when: loading is true, this is the last message, AND there's content being generated
	let isStreaming = $derived(loading && isLast && content.length > 0);

	async function initializeReactComponent() {
		if (!browser || !containerEl || reactRoot) return;

		try {
			// Dynamic imports for React and React DOM
			const React = await import("react");
			const ReactDOM = await import("react-dom/client");

			// Create a wrapper component that can receive prop updates
			const ReactC1Container = () => {
				const [props, setProps] = React.useState({
					content,
					sources,
					isStreaming,
					onAction,
				});

				// Log when React state changes
				React.useEffect(() => {
					console.log("React state updated:", {
						contentLength: props.content.length,
						isStreaming: props.isStreaming,
						contentPreview: props.content.slice(0, 50) + (props.content.length > 50 ? "..." : ""),
					});
				}, [props.content, props.isStreaming]);

				// Expose the setProps function so we can update it from Svelte
				React.useEffect(() => {
					console.log("Setting updateProps function");
					updateProps = (newProps) => {
						console.log("React setProps called with:", {
							contentLength: newProps.content.length,
							isStreaming: newProps.isStreaming,
						});
						setProps({
							content: newProps.content,
							sources: newProps.sources,
							isStreaming: newProps.isStreaming,
							onAction: newProps.onAction || onAction,
						});
					};
				}, []);

				// Import and render the actual component
				const [C1Component, setC1Component] = React.useState<
					typeof import("./ReactC1Wrapper").default | null
				>(null);

				React.useEffect(() => {
					import("./ReactC1Wrapper").then((module) => {
						setC1Component(() => module.default);
					});
				}, []);

				if (!C1Component) {
					return React.createElement("div", null, "Loading...");
				}

				return React.createElement(C1Component, props);
			};

			// Create root and render once
			reactRoot = ReactDOM.createRoot(containerEl);
			reactRoot.render(React.createElement(ReactC1Container));
		} catch (error) {
			console.error("Failed to initialize React C1:", error);
			// Fallback to simple text
			if (containerEl) {
				containerEl.textContent = content;
			}
		}
	}

	// Update React props when Svelte props change - with detailed logging
	$effect(() => {
		console.log("C1Renderer $effect:", {
			loading,
			isLast,
			contentLength: content.length,
			isStreaming,
			hasUpdateProps: !!updateProps,
			contentPreview: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
		});

		if (updateProps) {
			console.log("Calling updateProps with:", { contentLength: content.length, isStreaming });
			updateProps({
				content,
				sources,
				isStreaming,
				onAction,
			});
		}
	});

	// Mount
	onMount(() => {
		initializeReactComponent();
	});

	onDestroy(() => {
		if (reactRoot) {
			reactRoot.unmount();
			reactRoot = null;
			updateProps = null;
		}
	});
</script>

<div bind:this={containerEl}></div>
