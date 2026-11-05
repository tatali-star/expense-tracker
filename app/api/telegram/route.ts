import { timingSafeEqual } from "node:crypto";

/**
 * Вебхук Telegram: сюда приходят сообщения бота. Адрес открыт без входа на сайт,
 * поэтому подлинность проверяется по секрету, заданному в setWebhook.
 * Отвечаем 200 и при ошибке: на другой код Telegram будет повторять то же сообщение.
 */

const BOT_USERNAME = "tatiko_money_bot";
const ASK_COMMAND = new RegExp(`^/ask(?:@${BOT_USERNAME})?(?:\\s+([\\s\\S]*))?$`, "i");

type TelegramMessage = {
  chat: { id: number; type: string };
  text?: string;
};

type TelegramUpdate = {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

function isFromTelegram(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const received = request.headers.get("x-telegram-bot-api-secret-token");
  if (!expected || !received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function sendMessage(chatId: number, text: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    },
  );
  if (!res.ok) console.error("Telegram sendMessage:", res.status);
}

function replyTo(text: string) {
  if (/^\/start(?:\s|@|$)/i.test(text)) {
    return "Здравствуйте! Напишите /ask и свой вопрос — например: /ask сколько я потратила в октябре?";
  }
  const ask = text.trim().match(ASK_COMMAND);
  if (!ask) return null;
  const question = ask[1]?.trim();
  if (!question) return "После /ask напишите вопрос — например: /ask сколько я потратила в октябре?";
  return "Вопрос получен, но бот пока не связан с аккаунтом трекера и не видит записи.";
}

export async function POST(request: Request) {
  if (!isFromTelegram(request)) return new Response("Forbidden", { status: 403 });

  try {
    const update = (await request.json()) as TelegramUpdate;
    // исправленное сообщение обрабатывается так же, как новое
    const message = update.message ?? update.edited_message;
    const reply = message?.text ? replyTo(message.text) : null;
    if (message && reply) await sendMessage(message.chat.id, reply);
  } catch (err) {
    console.error("Telegram webhook:", err instanceof Error ? err.message : "ошибка");
  }
  return Response.json({ ok: true });
}
