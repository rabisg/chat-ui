import React from "react";
import { C1Component, ThemeProvider } from "@thesysai/genui-sdk";

interface Props {
	content: string;
	isStreaming?: boolean;
}

export default function ReactC1Wrapper({ content, isStreaming = false }: Props) {
	return React.createElement(
		ThemeProvider,
		null,
		React.createElement(C1Component, {
			c1Response: content,
			isStreaming,
		})
	);
}
