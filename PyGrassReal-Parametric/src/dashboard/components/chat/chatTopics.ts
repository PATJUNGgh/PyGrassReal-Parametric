const CODE_FENCE_MARKER = '```';

export const normalizeTopicLabel = (value: string): string => {
  return value
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const slugifyTopicLabel = (value: string): string => {
  const normalized = normalizeTopicLabel(value).toLowerCase();
  const slug = normalized
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'section';
};

export const buildTopicAnchorId = (messageId: string, topicLabel: string, topicIndex: number): string => {
  return `chat-topic-${messageId}-${slugifyTopicLabel(topicLabel)}-${topicIndex}`;
};

export interface MarkdownHeadingTopic {
  label: string;
  normalizedLabel: string;
  anchorIndex: number;
}

export const extractMarkdownHeadingTopics = (content: string, maxTopics = 8): MarkdownHeadingTopic[] => {
  if (!content.trim()) {
    return [];
  }

  const topics: MarkdownHeadingTopic[] = [];
  const seen = new Set<string>();
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  let insideCodeFence = false;
  let headingIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith(CODE_FENCE_MARKER)) {
      insideCodeFence = !insideCodeFence;
      continue;
    }
    if (insideCodeFence) {
      continue;
    }

    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (!headingMatch) {
      continue;
    }

    const label = normalizeTopicLabel(headingMatch[1]);
    const normalizedLabel = normalizeTopicLabel(label).toLowerCase();
    const currentAnchorIndex = headingIndex;
    headingIndex += 1;

    if (!label || seen.has(normalizedLabel)) {
      continue;
    }

    seen.add(normalizedLabel);
    topics.push({ label, normalizedLabel, anchorIndex: currentAnchorIndex });
    if (topics.length >= maxTopics) {
      break;
    }
  }

  return topics;
};

export const extractMarkdownHeadings = (content: string, maxTopics = 8): string[] => {
  return extractMarkdownHeadingTopics(content, maxTopics).map((topic) => topic.label);
};
