import React from "react";
import { C1Component, ThemeProvider } from "@thesysai/genui-sdk";

interface Action {
	humanFriendlyMessage: string;
	llmFriendlyMessage: string;
}

interface Props {
	content: string;
	isStreaming?: boolean;
	onAction?: (action: Action) => void;
}

export default function ReactC1Wrapper({ content, isStreaming = false, onAction }: Props) {
	return React.createElement(
		ThemeProvider,
		null,
		React.createElement(C1Component, {
			c1Response: content,
			isStreaming,
			onAction,
		})
	);
}
