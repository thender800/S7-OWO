console.clear();

import 'dotenv/config';
import fs from 'fs';
import { Client } from 'discord.js-selfbot-v13';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

const GUILD_ID = "1503609090159546420";
const IDS_PER_CHANNEL = 5;

// Load channels.json manually
const channelsConfig = JSON.parse(
  fs.readFileSync('./channels.json', 'utf-8')
);

const tokenKeys = Object.keys(process.env)
  .filter(key => key.startsWith('TOKEN'))
  .sort((a, b) => {
    const numA = parseInt(a.replace('TOKEN', '')) || 0;
    const numB = parseInt(b.replace('TOKEN', '')) || 0;
    return numA - numB;
  });

const proxies = fs
  .readFileSync('./proxies.txt', 'utf-8')
  .split('\n')
  .map(p => p.trim())
  .filter(Boolean);

console.log(`[DEBUG] Found ${tokenKeys.length} token entries`);
console.log(`[DEBUG] Found ${proxies.length} proxies`);

if (tokenKeys.length === 0) {
  console.log('[ERROR] No tokens found in .env');
  process.exit();
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createProxyAgent(proxy) {
  if (!proxy) return null;

  if (proxy.startsWith('socks5://') || proxy.startsWith('socks4://')) {
    return new SocksProxyAgent(proxy);
  }

  if (proxy.startsWith('http://') || proxy.startsWith('https://')) {
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
      console.log(`[ERROR] ${key} is empty`);
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
    } else {
      console.log(`[DIRECT] ${key} using direct connection`);
    }

    const client = new Client(clientOptions);

    client.once('ready', async () => {
      console.log(
        `[READY] [${index + 1}] ${key} -> Logged in as ${client.user.username} (${client.user.id})`
      );

      const guild = client.guilds.cache.get(GUILD_ID);
      if (!guild) {
        console.log(`[ERROR] ${key} not in target guild`);
        return;
      }

      // Batch system: 5 IDs per channel
      const channelGroup = Math.floor(index / IDS_PER_CHANNEL);
      const assignedChannelId = channelsConfig.channels[channelGroup];

      if (!assignedChannelId) {
        console.log(`[SKIP] ${key} no assigned channel group`);
        return;
      }

      const channel = await client.channels
        .fetch(assignedChannelId)
        .catch(() => null);

      if (!channel) {
        console.log(`[ERROR] Channel ${assignedChannelId} not found for ${key}`);
        return;
      }

      let lastSendTime = 0;

      async function sendAutoOhCycle() {
        while (true) {
          const totalMessages = randomBetween(1, 100);

          console.log(
            `[AUTO OH] ${key} starting ${totalMessages} messages in channel ${assignedChannelId}`
          );

          for (let i = 0; i < totalMessages; i++) {
            try {
              let delay;

              do {
                delay = randomBetween(10000, 20000);
              } while (Date.now() + delay === lastSendTime);

              await wait(delay);
              await channel.send('oh');

              lastSendTime = Date.now();

              console.log(
                `[AUTO OH] ${key} -> ${assignedChannelId} (${i + 1}/${totalMessages}) after ${Math.floor(delay / 1000)}s`
              );
            } catch (err) {
              console.log(
                `[ERROR] ${key} auto send failed in ${assignedChannelId}: ${err.message}`
              );
            }
          }

          const breakTime = randomBetween(1800000, 3600000);

          console.log(
            `[AUTO OH] ${key} resting ${Math.floor(
              breakTime / 60000
            )} min in channel ${assignedChannelId}`
          );

          await wait(breakTime);
        }
      }

      sendAutoOhCycle();
    });

    client.on('messageCreate', async message => {
      if (message.author.id !== '1255864989894447237') return;

      console.log(
        `[MSG] ${key} | ${message.author.username}: ${message.content}`
      );

      if (message.content === '!oh') {
        try {
          await message.reply('oh');
        } catch (err) {
          console.log(`[ERROR] ${key} reply failed: ${err.message}`);
        }
      }

      if (message.content.startsWith('!msg ')) {
        const text = message.content.slice(5).trim();
        if (!text) return;

        try {
          await wait(index * 2000);
          await message.channel.send(text);
        } catch (err) {
          console.log(`[ERROR] ${key} send failed: ${err.message}`);
        }
      }

      if (message.content.startsWith(',msg ')) {
        const mention = message.mentions.users.first();
        if (!mention) return;

        const args = message.content.slice(5).trim().split(' ');
        const text = args.slice(1).join(' ').trim();

        if (!text) return;
        if (client.user.id !== mention.id) return;

        try {
          await wait(2000);
          await message.channel.send(text);
        } catch (err) {
          console.log(
            `[ERROR] ${key} specific send failed: ${err.message}`
          );
        }
      }
    });

    client.on('error', err => {
      console.log(`[CLIENT ERROR] ${key}: ${err.message}`);
    });

    client.on('disconnect', event => {
      console.log(`[DISCONNECT] ${key}: ${event?.code || 'Unknown'}`);
    });

    try {
      console.log(`[LOGIN] Attempting login for ${key}...`);
      await client.login(token);
      console.log(`[SUCCESS] ${key} fully logged in`);
      await wait(8000);
    } catch (err) {
      console.log(`[LOGIN FAILED] ${key}: ${err.message}`);
    }
  }
}

startClients();
