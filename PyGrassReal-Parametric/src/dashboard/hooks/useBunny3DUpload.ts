/**
 * useBunny3DUpload.ts
 *
 * Hook สำหรับอัปโหลดไฟล์ 3D Model ไปยัง bunny.net Storage Zone "pygrass-3d-models"
 * โครงสร้างไฟล์: <userId>/<projectId>/<filename>
 * ใช้ HTTP PUT API ของ bunny.net ผ่าน FTP/Storage Password
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

const BUNNY_3D_STORAGE_ZONE = import.meta.env.VITE_BUNNY_3D_STORAGE_ZONE as string;
const BUNNY_3D_HOSTNAME = import.meta.env.VITE_BUNNY_3D_STORAGE_HOSTNAME as string;
const BUNNY_3D_API_KEY = import.meta.env.VITE_BUNNY_3D_STORAGE_API_KEY as string;
const BUNNY_3D_CDN_URL = import.meta.env.VITE_BUNNY_3D_PULL_ZONE_URL as string;

export interface Bunny3DUploadResult {
    /** Path ภายใน Storage Zone เช่น "user-id/project-id/model.glb" */
    storagePath: string;
    /** URL สาธารณะสำหรับแสดงผลผ่าน CDN */
    cdnUrl: string;
}

export interface UseBunny3DUploadReturn {
    uploadFile: (file: File, projectId: string, filenameOverride?: string) => Promise<Bunny3DUploadResult>;
    isUploading: boolean;
    error: string | null;
}

export function useBunny3DUpload(): UseBunny3DUploadReturn {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadFile = useCallback(async (file: File, projectId: string, filenameOverride?: string): Promise<Bunny3DUploadResult> => {
        setIsUploading(true);
        setError(null);

        try {
            // ดึง User ID ปัจจุบันจาก Supabase Auth
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id ?? 'anonymous';

            // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
            const originalFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const targetFilename = filenameOverride || originalFilename;
            const remotePath = `${userId}/${projectId}/${targetFilename}`;

            // สร้าง URL สำหรับ PUT request ไปยัง bunny.net Storage API
            const uploadUrl = `https://${BUNNY_3D_HOSTNAME}/${BUNNY_3D_STORAGE_ZONE}/${remotePath}`;

            const response = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    AccessKey: BUNNY_3D_API_KEY,
                    'Content-Type': file.type || 'application/octet-stream',
                },
                body: file,
            });

            if (!response.ok) {
                throw new Error(`bunny.net upload failed: ${response.status} ${response.statusText}`);
            }

            const cdnUrl = `${BUNNY_3D_CDN_URL}/${remotePath}`;

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
