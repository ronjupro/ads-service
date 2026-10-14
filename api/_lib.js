import { Redis } from "@upstash/redis";
import crypto from "node:crypto";

export function env(k) {
  if (!process.env[k]) throw new Error(`Missing environment variable ${k}`);
  return process.env[k];
}
export function db() {
  return new Redis({ url: env("UPSTASH_REDIS_REST_URL"), token: env("UPSTASH_REDIS_REST_TOKEN") });
}
export function isAdmin(id) {
  return (process.env.ADMIN_TELEGRAM_IDS || "").split(",").map(x => x.trim()).includes(String(id));
}
export function safeEqual(a,b) {
  const x=Buffer.from(String(a||"")), y=Buffer.from(String(b||""));
  return x.length===y.length && crypto.timingSafeEqual(x,y);
}
export function esc(s) {
  return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
export async function tg(method, body) {
  const r=await fetch(`https://api.telegram.org/bot${env("TELEGRAM_BOT_TOKEN")}/${method}`, {
    method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body)
  });
  const j=await r.json();
  if(!r.ok || !j.ok) throw new Error(`Telegram API error: ${JSON.stringify(j)}`);
  return j.result;
}
export async function send(chat_id,text,reply_markup) {
  return tg("sendMessage",{chat_id,text,parse_mode:"HTML",disable_web_page_preview:true,...(reply_markup?{reply_markup}:{})});
}
export async function edit(chat_id,message_id,text,reply_markup) {
  return tg("editMessageText",{chat_id,message_id,text,parse_mode:"HTML",disable_web_page_preview:true,...(reply_markup?{reply_markup}:{})});
}
export async function answer(id,text="") { return tg("answerCallbackQuery",{callback_query_id:id,text}); }
export const mainMenu = {
  inline_keyboard:[
    [{text:"🚀 Launch Ads Galaxy",callback_data:"launch"}],
    [{text:"📊 Publisher Dashboard",callback_data:"publisher"},{text:"📈 Advertiser Dashboard",callback_data:"advertiser"}],
    [{text:"🔗 Referral Program",callback_data:"referral"}],
    [{text:"📢 Official Channel",url:process.env.OFFICIAL_CHANNEL_URL||"https://t.me/"} , {text:"🛟 Support Chat",url:process.env.SUPPORT_CHAT_URL||"https://t.me/"}]
  ]
};
export async function getUser(store,id,from={}) {
  const key=`user:${id}`;
  let u=await store.get(key);
  if(!u) {
    u={id:String(id),first_name:from.first_name||"there",username:from.username||"",role:"both",language:"en",joined_at:new Date().toISOString(),referrals:0,earnings:0,advertiser_budget:0};
    await store.set(key,u);
  }
  return u;
                                                                                          }
