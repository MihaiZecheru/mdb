const emojiMap = {
  smile: '😀',
  joy: '😂',
  cry: '😭',
  angry: '😡',
};

export function getEmoji(name: string): string {
  return emojiMap[name];
}