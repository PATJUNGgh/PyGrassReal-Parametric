import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Loader2, Copy, Check, Pencil, ZoomIn, X, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useLanguage, localizeText } from '../../../i18n/language';
import { CHAT_UI } from '../../data/chatData';
import { useTypewriter } from '../../hooks/useTypewriter';
import { buildTopicAnchorId, extractMarkdownHeadingTopics, normalizeTopicLabel } from './chatTopics';

import phraramIcon from '../../../assets/Profile-Ai/PHRARAM-AI-512.png';
import hanumanIcon from '../../../assets/Profile-Ai/HANUMAN-AI-512.png';
import phralakIcon from '../../../assets/Profile-Ai/PHRALAK-AI-512.png';
import phipekIcon from '../../../assets/Profile-Ai/PHIPEK-AI-512.png';

const AGENT_CYCLE = [
  { name: 'Phraram-Ai', icon: phraramIcon },
  { name: 'Hanuman-Ai', icon: hanumanIcon },
  { name: 'Phralak-Ai', icon: phralakIcon },
  { name: 'Phipek-Ai', icon: phipekIcon },
];
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
type HeadingRendererProps = {
  children?: React.ReactNode;
  id?: string;
  [key: string]: unknown;
};

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogg']);
const DEFAULT_BUNNY_HOST = 'pygrass-chat-media.b-cdn.net';

function parseHostname(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const configuredBunnyHost = parseHostname(import.meta.env.VITE_BUNNY_PULL_ZONE_URL as string | undefined);
const BUNNY_MEDIA_HOSTS = new Set(
  [DEFAULT_BUNNY_HOST, configuredBunnyHost].filter((host): host is string => Boolean(host)),
);
const MESSAGE_COPY_LABEL = { th: 'คัดลอก', en: 'Copy' };
const MESSAGE_COPIED_LABEL = { th: 'คัดลอกแล้ว', en: 'Copied' };

type BunnyMediaKind = 'image' | 'video' | 'file';

interface BunnyMediaLink {
  kind: BunnyMediaKind;
  url: string;
  fileName: string;
}

interface ImagePreviewState {
  url: string;
  label: string;
}

interface MessageBubbleProps {
  messageId?: string;
  role: 'user' | 'assistant';
  content?: string;
  modelInfo?: { name: string; icon: string } | null;
  isLoading?: boolean;
  loadingText?: string;
  animateTypewriter?: boolean;
  headerAddon?: React.ReactNode;
  showUserAvatar?: boolean;
}

function extractNodeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractNodeText).join('');
  }
  if (React.isValidElement(node)) {
    return extractNodeText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

function classifyBunnyMediaLink(href?: string | null): BunnyMediaLink | null {
  if (!href) return null;

  try {
    const parsed = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'https://localhost');
    if (!/^https?:$/.test(parsed.protocol)) return null;
    if (!BUNNY_MEDIA_HOSTS.has(parsed.hostname.toLowerCase())) return null;

    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    const rawFileName = pathSegments[pathSegments.length - 1] ?? parsed.hostname;
    const fileName = decodeURIComponent(rawFileName);
    const fileExt = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() ?? '' : '';

    let kind: BunnyMediaKind = 'file';
    if (IMAGE_EXTENSIONS.has(fileExt)) {
      kind = 'image';
    } else if (VIDEO_EXTENSIONS.has(fileExt)) {
      kind = 'video';
    }

    return { kind, url: parsed.toString(), fileName };
  } catch {
    return null;
  }
}

async function copyTextToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error('Copy command failed');
  }
}

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const rawCode = String(children).replace(/\n$/, '');
  const [editedCode, setEditedCode] = useState(rawCode);

  useEffect(() => {
    if (!isEditing) {
      setEditedCode(rawCode);
    }
  }, [rawCode, isEditing]);

  const match = /language-(\w+)/.exec(className || '');
  const hasLanguage = Boolean(match);
  const language = match ? match[1] : 'prompt';

  const handleCopy = () => {
    void copyTextToClipboard(editedCode)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const isSubstantialBlock = !inline && (hasLanguage || rawCode.includes('\n') || rawCode.length > 40);

  if (isSubstantialBlock) {
    return (
      <div className="code-block-wrapper">
        <div className="code-block-header">
          <span className="code-block-lang">{language}</span>
          <div className="code-block-actions">
            <button
              className="code-block-btn"
              onClick={toggleEdit}
              title={isEditing ? 'Save & Close Review' : 'Edit Code'}
            >
              {isEditing ? <Check size={14} /> : <Pencil size={14} />}
              <span className="btn-text">{isEditing ? 'Done' : 'Edit'}</span>
            </button>
            <button className="code-block-btn" onClick={handleCopy} title="Copy Code">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span className="btn-text">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {isEditing ? (
          <textarea
            className="code-block-editor"
            value={editedCode}
            onChange={(event) => setEditedCode(event.target.value)}
            spellCheck={false}
          />
        ) : (
          <SyntaxHighlighter
            {...props}
            children={editedCode}
            style={vscDarkPlus as any}
            language={language}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: '0 0 8px 8px' }}
          />
        )}
      </div>
    );
  }

  return (
    <code {...props} className={className}>
      {children}
    </code>
  );
};

export const MessageBubble = React.memo(
  ({
    messageId,
    role,
    content,
    modelInfo,
    isLoading,
    loadingText,
    animateTypewriter,
    headerAddon,
    showUserAvatar = true,
  }: MessageBubbleProps) => {
    const { language } = useLanguage();
    const isAssistant = role === 'assistant';
    const showModelAvatar = isAssistant && modelInfo;
    const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(null);
    const [isMessageCopied, setIsMessageCopied] = useState(false);

    const [cycleIndex, setCycleIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);
    const [isPhraramOrchestrator, setIsPhraramOrchestrator] = useState(false);

    useEffect(() => {
      if (modelInfo?.name) {
        setIsPhraramOrchestrator(modelInfo.name === 'Phraram-Ai');
      } else {
        setIsPhraramOrchestrator(true);
      }
    }, [modelInfo?.name]);

    useEffect(() => {
      if (!isLoading || !isPhraramOrchestrator) {
        setCycleIndex(0);
        return;
      }

      const interval = setInterval(() => {
        setIsFading(true);
        setTimeout(() => {
          setCycleIndex((prev) => (prev + 1) % AGENT_CYCLE.length);
          setIsFading(false);
        }, 400);
      }, 2000);

      return () => clearInterval(interval);
    }, [isLoading, isPhraramOrchestrator]);

    const currentAgent = AGENT_CYCLE[cycleIndex];
    const { displayedText } = useTypewriter(content || '', Boolean(isAssistant && animateTypewriter));
    const markdownSource = useMemo(() => displayedText.replace(/\\n/g, '\n'), [displayedText]);

    const markdownHeadingMap = useMemo(() => {
      if (!isAssistant || !messageId) {
        return new Map<string, { label: string; anchorIndex: number }>();
      }

      const topics = extractMarkdownHeadingTopics(markdownSource);
      return new Map(
        topics.map((topic) => [
          topic.normalizedLabel,
          { label: topic.label, anchorIndex: topic.anchorIndex },
        ]),
      );
    }, [isAssistant, messageId, markdownSource]);
    const resolveTopicAnchorId = useCallback((children: React.ReactNode): string | undefined => {
      if (!messageId) {
        return undefined;
      }

      const normalized = normalizeTopicLabel(extractNodeText(children)).toLowerCase();
      if (!normalized) {
        return undefined;
      }

      const topic = markdownHeadingMap.get(normalized);
      if (!topic) {
        return undefined;
      }

      return buildTopicAnchorId(messageId, topic.label, topic.anchorIndex);
    }, [markdownHeadingMap, messageId]);

    const closeImagePreview = useCallback(() => {
      setImagePreview(null);
    }, []);

    useEffect(() => {
      if (!imagePreview) return;

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          closeImagePreview();
        }
      };

      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [imagePreview, closeImagePreview]);

    const markdownComponents = useMemo(
      () => {
        const renderHeading = (tag: typeof HEADING_TAGS[number]) => ({ children, ...headingProps }: HeadingRendererProps) => {
          const anchorId = resolveTopicAnchorId(children);
          return React.createElement(tag, { ...headingProps, id: anchorId ?? headingProps.id }, children);
        };
        const headingComponents = Object.fromEntries(
          HEADING_TAGS.map((tag) => [tag, renderHeading(tag)]),
        );

        return {
          code: CodeBlock,
          a: ({ href, children, ...anchorProps }: any) => {
            const mediaLink = classifyBunnyMediaLink(href);
            if (!mediaLink) {
              return (
                <a {...anchorProps} href={href}>
                  {children}
                </a>
              );
            }

            const linkLabel = extractNodeText(children).trim();
            const displayLabel = linkLabel && linkLabel !== mediaLink.url ? linkLabel : mediaLink.fileName;

            if (mediaLink.kind === 'image') {
              return (
                <button
                  type="button"
                  className="chat-media-image-button"
                  onClick={() => setImagePreview({ url: mediaLink.url, label: displayLabel })}
                  aria-label={`Preview image ${displayLabel}`}
                >
                  <img
                    src={mediaLink.url}
                    alt={displayLabel}
                    className="chat-media-image-thumb"
                    loading="lazy"
                  />
                  <span className="chat-media-image-overlay">
                    <ZoomIn size={14} aria-hidden="true" />
                    <span>Preview</span>
                  </span>
                </button>
              );
            }

            if (mediaLink.kind === 'video') {
              return (
                <span className="chat-media-video-card">
                  <video className="chat-media-video" controls preload="metadata">
                    <source src={mediaLink.url} />
                    Your browser does not support HTML5 video.
                  </video>
                  <a
                    href={mediaLink.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="chat-media-download-link"
                  >
                    <Download size={14} aria-hidden="true" />
                    <span>Open video</span>
                  </a>
                </span>
              );
            }

            return (
              <a
                {...anchorProps}
                href={mediaLink.url}
                target="_blank"
                rel="noreferrer noopener"
                className="chat-media-download-link"
              >
                <Download size={14} aria-hidden="true" />
                <span>{children}</span>
              </a>
            );
          },
          ...headingComponents,
        };
      },
      [resolveTopicAnchorId],
    );

    const shouldCycle = isLoading && isPhraramOrchestrator;
    const avatarSrc = shouldCycle ? currentAgent.icon : modelInfo?.icon;
    const avatarName = shouldCycle ? currentAgent.name : modelInfo?.name;
    const normalizedCopyContent = useMemo(() => (content || '').replace(/\\n/g, '\n'), [content]);
    const canCopyAssistantMessage = isAssistant && !isLoading && normalizedCopyContent.trim().length > 0;

    const handleCopyMessage = useCallback(async () => {
      if (!canCopyAssistantMessage) {
        return;
      }

      try {
        await copyTextToClipboard(normalizedCopyContent);
        setIsMessageCopied(true);
        window.setTimeout(() => setIsMessageCopied(false), 2000);
      } catch {
        setIsMessageCopied(false);
      }
    }, [canCopyAssistantMessage, normalizedCopyContent]);

    return (
      <div className={`message-bubble-row ${role} ${isLoading ? 'generating' : ''} ${!isAssistant && !showUserAvatar ? 'no-avatar' : ''}`}>
        {(isAssistant || showUserAvatar) && (
          <div className="message-icon-wrapper">
            {showModelAvatar || isLoading ? (
              <img
                src={avatarSrc}
                alt={avatarName || 'AI'}
                className={`assistant-avatar ${shouldCycle ? 'cycling-avatar' : ''} ${shouldCycle && isFading ? 'avatar-fade-out' : 'avatar-fade-in'}`}
              />
            ) : (
              <User size={18} />
            )}
          </div>
        )}

        <div className="message-bubble-content">
          <div className="message-role-label">
            {shouldCycle ? (
              <span className={`cycling-name ${isFading ? 'name-fade-out' : 'name-fade-in'}`}>
                {avatarName}
              </span>
            ) : (
              showModelAvatar || isLoading ? (avatarName || 'AI') : localizeText(language, CHAT_UI.userLabel)
            )}
          </div>

          {headerAddon && <div className="message-header-addon">{headerAddon}</div>}

          <div className="message-text-body markdown-content">
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span className="thinking-text">{loadingText}</span>
              </>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                {markdownSource}
              </ReactMarkdown>
            )}
          </div>

          {canCopyAssistantMessage && (
            <div className="message-copy-actions">
              <button
                type="button"
                className="message-copy-btn"
                onClick={() => void handleCopyMessage()}
                aria-label={localizeText(language, isMessageCopied ? MESSAGE_COPIED_LABEL : MESSAGE_COPY_LABEL)}
              >
                {isMessageCopied ? <Check size={14} /> : <Copy size={14} />}
                <span>
                  {localizeText(language, isMessageCopied ? MESSAGE_COPIED_LABEL : MESSAGE_COPY_LABEL)}
                </span>
              </button>
            </div>
          )}

          {imagePreview && (
            <div
              className="chat-media-lightbox-backdrop"
              role="dialog"
              aria-modal="true"
              aria-label="Image preview"
              onClick={closeImagePreview}
            >
              <div
                className="chat-media-lightbox-content"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="chat-media-lightbox-close"
                  onClick={closeImagePreview}
                  aria-label="Close image preview"
                >
                  <X size={18} />
                </button>
                <img
                  src={imagePreview.url}
                  alt={imagePreview.label}
                  className="chat-media-lightbox-image"
                />
                <a
                  href={imagePreview.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="chat-media-lightbox-open"
                >
                  <Download size={14} aria-hidden="true" />
                  <span>Open original</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

MessageBubble.displayName = 'MessageBubble';
