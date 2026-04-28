/**
 * useBunnyUpload.ts
 *
 * Hook สำหรับอัปโหลดไฟล์ไปยัง bunny.net Storage Zone "pygrass-chat-media"
 * โครงสร้างไฟล์: <user-id>/<timestamp>_<filename>
 * ใช้ HTTP PUT API ของ bunny.net ผ่าน FTP/Storage Password
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

const BUNNY_STORAGE_ZONE = import.meta.env.VITE_BUNNY_STORAGE_ZONE as string;
const BUNNY_HOSTNAME = import.meta.env.VITE_BUNNY_STORAGE_HOSTNAME as string;
const BUNNY_API_KEY = import.meta.env.VITE_BUNNY_STORAGE_API_KEY as string;
const BUNNY_CDN_URL = import.meta.env.VITE_BUNNY_PULL_ZONE_URL as string;

export interface BunnyUploadResult {
    /** Path ภายใน Storage Zone เช่น "user-id/1234567890_photo.jpg" */
    storagePath: string;
    /** URL สาธารณะสำหรับแสดงผลผ่าน CDN */
    cdnUrl: string;
}

export interface UseBunnyUploadReturn {
    uploadFile: (file: File) => Promise<BunnyUploadResult>;
    isUploading: boolean;
    error: string | null;
}

export function useBunnyUpload(): UseBunnyUploadReturn {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadFile = useCallback(async (file: File): Promise<BunnyUploadResult> => {
        setIsUploading(true);
        setError(null);

        try {
            // ดึง User ID ปัจจุบันจาก Supabase Auth
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id ?? 'anonymous';

            // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const remotePath = `${userId}/${timestamp}_${safeFileName}`;

            // สร้าง URL สำหรับ PUT request ไปยัง bunny.net Storage API
            const uploadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${remotePath}`;

            const response = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    AccessKey: BUNNY_API_KEY,
                    'Content-Type': file.type || 'application/octet-stream',
                },
                body: file,
            });

            if (!response.ok) {
                throw new Error(`bunny.net upload failed: ${response.status} ${response.statusText}`);
            }

            const cdnUrl = `${BUNNY_CDN_URL}/${remotePath}`;

            return { storagePath: remotePath, cdnUrl };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'อัปโหลดไฟล์ไม่สำเร็จ';
            setError(message);
            throw err;
        } finally {
            setIsUploading(false);
        }
    }, []);

    return { uploadFile, isUploading, error };
}
