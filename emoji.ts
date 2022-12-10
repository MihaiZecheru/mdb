const emojiMap: { [name: string]: string } = {
  smile: '😀',
  joy: '😂',
  cry: '😭',
  angry: '😡',
};

export function getEmoji(name: string): string {
  name = name.substring(1, name.length - 1);
  return emojiMap[name];
}