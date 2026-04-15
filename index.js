import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';

//configuration
const isTestMode = process.argv.includes('--test');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

//only enable polling for incoming messages if not in test mode
const bot = new TelegramBot(process.env.TELEGRAM_BOT_API_TOKEN, { polling: !isTestMode });
const MY_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

//The Maxim Generator
async function getDailyMotivation() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
Generate a single, powerful, quote-style maxim (under 20 words). 

Tone Palette: Blend elements of a motivational mentor, a stoic philosopher, a disciplined warrior, a Machiavellian strategist, and a calculated anti-hero. 

Instruction: For this generation, choose a unique subset of these tones to deliver razor-sharp wisdom. It should feel like advice for someone playing a high-stakes game where resilience, strategy, and personal power are the only currencies. The maxim must be universally applicable to the human condition—addressing ambition, adversity, or self-mastery—without being limited to any specific niche. 

Output ONLY the text. No preamble. No quotation marks.
`;

    const result = await model.generateContent(prompt);
    const qouteText = result.response.text().trim();

    return qouteText;

  } catch (error) {
    console.error("Model Engine Error:", error);

    //if api fails, providea classic quote
    const fallbackQoutes = [
      "Stay afraid, but do it anyway. What's important is the action. You don't have to wait to be confident. Just do it and eventually the confidence will follow. - Carrie Fisher",

      "We can't become what we need to be by remaining what we are. - Oprah Winfrey",

      "If there is no struggle, there is no progress. - Frederick Douglass",

      "Be not afraid of growing slowly; be afraid only of standing still. - Chinese Proverb",

      "I am no longer accepting the things I cannot change. I am changing the things I cannot accept. - Angela Davis",

      "Change is made of choices, and choices are made of character. - Amanda Gorman",

      "People who are crazy enough to think they can change the world are the ones who do. - Rob Siltanen",

      "Recognizing that you are not where you want to be is a starting point to begin changing your life. - Deborah Day",

      "Incredible change happens in your life when you decide to take control of what you have power over instead of craving control over what you don't. - Steve Maraboli",

      "Sometimes good things fall apart so better things could fall together. - Marilyn Monroe",

      "What you do makes a difference, and you have to decide what kind of difference you want to make. - Jane Goodall",

      "A well-educated mind will always have more questions than answers. - Helen Keller",

      "An investment in knowledge pays the best interest. - Benjamin Franklin",

      "i promise you one thing, if you put your mind to it, and you work hard, and you never give up, and most importantly you don't listen to rejection, you can achieve anything in life that you want.",

      "in the process of evolution and growth, it attends with pain, and the reason you are not as great as you could be, is because you can't take pain.",

      "Courage isn't moving forward in the absence of fear, it is moving forward even if you are little scared, even if you never did it before.",

      "You are changing, You are growing, things going to work out for you, you are going to get everything in your life that you dream of. start now, make it happen.",

      "Lazy people Don't know how to start, Weak People Don't know how to finish, Successful people Don't know how to stop.",

      "Stay Small Enough Long Enough, You'll be big enough soon enough.",

      "believing that you can, is more profitable that believing that you can't.",

      "We are the results of our own actions, not our aspirations.",

      "If you are able to get up every morning, have no passion, no drive, no motivation, no shit, and still get up with that kind of fire, you will be successful in life, I can guarantee you that.",

      "Fortune Always Favours The Bold",

      "Always say this to yourself that you are able to do anything, you can do anything you want in your life."
    ];

    return fallbackQoutes[Math.floor(Math.random() * fallbackQoutes.length)];
  }
};

// The Dispatch Function
const sendTelegramMessage = async () => {
  try {
    const quote = await getDailyMotivation();

    // We format it like a traditional maxim: italicized quote followed by a thin separator
    const finalMessage = `_${quote}_`;

    await bot.sendMessage(MY_CHAT_ID, finalMessage, { parse_mode: 'Markdown' });
    return true;

  } catch (error) {
    console.error("Telegram Dispatch Error:", error);
    return false;
  }
};


//Execution Logic

if (isTestMode) {
  // Test Mode- for local run and auto exit
  console.log("🚀 Running Script For Local Testing");

  //self-invoking async function to handle top level await cleanly

  (async () => {
    const success = await sendTelegramMessage();

    if (success) {
      console.log("✅ Success! Motivation sent to Telegram. exiting...");
      process.exit(0);
    } else {
      console.log("❌ Test failed. Check logs above.");
      process.exit(1);
    }
  })();

} else {
  //Production Mode (NorthFlank Scheduled Woker)
  // Schedule: 8:00 AM IST daily (crontab: minute hour day-of-month month day-of-week)

  cron.schedule('0 8 * * *', () => {
    console.log("Executing scheduled morning briefing...");
    sendTelegramMessage();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  }
  );

  console.log("System Standby: Next Maximizing scheduled for 08:00 AM IST (Asia/Kolkata).");
}

