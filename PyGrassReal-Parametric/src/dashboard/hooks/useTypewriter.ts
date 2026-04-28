import { useState, useEffect } from 'react';

/**
 * Custom hook to simulate a typewriter effect for AI message text.
 * Returns the currently animated sliced text and a completion boolean flag.
 */
export const useTypewriter = (text: string = '', animate: boolean = true) => {
    const [displayedText, setDisplayedText] = useState(animate ? '' : text);
    const [isCompleted, setIsCompleted] = useState(!animate);

    useEffect(() => {
        if (!animate || !text) {
            setDisplayedText(text);
            setIsCompleted(true);
            return;
        }

        let isMounted = true;
        setDisplayedText('');
        setIsCompleted(false);

        // กำหนดความเร็วในการพิมพ์ และจำกัดเวลาสูงสุด (1.5 วินาที)
        const frameTime = 30; // รันทุก 30ms
        const maxDuration = 1500;
        const totalFrames = maxDuration / frameTime;
        // คำนวณจำนวนตัวอักษรที่จะพิมพ์ต่อ 1 เฟรม (ก้อน)
        const baseChunk = Math.ceil(text.length / totalFrames);
        const chunkSize = Math.max(1, baseChunk);

        let currentIndex = 0;

        const typeNext = () => {
            if (!isMounted) return;

            currentIndex += chunkSize;

            if (currentIndex >= text.length) {
                setDisplayedText(text);
                setIsCompleted(true);
            } else {
                setDisplayedText(text.slice(0, currentIndex));
                // ใช้ setTimeout แบบเรียกซ้ำ (Recursive) แทน setInterval
                // เพื่อให้ React ทยอยเคลียร์ Update Queue ได้ทัน
                setTimeout(typeNext, frameTime);
            }
        };

        const initialTimeoutId = setTimeout(typeNext, frameTime);

        return () => {
            isMounted = false;
            clearTimeout(initialTimeoutId);
        };
    }, [text, animate]);

    return {
        displayedText: animate && !isCompleted ? displayedText : text,
        isCompleted
    };
};
