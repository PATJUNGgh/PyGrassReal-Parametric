import { supabase } from '../../lib/supabaseClient';

export interface ApiKeyRecord {
    id: string;
    name: string;
    key_prefix: string;
    created_at: string;
    last_used_at: string | null;
    is_active: boolean;
    expires_at: string | null;
    credit_limit: number | null;
}

export interface CreateApiKeyResult {
    record: ApiKeyRecord;
    /** full API key shown only once to the user */
    plainKey: string;
}

export interface ApiSubscriptionRecord {
    id: string;
    user_id: string;
    plan_id: string;
    status: string;
    billing_cycle: string;
    subscription_key: string | null;
    current_period_end: string | null;
}

// ---------- helpers ----------

const generateApiKey = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    for (const byte of array) {
        result += chars[byte % chars.length];
    }
    return `pgr_${result}`;
};

const hashApiKey = async (plainKey: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

const buildPrefix = (plainKey: string): string => {
    return `${plainKey.slice(0, 12)}...${plainKey.slice(-4)}`;
};

// ---------- API ----------

const SELECT_COLS = 'id, name, key_prefix, created_at, last_used_at, is_active, expires_at, credit_limit';

export const fetchApiKeys = async (userId: string): Promise<ApiKeyRecord[]> => {
    const { data, error } = await supabase
        .from('api_keys')
        .select(SELECT_COLS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return (data ?? []) as ApiKeyRecord[];
};

export const createApiKey = async (
    userId: string,
    name: string
): Promise<CreateApiKeyResult> => {
    const plainKey = generateApiKey();
    const keyHash = await hashApiKey(plainKey);
    const keyPrefix = buildPrefix(plainKey);

    const { data, error } = await supabase
        .from('api_keys')
        .insert({
            user_id: userId,
            name,
            key_prefix: keyPrefix,
            key_hash: keyHash,
        })
        .select(SELECT_COLS)
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return { record: data as ApiKeyRecord, plainKey };
};

export const disableApiKey = async (keyId: string): Promise<void> => {
    const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId);

    if (error) {
        throw new Error(error.message);
    }
};

export const enableApiKey = async (keyId: string): Promise<void> => {
    const { error } = await supabase
        .from('api_keys')
        .update({ is_active: true })
        .eq('id', keyId);

    if (error) {
        throw new Error(error.message);
    }
};

export const deleteApiKey = async (keyId: string): Promise<void> => {
    const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

    if (error) {
        throw new Error(error.message);
    }
};

export const getOrInitApiSubscription = async (userId: string): Promise<ApiSubscriptionRecord> => {
    const initialResult = await supabase
        .from('api_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    let data = initialResult.data;

    if (!data && !initialResult.error) {
        const result = await supabase
            .from('api_subscriptions')
            .insert({ user_id: userId, plan_id: 'none', status: 'inactive' })
            .select()
            .single();
        data = result.data;
    }

    if (data?.subscription_key?.startsWith('pgr_live_')) {
        const migratedKey = data.subscription_key.replace(/^pgr_live_/, 'pgr_sub_');
        const { error: migrateError } = await supabase
            .from('api_subscriptions')
            .update({ subscription_key: migratedKey })
            .eq('user_id', userId);

        if (!migrateError) {
            data = {
                ...data,
                subscription_key: migratedKey,
            };
        }
    }
    
    return data as ApiSubscriptionRecord;
};

export const generateApiSubscriptionKey = async (userId: string): Promise<string> => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    for (const byte of array) {
        result += chars[byte % chars.length];
    }
    const plainKey = `pgr_sub_${result}`;
    
    const { error } = await supabase
        .from('api_subscriptions')
        .update({ subscription_key: plainKey })
        .eq('user_id', userId);
        
    if (error) throw new Error(error.message);
    return plainKey;
};
