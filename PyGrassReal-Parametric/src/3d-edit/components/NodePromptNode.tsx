import { CornerDownLeft } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CustomNode } from './CustomNode';
import type { ChatHistoryMessage, ChatSession, NodeData, PendingImageItem } from '../types/NodeTypes';

import styles from './NodePromptNode.module.css';
import { n8nService } from '../services/n8nService';
import { supabaseService } from '../services/supabaseService';

interface PromptBodyProps {
    id: string;
    data: NodeData['data'];
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
    connectedInspector?: NodeData;
    onAddNode?: (type: NodeData['type'], position: { x: number; y: number }, options?: { initialData?: Partial<NodeData['data']>; initialConnections?: Array<{ sourceNodeId?: string; sourcePort: string; targetNodeId?: string; targetPort: string; }>; }) => string | undefined;
    onAddConnection?: (sourceId: string, sourcePort: string, targetId: string, targetPort: string) => void;
    position?: { x: number; y: number };
    nodes?: NodeData[];
    connections?: Array<{ sourceNodeId: string; sourcePort: string; targetNodeId: string; targetPort: string }>;
}

const PromptBody: React.FC<PromptBodyProps & { showSubmit: boolean }> = ({ id, data, onDataChange, showSubmit, connectedInspector, onAddNode, onAddConnection, position, nodes, connections }) => {
    const promptText = typeof data.promptText === 'string' ? data.promptText : '';
    const promptStatus = data.promptStatus || (data.isGenerating ? 'generating' : 'idle');
    const isGenerating = promptStatus === 'generating';
    const promptError = typeof data.promptError === 'string' ? data.promptError : '';
    const stopGenerationToken = typeof data.stopGenerationToken === 'number' ? data.stopGenerationToken : 0;
    const [isReadingImage, setIsReadingImage] = useState(false);
    const [previewImage, setPreviewImage] = useState<{ dataUrl: string; name: string } | null>(null);
    const dataRef = useRef(data);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastStopTokenRef = useRef(stopGenerationToken);
    const idleResetTimeoutRef = useRef<number | null>(null);
    useEffect(() => {
        dataRef.current = data;
    }, [data]);
    useEffect(() => {
        if (stopGenerationToken === lastStopTokenRef.current) return;
        lastStopTokenRef.current = stopGenerationToken;
        abortControllerRef.current?.abort();
    }, [stopGenerationToken]);

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
            if (idleResetTimeoutRef.current !== null) {
                window.clearTimeout(idleResetTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const onEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPreviewImage(null);
            }
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, []);

    const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const createSessionId = () => `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const clearIdleResetTimeout = () => {
        if (idleResetTimeoutRef.current !== null) {
            window.clearTimeout(idleResetTimeoutRef.current);
            idleResetTimeoutRef.current = null;
        }
    };

    const resetStatusToIdle = (delayMs = 0) => {
        clearIdleResetTimeout();
        idleResetTimeoutRef.current = window.setTimeout(() => {
            onDataChange(id, { promptStatus: 'idle' });
            idleResetTimeoutRef.current = null;
        }, delayMs);
    };

    const updatePromptRuntime = (
        nextStatus: NonNullable<NodeData['data']['promptStatus']>,
        errorMessage = ''
    ) => {
        onDataChange(id, {
            isGenerating: nextStatus === 'generating',
            promptStatus: nextStatus,
            promptError: errorMessage,
        });
    };

    const ensureSessions = (source: NodeData['data']): { sessions: ChatSession[]; activeSessionId: string } => {
        const existing = Array.isArray(source.chatSessions) ? source.chatSessions : [];
        if (existing.length > 0) {
            const fallbackId = existing[0]?.id || 'default';
            return {
                sessions: existing,
                activeSessionId: source.activeSessionId || fallbackId,
            };
        }

        const defaultSessionId = createSessionId();
        return {
            sessions: [{ id: defaultSessionId, title: 'New Chat', messages: [], timestamp: Date.now() }],
            activeSessionId: defaultSessionId,
        };
    };

    const summarizeTitle = (text: string): string => {
        const singleLine = text.replace(/\s+/g, ' ').trim();
        if (!singleLine) return 'New Chat';
        return singleLine.length > 28 ? `${singleLine.slice(0, 28)}...` : singleLine;
    };

    const readFileAsDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    };

    const getPendingImages = (source: NodeData['data']): PendingImageItem[] => {
        return Array.isArray(source.pendingImages) ? source.pendingImages : [];
    };
    const pendingImages = getPendingImages(data);

    const appendMessagesToActiveSession = (messages: ChatHistoryMessage[]) => {
        if (messages.length === 0) return '';
        const { sessions, activeSessionId } = ensureSessions(dataRef.current);
        const nextSessions = sessions.map((session) => {
            if (session.id !== activeSessionId) return session;
            const isFirstMessage = session.messages.length === 0;
            const nextTitle = isFirstMessage
                ? summarizeTitle(messages[0]?.contentType === 'image' ? 'Image' : (messages[0]?.content || ''))
                : session.title;
            return {
                ...session,
                title: nextTitle,
                messages: [...session.messages, ...messages],
                timestamp: Date.now(),
            };
        });

        onDataChange(id, {
            chatSessions: nextSessions,
            activeSessionId,
            promptSubmittedText: messages[0]?.content || '',
            promptSubmittedAt: Date.now(),
        });
        return activeSessionId;
    };

    const submitImageFile = async (file: File) => {
        if (!showSubmit || isGenerating) return;
        if (!file.type.startsWith('image/')) return;

        setIsReadingImage(true);
        try {
            const imageDataUrl = await readFileAsDataUrl(file);
            if (!imageDataUrl) return;
            const latestPending = getPendingImages(dataRef.current);
            const nextPending: PendingImageItem[] = [
                ...latestPending,
                { id: createMessageId(), name: file.name || 'Image', dataUrl: imageDataUrl },
            ];
            onDataChange(id, { pendingImages: nextPending });
        } finally {
            setIsReadingImage(false);
        }
    };

    const submitPrompt = async () => {
        if (!showSubmit || isGenerating || abortControllerRef.current) return;
        const text = promptText.trim();
        const pendingImages = getPendingImages(dataRef.current);
        if (!text && pendingImages.length === 0) return;

        const outgoingMessages: ChatHistoryMessage[] = [];
        if (pendingImages.length > 0) {
            pendingImages.forEach((item, index) => {
                const userImageMessage: ChatHistoryMessage = {
                    id: createMessageId(),
                    role: 'user',
                    content: text && index === 0 ? text : '',
                    contentType: 'image',
                    imageDataUrl: item.dataUrl,
                    timestamp: Date.now(),
                };
                outgoingMessages.push(userImageMessage);
            });
        } else if (text) {
            const userTextMessage: ChatHistoryMessage = {
                id: createMessageId(),
                role: 'user',
                content: text,
                timestamp: Date.now(),
            };
            outgoingMessages.push(userTextMessage);
        }

        const activeSessionId = appendMessagesToActiveSession(outgoingMessages);
        if (!activeSessionId) return;
        const finalActiveSessionId = activeSessionId;

        // Save user message to Supabase
        // Note: Ideally n8n handles this too for consistency, but saving here ensures immediate UI feedback safety.
        // If n8n also saves 'user' message, we might want to disable this. 
        // For now, based on plan, frontend saves user message to ensure it's captured even if n8n fails.
        if (showSubmit && text) {
            supabaseService.saveChatLog(text, 'user', finalActiveSessionId).catch(err => console.error('Failed to save user log:', err));
        }

        onDataChange(id, {
            promptText: '',
            pendingImages: [],
        });

        // if (!text) return; // Removed to allow image-only prompts

        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        clearIdleResetTimeout();
        updatePromptRuntime('generating');

        try {
            const chatModel = data.chatModel || 'model-a';
            const chatActionMode = data.chatActionMode || 'plan';

            const n8nResponse = await n8nService.sendToN8N(
                text,
                {
                    signal: abortController.signal,
                    chatModel,
                    chatActionMode,
                    sessionId: finalActiveSessionId,
                    images: pendingImages
                }
            );

            if (abortController.signal.aborted) {
                updatePromptRuntime('cancelled');
                resetStatusToIdle(250);
                return;
            }

            if (!n8nResponse) {
                throw new Error('No response received from n8n.');
            }

            let aiContent = n8nResponse.output || n8nResponse.message || n8nResponse.text;
            const planContent = n8nResponse.plan; // Capture plan if exists

            if (!aiContent && planContent) {
                // If plan exists but no explicit message, use the plan content itself as the answer
                // This handles cases where the AI replies via the 'plan' field (short answers)
                aiContent = typeof planContent === 'string' ? planContent : JSON.stringify(planContent);
            }

            if (!aiContent) {
                aiContent = typeof n8nResponse === 'object' ? JSON.stringify(n8nResponse) : String(n8nResponse);
            }

            // 1. Prepare Plan Content (Priority)
            let contentForPlan: string | undefined = undefined;

            if (planContent) {
                contentForPlan = typeof planContent === 'string' ? planContent : JSON.stringify(planContent, null, 2);
            } else if (chatActionMode === 'plan') {
                contentForPlan = typeof aiContent === 'string' ? aiContent : JSON.stringify(aiContent, null, 2);
            }

            // 2. Prepare Chat Message & Plan Content Fallback
            let messageContent = typeof aiContent === 'string' ? aiContent : JSON.stringify(aiContent);

            // If in Plan Mode:
            // 1. Force Chat Message to be a notification (don't show long plan in chat).
            // 2. Ensuring the raw content goes to Plan View if planContent was empty.
            if (chatActionMode === 'plan') {
                // If n8n provided a distinct plan field AND a message, use the message.
                // Otherwise, if we are promoting the main content to be the plan, use a default notification.
                if (planContent && (n8nResponse.output || n8nResponse.message)) {
                    messageContent = typeof aiContent === 'string' ? aiContent : JSON.stringify(aiContent);
                } else {
                    messageContent = "สร้างแผนงานเรียบร้อยแล้วครับ ดูรายละเอียดได้ที่ Plan View ด้านขวามือ";
                }

                // If n8n sent raw content but no 'plan' field, use raw content as plan
                if (!planContent && aiContent && aiContent !== '{}') {
                    const fallbackPlan = typeof aiContent === 'string' ? aiContent : JSON.stringify(aiContent);
                    onDataChange(id, {
                        planContent: fallbackPlan,
                        planMarkdown: fallbackPlan,
                        planSource: 'ai',
                        planUpdatedAt: Date.now(),
                    });
                }
            }

            const assistantMessage: ChatHistoryMessage = {
                id: createMessageId(),
                role: 'assistant',
                content: messageContent,
                timestamp: Date.now(),
            };

            const { sessions: latestSessions } = ensureSessions(dataRef.current);
            const updatedSessions = latestSessions.map((session) => {
                if (session.id !== finalActiveSessionId) return session;
                return {
                    ...session,
                    messages: [...session.messages, assistantMessage],
                    timestamp: Date.now(),
                };
            });

            // 3. EXECUTE UPDATES: Plan First, Then Chat
            const updates: Partial<NodeData['data']> = {};

            if (contentForPlan) {
                updates.planContent = contentForPlan;
                updates.planMarkdown = contentForPlan;
                updates.planSource = 'ai';
                updates.planUpdatedAt = Date.now();
            }

            // If we have plain updates, apply them immediately so the view refreshes
            if (Object.keys(updates).length > 0) {
                onDataChange(id, updates);
            }

            // Then slightly delay the chat notification to ensure Plan is seen as "finished" first? 
            // Or just update chat now. React batches, so separate execution might be needed for visual order.
            // Let's do a minimal timeout to let React render the Plan first.
            // 3. Auto-create/Update Inspector ONLY if in Plan Mode (Do this BEFORE notifying chat)
            if (chatActionMode === 'plan') {
                // Check if the currently connected inspector is already a Plan Inspector
                const isPlanInspectorConnected = connectedInspector && connectedInspector.data.customName === 'Plan Inspector';

                // Check if Chat Inspector has a Plan Inspector downstream (connected to its output)
                let existingPlanInspectorDownstream: NodeData | undefined;
                if (connectedInspector && !isPlanInspectorConnected && connections && nodes) {
                    const downstreamLink = connections.find(c => c.sourceNodeId === connectedInspector.id);
                    if (downstreamLink) {
                        existingPlanInspectorDownstream = nodes.find(n => n.id === downstreamLink.targetNodeId && n.data.customName === 'Plan Inspector');
                    }
                }

                // If no inspector connected OR the connected one is NOT a Plan Inspector (meaning it's a Chat/Act one)
                // AND there is no existing downstream Plan Inspector either
                if ((!connectedInspector || !isPlanInspectorConnected) && !existingPlanInspectorDownstream && onAddNode && position) {
                    // Use the correct addNode signature: (type, position, options)
                    // addNode handles ID generation, node creation, and connections atomically
                    const planPosition = {
                        x: connectedInspector ? connectedInspector.position.x + 380 : position.x + (data.width || 380) + 60,
                        y: connectedInspector ? connectedInspector.position.y : position.y
                    };
                    onAddNode('panel', planPosition, {
                        initialData: {
                            customName: 'Plan Inspector',
                            width: 340,
                            height: 500,
                            isPaused: false,
                            chatActionMode: 'plan'
                        },
                        initialConnections: [{
                            // If Chat Inspector exists, chain from its output-main
                            // Otherwise, connect directly to Prompt Node's output-prompt
                            sourceNodeId: connectedInspector ? connectedInspector.id : id,
                            sourcePort: connectedInspector ? 'output-main' : 'output-prompt',
                            targetPort: 'input-main'
                        }]
                    });
                } else if (isPlanInspectorConnected && connectedInspector) {
                    // Just update existing Plan Inspector mode if needed
                    onDataChange(connectedInspector.id, { chatActionMode: 'plan' });
                } else if (existingPlanInspectorDownstream) {
                    // If we found a downstream Plan Inspector, update its mode too
                    onDataChange(existingPlanInspectorDownstream.id, { chatActionMode: 'plan' });
                }
            }

            // 4. Update Chat (with delay to let Plan render)
            setTimeout(() => {
                onDataChange(id, {
                    chatSessions: updatedSessions,
                    activeSessionId: finalActiveSessionId,
                });
                updatePromptRuntime('success'); // Stop spinner after chat appears
                resetStatusToIdle();
            }, 50);
        } catch (err) {
            if (abortController.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
                updatePromptRuntime('cancelled');
                resetStatusToIdle(250);
                return;
            }

            console.error('Failed to get n8n response:', err);
            updatePromptRuntime(
                'error',
                err instanceof Error ? err.message : 'Failed to generate response.'
            );
            resetStatusToIdle(1200);
        } finally {
            if (abortControllerRef.current === abortController) {
                abortControllerRef.current = null;
            }
        }
    };

    const stopPrompt = () => {
        if (!isGenerating) return;
        abortControllerRef.current?.abort();
    };

    const queueStatusText = isGenerating
        ? 'Generating...'
        : promptStatus === 'cancelled'
            ? 'Request cancelled.'
            : promptError
                ? `Error: ${promptError}`
                : (isReadingImage
                    ? 'Reading image...'
                    : `Images queued: ${pendingImages.length} item(s)`);

    return (
        <div className={styles.promptBodyContainer}>
            <textarea
                value={promptText}
                placeholder="Type prompt..."
                onChange={(e) => onDataChange(id, { promptText: e.target.value })}
                onDragOver={(e) => {
                    if (!showSubmit || isGenerating) return;
                    e.preventDefault();
                    e.stopPropagation();
                }}
                onDrop={(e) => {
                    if (!showSubmit || isGenerating) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith('image/')) {
                        void submitImageFile(file);
                    }
                }}
                onPaste={(e) => {
                    if (!showSubmit || isGenerating) return;
                    const fileFromClipboard = Array.from(e.clipboardData.files).find((file) => file.type.startsWith('image/'));
                    if (fileFromClipboard) {
                        e.preventDefault();
                        e.stopPropagation();
                        void submitImageFile(fileFromClipboard);
                    }
                }}
                onKeyDown={(e) => {
                    e.stopPropagation();
                    if (!showSubmit) return;
                    if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
                        e.preventDefault();
                        submitPrompt();
                    }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className={styles.promptTextarea}
            />
            {connectedInspector && showSubmit && (
                <div className={styles.queueInfo}>
                    {queueStatusText}
                </div>
            )}
            {connectedInspector && showSubmit && pendingImages.length > 0 && (
                <div className={styles.queuePreviewList}>
                    {pendingImages.map((item) => (
                        <button
                            key={item.id}
                            className={styles.queuePreviewItem}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage({ dataUrl: item.dataUrl, name: item.name });
                            }}
                            title={`Open ${item.name}`}
                        >
                            <img src={item.dataUrl} alt={item.name} className={styles.queuePreviewImage} />
                            <span className={styles.queuePreviewName}>{item.name}</span>
                        </button>
                    ))}
                </div>
            )}
            {previewImage && (
                <div
                    className={styles.previewOverlay}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(null);
                    }}
                >
                    <div
                        className={styles.previewModal}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className={styles.previewCloseButton}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(null);
                            }}
                            title="Close preview"
                        >
                            X
                        </button>
                        <img src={previewImage.dataUrl} alt={previewImage.name} className={styles.previewModalImage} />
                    </div>
                </div>
            )}
            {/* Only show submit button if connected to an Inspector */}
            {connectedInspector && showSubmit && (
                <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isGenerating) {
                            stopPrompt();
                        } else {
                            submitPrompt();
                        }
                    }}
                    className={isGenerating ? `${styles.submitButton} ${styles.stopButton}` : styles.submitButton}
                    title={isGenerating ? 'Stop generating' : 'Submit Prompt'}
                >
                    {isGenerating ? 'Stop' : <CornerDownLeft size={16} />}
                </button>
            )}
        </div>
    );
};

type NodePromptNodeProps = Omit<React.ComponentProps<typeof CustomNode>, 'children'> & {
    nodes: NodeData[];
    connections?: Array<{ sourceNodeId: string; sourcePort: string; targetNodeId: string; targetPort: string }>;
    onAddNode?: (type: NodeData['type'], position: { x: number; y: number }, options?: { initialData?: Partial<NodeData['data']>; initialConnections?: Array<{ sourceNodeId?: string; sourcePort: string; targetNodeId?: string; targetPort: string; }>; }) => string | undefined;
    onAddConnection?: (sourceId: string, sourcePort: string, targetId: string, targetPort: string) => void;
};

export const NodePromptNode: React.FC<NodePromptNodeProps> = (props) => {
    const connectedInspector = useMemo(() => {
        const myOutConnections = (props.connections || []).filter((c) => c.sourceNodeId === props.id);
        const connection = myOutConnections.find(c => {
            const target = props.nodes.find(n => n.id === c.targetNodeId);
            return target?.type === 'panel';
        });

        if (!connection) return undefined;
        return props.nodes.find(n => n.id === connection.targetNodeId);
    }, [props.connections, props.nodes, props.id]);

    const chatModel = props.data.chatModel || 'model-a';
    const chatActionMode = props.data.chatActionMode || 'plan';

    const isConnectedToInspector = !!connectedInspector;
    const enhancedData = useMemo(() => {
        return {
            ...props.data,
            customName: props.data.customName || 'Text Data',
            isNameEditable: false,
            width: props.data.width || 380,
            minWidth: props.data.minWidth || 160,
            height: props.data.height || 240,
            bodyMinHeight: props.data.bodyMinHeight || 140,
            outputs: [{ id: 'output-prompt', label: 'Text', type: 'Text' as const }],
            hideInputs: true,
            hideOutputsAdd: true,
            hideOutputsHeader: true,
            hidePortControls: true,
            hidePortLabels: true,
            outputPortSide: 'right' as const,
            outputPortAbsoluteCentered: true,
            outputPortOffsetRight: 4,
            outputsAreaWidth: 20,
            bodyPadding: '10px 4px 14px 14px',
            resizable: false,
            freeResizable: true,
            resizableHeader: true,
        };
    }, [props.data, chatModel, chatActionMode]);

    return (
        <CustomNode {...props} data={enhancedData}>
            <PromptBody
                id={props.id}
                data={props.data}
                onDataChange={props.onDataChange}
                showSubmit={true}
                connectedInspector={connectedInspector}
                onAddNode={props.onAddNode}
                onAddConnection={props.onAddConnection}
                position={props.position}
                nodes={props.nodes}
                connections={props.connections}
            />
        </CustomNode>
    );
};
