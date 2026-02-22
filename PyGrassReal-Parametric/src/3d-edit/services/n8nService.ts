/**
 * Service to handle n8n webhook integration.
 */

interface SendToN8NOptions {
    signal?: AbortSignal;
    chatModel?: string;
    chatActionMode?: string;
    sessionId?: string;
    images?: any[];
    [key: string]: any;
}

export const n8nService = {
    /**
     * Sends data to the configured n8n webhook.
     * @param text The prompt text to send.
     * @param options Optional parameters including signal, chatModel, and chatActionMode.
     * @returns Promise resolving to the response or void.
     */
    async sendToN8N(text: string, options: SendToN8NOptions = {}) {
        const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

        if (!webhookUrl) {
            console.warn('n8n Webhook URL (VITE_N8N_WEBHOOK_URL) is not configured.');
            throw new Error('n8n Webhook URL is not configured.');
        }

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    chatModel: options.chatModel || 'model-a',
                    chatActionMode: options.chatActionMode || 'plan',
                    sessionId: options.sessionId,
                    timestamp: new Date().toISOString(),
                    ...Object.fromEntries(Object.entries(options).filter(([k]) => !['signal', 'chatModel', 'chatActionMode', 'sessionId'].includes(k)))
                }),
                signal: options.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`n8n Error (${response.status}): ${errorText || response.statusText}`);
            }

            const textResponse = await response.text();
            if (!textResponse) {
                return { output: 'No response from n8n.' };
            }

            try {
                // Try parsing as JSON first
                return JSON.parse(textResponse);
            } catch (e) {
                // If it's not JSON, return as output string directly to avoid breaking
                console.log('n8n returned non-JSON response, using as raw output');
                return { output: textResponse };
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('n8n request cancelled');
                throw error;
            }
            console.error('Error sending to n8n:', error);
            throw error;
        }
    }
};
