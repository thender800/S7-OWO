console.clear();

import 'dotenv/config';
import fs from 'fs';
import { Client } from 'discord.js-selfbot-v13';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

const channelsConfig = JSON.parse(
  fs.readFileSync('./channels.json', 'utf-8')
);

const GUILD_ID = "YOUR_MAIN_GUILD_ID";
const ACTIVE_AUTO_IDS = 5;

const tokenKeys = Object.keys(process.env)
  .filter(key => key.startsWith("TOKEN"))
  .sort((a, b) => {
    const numA = parseInt(a.replace("TOKEN", "")) || 0;
    const numB = parseInt(b.replace("TOKEN", "")) || 0;
    return numA - numB;
  });

const proxies = fs
  .readFileSync('./proxies.txt', 'utf-8')
  .split('\n')
  .map(p => p.trim())
  .filter(Boolean);

console.log(`[DEBUG] Found ${tokenKeys.length} tokens`);
console.log(`[DEBUG] Found ${proxies.length} proxies`);

if (tokenKeys.length === 0) {
  console.log("[ERROR] No tokens found");
  process.exit();
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createProxyAgent(proxy) {
  if (!proxy) return null;

  if (proxy.startsWith("socks5://") || proxy.startsWith("socks4://")) {
    return new SocksProxyAgent(proxy);
  }

  if (proxy.startsWith("http://") || proxy.startsWith("https://")) {
    return new HttpsProxyAgent(proxy);
  }

  return null;
}

async function startClients() {
  for (const [index, key] of tokenKeys.entries()) {
    const token = process.env[key]?.trim();
    const proxy = proxies[index] || null;

    console.log(`\n[DEBUG] Checking ${key}...`);

    if (!token) {
      console.log(`[ERROR] ${key} empty`);
      continue;
    }

    let clientOptions = {
      checkUpdate: false
    };

    if (proxy) {
      const agent = createProxyAgent(proxy);

      if (agent) {
        clientOptions = {
          checkUpdate: false,
          ws: { agent },
          http: { agent }
        };

        console.log(`[PROXY] ${key} using ${proxy}`);
      }
    }

    const client = new Client(clientOptions);

    client.once("ready", async () => {
      console.log(
        `[READY] ${key} -> ${client.user.username} (${client.user.id})`
      );

      const guild = client.guilds.cache.get(GUILD_ID);
      if (!guild) {
        console.log(`[ERROR] ${key} not in guild`);
        return;
      }

      if (index < ACTIVE_AUTO_IDS) {
        for (const channelId of channelsConfig.channels) {
          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (!channel) continue;

          let lastSendTime = 0;

          async function sendAutoOhCycle() {
            while (true) {
              const totalMessages = randomBetween(1, 100);

              for (let i = 0; i < totalMessages; i++) {
                try {
                  let delay;
                  do {
                    delay = randomBetween(10000, 20000);
                  } while (Date.now() + delay === lastSendTime);

                  await wait(delay);
                  await channel.send("oh");
                  lastSendTime = Date.now();

                  console.log(
                    `[AUTO OH] ${key} -> ${channelId} (${i + 1}/${totalMessages})`
                  );
                } catch (err) {
                  console.log(`[ERROR] ${key}: ${err.message}`);
                }
              }

              const breakTime = randomBetween(1800000, 3600000);
              await wait(breakTime);
            }
          }

          sendAutoOhCycle();
        }
      }
    });

    try {
      console.log(`[LOGIN] ${key}...`);
      await client.login(token);
      await wait(8000);
    } catch (err) {
      console.log(`[LOGIN FAILED] ${key}: ${err.message}`);
    }
  }
}

startClients();
