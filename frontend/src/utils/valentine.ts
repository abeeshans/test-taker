
export interface ValentineCard {
  id: string;
  date: string; // "2026-02-01"
  day: number; // 1
  title: string; // "Feb 1 Love Letter"
  message: string;
}

export const VALENTINE_MESSAGES: Record<string, string> = {
  "2026-02-01": "Hi my love! ❤️\nCan you believe it’s going to be our FOURTH valentine’s day together now??? But even crazier than that, our first valentine’s day as fiancés!! You truly make me the happiest boy alive and I hope I can make this valentine’s day super special. I’ve got a couple things planned for the next couple weeks and everything will be revealed here! I know it’s kind of lame that it’s on the testing website I made you, but it was the best way to make it a surprise and give you something to look forward to everyday without explicitly telling you what’s happening (kind of like the daily notes from first year, but now it’s digital!) ☺️ Everday at 12AM UK time, a new card will unlock and you can read a new message. Some of them will be simple, and some of them will be more fun. I love you so much baby and I can’t wait for Valentine’s Day this year!!\n\nSo...I guess the final question is...will you be my Valentine?",
  "2026-02-02": "Hi my love!! \n\nI just wanted to tell you that I love you soooo much and you’re truly my best friend in the whole world. I love talking to you and more than that, I love hearing you talk. You’re such a fun and bouncy person with so much emotion and expression that it really does make me so happy to be around someone that experiences life with so much depth. Even though that can mean your lows are very low, your highs are extremely high, and I love being a part of both the highs and lows with you. I look forward to everyday with you and I CANNOT WAIT until the day that we can experience everyday together in person. \n\nI hope you have the best Monday ever today baby!! ☺️ ",
  "2026-02-03": "Hi my love!!\n\nI’m writing this while we watch the last episode of Bridgerton season 1 while you’re lying in your bright yellow bed with your bright pink bonnet on, and I couldn’t be more in love. You mean the world to me, and I couldn’t be more happy than to be with you baby. You’ve always asked me silly questions for as long as we’ve been together, like “Would you still love me if I smiled like this” or “Would you still love me if I gained 100lbs”. You’re my forever person and I’ll ALWAYS love you!! I love you to the moon and back baby and I can’t wait to see you again in a couple months. ❤️",
  "2026-02-04": "Hi my love!! \nI know you’re feeling super sick today and I wish I could be there to take care of you baby :( I’m glad you liked the garlic naan and pani puri though and hopefully you have enough for tomorrow too so you don’t need to cook if you’re still feeling sick. I know you can take care of yourself and honestly I have more confidence in your abilities/expertise in taking care of yourself than me. But you’re still my baby and I hate to see you feeling so shitty without being able to do anything about it. God better make you feel better soon, ‘cause I don’t like it. I hope you get better baby, I love you!!! \n\nP.S. I just got my internet wire connection set up, so we can play Mario Kart as long as you want while you recover tomorrow! ☺️",
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
