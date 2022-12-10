const emojiMap: { [name: string]: string } = {
  smile: '😀',
  joy: '😂',
  cry: '😭',
  angry: '😡',
};

export function getEmoji(name: string): string {
  if (name[0] === ':') name = name.substring(1, name.length - 1);
  return emojiMap[name];
}