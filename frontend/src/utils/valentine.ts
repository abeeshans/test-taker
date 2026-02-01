
export interface ValentineCard {
  id: string;
  date: string; // "2026-02-01"
  day: number; // 1
  title: string; // "Feb 1 Love Letter"
  message: string;
}

export const VALENTINE_MESSAGES: Record<string, string> = {
  "2026-02-01": "Hi my love! ❤️\nCan you believe it’s going to be our FOURTH valentine’s day together now??? But even crazier than that, our first valentine’s day as fiancés!! You truly make me the happiest boy alive and I hope I can make this valentine’s day super special. I’ve got a couple things planned for the next couple weeks and everything will be revealed here! I know it’s kind of lame that it’s on the testing website I made you, but it was the best way to make it a surprise and give you something to look forward to everyday without explicitly telling you what’s happening (kind of like the daily notes from first year, but now it’s digital!) ☺️ Everday at 12AM UK time, a new card will unlock and you can read a new message. Some of them will be simple, and some of them will be more fun. I love you so much baby and I can’t wait for Valentine’s Day this year!!\n\nSo...I guess the final question is...will you be my Valentine?",
  "2026-02-02": "Day 2: You mean the world to me.",
  "2026-02-03": "Day 3: Sending you all my love.",
  "2026-02-04": "Day 4: You make every day brighter.",
  "2026-02-05": "Day 5: Can't imagine life without you.",
  "2026-02-06": "Day 6: Six days of loving you.",
  "2026-02-07": "Day 7: One week down, forever to go.",
  "2026-02-08": "Day 8: You are my sunshine.",
  "2026-02-09": "Day 9: Thinking of you always.",
  "2026-02-10": "Day 10: You are perfect to me.",
  "2026-02-11": "Day 11: Almost there!",
  "2026-02-12": "Day 12: Two days left!",
  "2026-02-13": "Day 13: Tomorrow is the big day!",
  "2026-02-14": "Happy Valentine's Day! I love you so much! ❤️"
};

export const getValentineCards = (): ValentineCard[] => {
  const cards: ValentineCard[] = [];
  for (let i = 1; i <= 14; i++) {
    const dayStr = i.toString().padStart(2, '0');
    const date = `2026-02-${dayStr}`;
    cards.push({
      id: `v-card-${date}`,
      date: date,
      day: i,
      title: `Feb ${i} Love Letter`,
      message: VALENTINE_MESSAGES[date] || "Message loading..."
    });
  }
  return cards;
};

export const checkUnlockStatus = (dateStr: string): 'locked' | 'unlocked' => {
  const now = new Date();
  
  // Create target date at 12 AM GMT (UTC+0)
  // This corresponds to 7 PM EST on the previous day
  const targetDate = new Date(`${dateStr}T00:00:00Z`);
  
  // If the target time has passed, it's unlocked
  if (now >= targetDate) {
    return 'unlocked';
  }
  
  return 'locked';
};

export const getTimeUntilUnlock = (dateStr: string): string => {
  const now = new Date();
  const targetDate = new Date(`${dateStr}T00:00:00Z`);
  
  if (now >= targetDate) return "";
  
  const diffMs = targetDate.getTime() - now.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHrs > 24) {
    const days = Math.floor(diffHrs / 24);
    return `${days} days`;
  }
  if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
  return `${diffMins}m`;
};
