import { authCondition } from "$lib/server/auth";
import { collections } from "$lib/server/database";
import { error } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { z } from "zod";

export async function PATCH({ locals, params, request }) {
	const messageId = params.messageId;
	const conversationId = params.id;

	if (!messageId || typeof messageId !== "string") {
		error(400, "Invalid message id");
	}

	if (!conversationId || typeof conversationId !== "string") {
		error(400, "Invalid conversation id");
	}

	const body = await request.json();
	const updateSchema = z.object({
		content: z.string().min(1, "Content cannot be empty"),
	});

	const parseResult = updateSchema.safeParse(body);
	if (!parseResult.success) {
		error(
			400,
			"Invalid request body: " + parseResult.error.errors.map((e) => e.message).join(", ")
		);
	}

	const { content } = parseResult.data;

	const conversation = await collections.conversations.findOne({
		...authCondition(locals),
		_id: new ObjectId(conversationId),
	});

	if (!conversation) {
		error(404, "Conversation not found");
	}

	// Find the message and update its content
	const messageIndex = conversation.messages.findIndex((msg) => msg.id === messageId);
	if (messageIndex === -1) {
		error(404, "Message not found");
	}

	// Update the message content
	const updatedMessages = [...conversation.messages];
	updatedMessages[messageIndex] = {
		...updatedMessages[messageIndex],
		content,
		updatedAt: new Date(),
	};

	// Update the conversation in the database
	const updateResult = await collections.conversations.updateOne(
		{ _id: conversation._id, ...authCondition(locals) },
		{
			$set: {
				messages: updatedMessages,
				updatedAt: new Date(),
			},
		}
	);

	if (!updateResult.acknowledged) {
		error(500, "Failed to update message");
	}

	return new Response(
		JSON.stringify({
			success: true,
			messageId,
			content,
		}),
		{
			headers: { "Content-Type": "application/json" },
		}
	);
}

export async function DELETE({ locals, params }) {
	const messageId = params.messageId;

	if (!messageId || typeof messageId !== "string") {
		error(400, "Invalid message id");
	}

	const conversation = await collections.conversations.findOne({
		...authCondition(locals),
		_id: new ObjectId(params.id),
	});

	if (!conversation) {
		error(404, "Conversation not found");
	}

	const filteredMessages = conversation.messages
		.filter(
			(message) =>
				// not the message AND the message is not in ancestors
				!(message.id === messageId) && message.ancestors && !message.ancestors.includes(messageId)
		)
		.map((message) => {
			// remove the message from children if it's there
			if (message.children && message.children.includes(messageId)) {
				message.children = message.children.filter((child) => child !== messageId);
			}
			return message;
		});

	await collections.conversations.updateOne(
		{ _id: conversation._id, ...authCondition(locals) },
		{ $set: { messages: filteredMessages } }
	);

	return new Response();
}
