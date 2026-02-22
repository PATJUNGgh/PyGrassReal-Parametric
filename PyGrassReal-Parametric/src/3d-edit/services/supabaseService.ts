
import { supabase } from '../../lib/supabaseClient';

export interface ChatLogEntry {
    id?: string;
    session_id: string;
    message: string;
    sender: 'user' | 'ai';
    created_at?: string;
}

export const supabaseService = {
    /**
     * Save a chat message to the database.
     * @param message The message content
     * @param sender Who sent the message ('user' or 'ai')
     * @param sessionId The session ID associated with the chat
     */
    async saveChatLog(message: string, sender: 'user' | 'ai', sessionId: string): Promise<ChatLogEntry | null> {
        try {
            const { data, error } = await supabase
                .from('chat_logs')
                .insert([
                    { session_id: sessionId, message, sender }
                ])
                .select()
                .single();

            if (error) {
                console.error('Error saving chat log:', error);
                return null;
            }

            return data;
        } catch (err) {
            console.error('Unexpected error saving chat log:', err);
            return null;
        }
    },

    /**
     * Get chat history for a specific session.
     * @param sessionId The session ID to retrieve history for
     */
    async getChatHistory(sessionId: string): Promise<ChatLogEntry[]> {
        try {
            const { data, error } = await supabase
                .from('chat_logs')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching chat history:', error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error('Unexpected error fetching chat history:', err);
            return [];
        }
    }
};
