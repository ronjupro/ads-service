import { env, db, isAdmin, safeEqual, esc, tg, send, edit, answer, mainMenu, getUser } from "./_lib.js";

const langKeys={inline_keyboard:[[{text:"Русский",callback_data:"lang:ru"},{text:"English",callback_data:"lang:en"}]]};
const backKey={inline_keyboard:[[{text:"⬅️ Back",callback_data:"home"}]]};
const homeText=u=>`👋 Welcome back, <b>${esc(u.first_name)}</b>!\n\n✅ You're registered as both Publisher & Advertiser\n\nWhat would you like to do today? 👇`;
const homeKb=mainMenu;

async function dashboard(chatId, u, type, store) {
  if(type==="publisher") {
    const chans=await store.scard(`publisher:channels:${u.id}`);
    const pending=await store.get(`publisher:pending:${u.id}`)||0;
    return send(chatId,`📊 <b>Publisher Dashboard</b>\n\n👤 ${esc(u.first_name)}\n📺 Verified channels: ${chans}\n💰 Available earnings: $${Number(u.earnings||0).toFixed(2)}\n🕓 Pending review: ${pending}\n\nConnect a channel you own and request review before ads can run.`,{inline_keyboard:[
      [{text:"➕ Submit channel for review",callback_data:"publisher:add"}],
      [{text:"💸 Request payout",callback_data:"publisher:payout"}],
      [{text:"⬅️ Back",callback_data:"home"}]
    ]});
  }
  const campaigns=await store.lrange(`advertiser:campaigns:${u.id}`,0,9);
  return send(chatId,`📈 <b>Advertiser Dashboard</b>\n\n💳 Demo budget balance: $${Number(u.advertiser_budget||0).toFixed(2)}\n📣 Your campaigns: ${campaigns.length}\n\nCreate a campaign for moderator review. Live ads require an approved campaign and a verified publisher channel.`,{inline_keyboard:[
    [{text:"➕ Create campaign",callback_data:"advertiser:create"}],
    [{text:"📋 My campaigns",callback_data:"advertiser:list"}],
    [{text:"⬅️ Back",callback_data:"home"}]
  ]});
}
export default async function handler(req,res) {
  if(req.method!=="POST") return res.status(405).send("Method Not Allowed");
  if(!safeEqual(req.headers["x-telegram-bot-api-secret-token"],env("TELEGRAM_WEBHOOK_SECRET"))) return res.status(401).send("Unauthorized");
  try {
    const store=db(), upd=req.body||{};
    if(upd.message) {
      const m=upd.message, chat=m.chat.id, id=m.from.id, text=(m.text||"").trim();
      const u=await getUser(store,id,m.from);
      if(text.startsWith("/start")) {
        const ref=text.split(/\s+/)[1];
        if(ref && ref!==String(id) && !u.referred_by) {
          u.referred_by=ref; await store.set(`user:${id}`,u);
          const parent=await store.get(`user:${ref}`);
          if(parent) { parent.referrals=(parent.referrals||0)+1; await store.set(`user:${ref}`,parent); }
        }
        await send(chat,"Select your preferred language",langKeys);
      } else if(text==="/admin") {
        if(!isAdmin(id)) await send(chat,"⛔ Admin only.");
        else await send(chat,"🛠 <b>Ads Galaxy Admin</b>\n\n/adminstats — users/campaign queue\n/pending — review submitted campaigns\n/approve CAMPAIGN_ID\n/reject CAMPAIGN_ID\n\nThis starter keeps payouts and ad delivery in manual review until you integrate a legitimate payment provider and verified channel posting.",{inline_keyboard:[[{text:"📋 Pending campaigns",callback_data:"admin:pending"}]]});
      } else if(text==="/adminstats" || text==="/pending") {
        if(!isAdmin(id)) await send(chat,"⛔ Admin only.");
        else {
          const ids=await store.lrange("campaigns:pending",0,19);
          await send(chat,`🛠 <b>Pending campaigns (${ids.length})</b>\n`+(ids.length?ids.map(esc).join("\n"):"None"));
        }
      } else if(text.startsWith("/approve ") || text.startsWith("/reject ")) {
        if(!isAdmin(id)) await send(chat,"⛔ Admin only.");
        else {
          const [cmd,cid]=text.split(/\s+/), c=await store.get(`campaign:${cid}`);
          if(!c) await send(chat,"Campaign not found.");
          else { c.status=cmd==="/approve"?"approved":"rejected"; c.reviewed_at=new Date().toISOString(); c.reviewed_by=String(id); await store.set(`campaign:${cid}`,c); await store.lrem("campaigns:pending",0,cid); await send(chat,`Campaign ${esc(cid)} ${c.status}.`); await send(c.owner_id,`Your campaign <code>${esc(cid)}</code> was ${c.status}.`); }
        }
      } else if(text.startsWith("/campaign ")) {
        const parts=text.slice(10).split("|").map(x=>x.trim());
        if(parts.length<3 || !parts[0].startsWith("https://") || !parts[1] || !Number.isFinite(Number(parts[2])) || Number(parts[2])<=0) {
          await send(chat,"Format:\n<code>/campaign https://example.com | Campaign title | budget_usd</code>\nCampaigns are queued for admin review.");
        } else {
          const cid=`cmp_${Date.now()}_${id}`;
          const c={id:cid,owner_id:String(id),url:parts[0],title:parts[1],budget_usd:Number(parts[2]),status:"pending_review",created_at:new Date().toISOString()};
          await store.set(`campaign:${cid}`,c); await store.lpush("campaigns:pending",cid); await store.lpush(`advertiser:campaigns:${id}`,cid);
          await send(chat,`✅ Campaign submitted for review.\nID: <code>${esc(cid)}</code>\nTitle: ${esc(c.title)}\nBudget: $${c.budget_usd.toFixed(2)}\n\nIt will not run until approved.`);
          const admins=(process.env.ADMIN_TELEGRAM_IDS||"").split(",").map(x=>x.trim()).filter(Boolean);
          for(const a of admins) await send(a,`📣 New campaign pending review\nID: <code>${esc(cid)}</code>\nTitle: ${esc(c.title)}\nURL: ${esc(c.url)}\nBudget: $${c.budget_usd}\nUse /approve ${esc(cid)} or /reject ${esc(cid)}`);
        }
      } else if(text.startsWith("/channel ")) {
        const channel=text.slice(9).trim();
        if(!channel || !/^(@[A-Za-z0-9_]{5,}|https:\/\/t\.me\/[A-Za-z0-9_]{5,})$/.test(channel)) await send(chat,"Send a public channel username or t.me URL:\n<code>/channel @yourchannel</code>\nOnly submit channels you own/manage. Admin review is required.");
        else {
          const idKey=`chan_${Date.now()}_${id}`;
          const c={id:idKey,owner_id:String(id),channel,status:"pending_review",created_at:new Date().toISOString()};
          await store.set(`channel:${idKey}`,c); await store.lpush("channels:pending",idKey);
          await send(chat,`📺 Channel submitted for manual ownership/permission review.\nReference: <code>${idKey}</code>\nNo ads will be posted until an admin verifies permissions.`);
          for(const a of (process.env.ADMIN_TELEGRAM_IDS||"").split(",").map(x=>x.trim()).filter(Boolean)) await send(a,`📺 Channel review needed: ${esc(channel)}\nRef: ${esc(idKey)}\nVerify the bot has posting permission before approving.`);
        }
      }
    } else if(upd.callback_query) {
      const q=upd.callback_query, chat=q.message.chat.id, id=q.from.id, data=q.data||"";
      const u=await getUser(store,id,q.from); await answer(q.id);
      if(data.startsWith("lang:")) {
        u.language=data.split(":")[1]; await store.set(`user:${id}`,u);
        await send(chat,homeText(u),homeKb);
      } else if(data==="home" || data==="launch") await send(chat,homeText(u),homeKb);
      else if(data==="publisher") await dashboard(chat,u,"publisher",store);
      else if(data==="advertiser") await dashboard(chat,u,"advertiser",store);
      else if(data==="referral") await send(chat,`🔗 <b>Referral Program</b>\n\nInvite friends using your personal link:\n<code>https://t.me/${esc(env("TELEGRAM_BOT_USERNAME")||"YourBot")}?start=${id}</code>\n\nSuccessful referrals: ${u.referrals||0}\nRewards are shown only after the admin configures and funds a verified rewards program.`,{inline_keyboard:[[ {text:"⬅️ Back",callback_data:"home"} ]]});
      else if(data==="publisher:add") await send(chat,"Submit your public channel with:\n<code>/channel @yourchannel</code>\nYou must own/manage the channel. Admin approval is required.",backKey);
      else if(data==="publisher:payout") await send(chat,"💸 Payout requests are not enabled until a verified payout provider and minimum threshold are configured. Contact support.",backKey);
      else if(data==="advertiser:create") await send(chat,"Create campaign with:\n<code>/campaign https://example.com | Campaign title | budget_usd</code>\nIt will be queued for admin review.",backKey);
      else if(data==="advertiser:list") {
        const ids=await store.lrange(`advertiser:campaigns:${id}`,0,9), out=[];
        for(const cid of ids){const c=await store.get(`campaign:${cid}`); if(c) out.push(`${esc(c.id)} — ${esc(c.title)} — ${esc(c.status)}`);}
        await send(chat,out.length?"📋 <b>Your campaigns</b>\n"+out.join("\n"):"No campaigns yet.",backKey);
      } else if(data==="admin:pending") {
        if(!isAdmin(id)) await send(chat,"⛔ Admin only.");
        else {const ids=await store.lrange("campaigns:pending",0,19); await send(chat,ids.length?`Pending campaigns:\n${ids.map(esc).join("\n")}`:"No pending campaigns.");}
      }
    }
    return res.status(200).json({ok:true});
  } catch(e) {
    console.error("telegram webhook error",e);
    return res.status(200).json({ok:true});
  }
}
