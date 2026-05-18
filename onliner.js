console.clear();

import 'dotenv/config';
import { Client } from 'discord.js-selfbot-v13';

const tokenKeys = Object.keys(process.env)
  .filter(key => key.startsWith("TOKEN"))
  .sort((a, b) => {
    const numA = parseInt(a.replace("TOKEN", "")) || 0;
    const numB = parseInt(b.replace("TOKEN", "")) || 0;
    return numA - numB;
  });

console.log(`[DEBUG] Found ${tokenKeys.length} token entries`);

if (tokenKeys.length === 0) {
  console.log("[ERROR] No tokens found in .env");
  process.exit();
}

async function startClients() {
  for (const [index, key] of tokenKeys.entries()) {
    const token = process.env[key]?.trim();

    console.log(`\n[DEBUG] Checking ${key}...`);

    if (!token) {
      console.log(`[ERROR] ${key} is empty`);
      continue;
    }

    const client = new Client({
      checkUpdate: false
    });

    client.once("ready", async () => {
      console.log(
        `[READY] [${index + 1}] ${key} -> Logged in as ${client.user.username} (${client.user.id})`
      );
      console.log(`[DEBUG] Guild count: ${client.guilds.cache.size}`);

      // AUTO OH SYSTEM
//      const channelId = "1504058114066874429";
//      const channel = await client.channels.fetch(channelId).catch(() => null);

//      if (!channel) {
//        console.log(`[ERROR] Channel not found for ${key}`);
//        return;
//      }

//      async function sendAutoOh() {
//        try {
//          await channel.send("oh");
//          console.log(`[AUTO OH] ${key} sent: oh`);
//        } catch (err) {
//          console.log(`[ERROR] ${key} auto send failed: ${err.message}`);
//        }
//
//        const nextDelay = 20000 + Math.floor(Math.random() * 10000); // 10–15 sec
//        setTimeout(sendAutoOh, nextDelay);
//      }
//
//      sendAutoOh();
    });

    // MESSAGE COMMANDS
    client.on("messageCreate", async message => {
      if (message.author.id !== "1178288543852920832") return;

      console.log(
        `[MSG] ${key} | ${message.author.username}: ${message.content}`
      );

      if (message.content === "!oh") {
        message
          .reply("oh")
          .then(() =>
            console.log(`[SUCCESS] ${key} replied with oh`)
          )
          .catch(err =>
            console.log(
              `[ERROR] ${key} reply failed: ${err.message}`
            )
          );
      }

      if (message.content.startsWith("!msg ")) {
        const text = message.content.slice(5).trim();

        if (!text) return;

        message.channel
          .send(text)
          .then(() =>
            console.log(`[SUCCESS] ${key} sent: ${text}`)
          )
          .catch(err =>
            console.log(
              `[ERROR] ${key} send failed: ${err.message}`
            )
          );
      }

      if (message.content.startsWith(",msg ")) {
        const args = message.content.slice(5).trim().split(" ");
        const mention = message.mentions.users.first();

        // Agar mention nahi hai ya text nahi hai to kuch mat karo
        if (!mention) return;

          const text = args.slice(1).join(" ").trim();
          if (!text) return;

          // Sirf jis account ka ID mention hua hai wahi send kare
          if (client.user.id !== mention.id) return;

          message.channel
            .send(text)
            .then(() =>
              console.log(`[SUCCESS] ${key} sent: ${text}`)
            )
            .catch(err =>
              console.log(
                `[ERROR] ${key} send failed: ${err.message}`
              )
            );
      }
    });

    client.on("error", err => {
      console.log(`[CLIENT ERROR] ${key}: ${err.message}`);
    });

    client.on("disconnect", event => {
      console.log(
        `[DISCONNECT] ${key}: ${event?.code || "Unknown"}`
      );
    });

    try {
      console.log(`[LOGIN] Attempting login for ${key}...`);
      await client.login(token);
      console.log(`[SUCCESS] ${key} fully logged in`);

      // Delay before next token
      await new Promise(resolve => setTimeout(resolve, 8000));
    } catch (err) {
      console.log(`[LOGIN FAILED] ${key}: ${err.message}`);
    }
  }
}

startClients();











