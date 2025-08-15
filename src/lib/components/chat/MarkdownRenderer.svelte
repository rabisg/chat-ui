<script lang="ts">
	import type { WebSearchSource } from "$lib/types/WebSearch";
	import { browser } from "$app/environment";
	import { onMount, onDestroy } from "svelte";
	import type { Root } from "react-dom/client";

	interface Props {
		content: string;
		sources?: WebSearchSource[];
	}

	let { content, sources = [] }: Props = $props();
	let containerEl: HTMLDivElement | undefined = $state();
	let reactRoot: Root | null = null;

	async function renderReactMarkdown() {
		if (!browser || !containerEl) return;

		try {
			// Dynamic imports for React and React DOM
			const React = await import('react');
			const ReactDOM = await import('react-dom/client');
			const ReactMarkdownWrapper = await import('./ReactMarkdownWrapper');

			// Clean up previous render
			if (reactRoot) {
				reactRoot.unmount();
			}

			// Create new root and render
			reactRoot = ReactDOM.createRoot(containerEl);
			reactRoot.render(
				React.createElement(ReactMarkdownWrapper.default, {
					content,
					sources
				})
			);
		} catch (error) {
			console.error('Failed to render React Markdown:', error);
			// Fallback to simple text
			if (containerEl) {
				containerEl.textContent = content;
			}
		}
	}

	// Mount and reactive updates
	onMount(() => {
		renderReactMarkdown();
	});

	// Watch for content changes
	$effect(() => {
		if (containerEl) {
			renderReactMarkdown();
		}
	});

	onDestroy(() => {
		if (reactRoot) {
			reactRoot.unmount();
		}
	});
</script>

<div bind:this={containerEl}></div>
