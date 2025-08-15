import React from "react";
import { C1Component, ThemeProvider } from "@thesysai/genui-sdk";

interface Props {
	content: string;
}

export default function ReactMarkdownWrapper({ content }: Props) {
	return React.createElement(
		"div",
		{
			className:
				"prose max-w-none dark:prose-invert max-sm:prose-sm prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-base prose-pre:bg-gray-800 dark:prose-pre:bg-gray-900",
		},
		React.createElement(
			ThemeProvider,
			null,
			React.createElement(C1Component, { c1Response: content, isStreaming: false })
		)
	);
}
