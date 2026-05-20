console.clear();

import 'dotenv/config';
import fs from 'fs';
import { Client } from 'discord.js-selfbot-v13';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

const GUILD_ID = '1503609090159546420';
const IDS_PER_CHANNEL = 5;
const OWNER_ID = '1255864989894447237';

// ================= LOAD CHANNELS =================

let channelsConfig = { channels: [] };

try {
  channelsConfig = JSON.parse(
    fs.readFileSync('./channels.json', 'utf-8')
  );
} catch (err) {
  console.log(
    `[ERROR] Failed to load channels.json: ${err.message}`
  );

  process.exit();
}

// ================= LOAD TOKENS =================

const tokenKeys = Object.keys(process.env)
  .filter(key => key.startsWith('TOKEN'))
  .sort((a, b) => {
    const numA =
      parseInt(a.replace('TOKEN', '')) || 0;

    const numB =
      parseInt(b.replace('TOKEN', '')) || 0;

    return numA - numB;
  });

// ================= LOAD PROXIES =================

let proxies = [];

try {
  if (fs.existsSync('./proxies.txt')) {
    proxies = fs
      .readFileSync('./proxies.txt', 'utf-8')
      .split('\n')
      .map(proxy => proxy.trim())
      .filter(Boolean);
  }
} catch (err) {
  console.log(
    `[ERROR] Failed to load proxies.txt: ${err.message}`
  );
}

console.log(
  `[DEBUG] Found ${tokenKeys.length} token entries`
);

console.log(
  `[DEBUG] Found ${proxies.length} proxies`
);

if (tokenKeys.length === 0) {
  console.log(
    '[ERROR] No tokens found in .env'
  );

  process.exit();
}

// ================= HELPERS =================

const wait = ms =>
  new Promise(resolve =>
    setTimeout(resolve, ms)
  );

function randomBetween(min, max) {
  return (
    Math.floor(
      Math.random() * (max - min + 1)
    ) + min
  );
}

function createProxyAgent(proxy) {
  if (!proxy) return null;

  try {
    if (
      proxy.startsWith('socks5://') ||
      proxy.startsWith('socks4://')
    ) {
      return new SocksProxyAgent(proxy);
    }

    if (
      proxy.startsWith('http://') ||
      proxy.startsWith('https://')
    ) {
      return new HttpsProxyAgent(proxy);
    }
  } catch (err) {
    console.log(
      `[ERROR] Invalid proxy ${proxy}`
    );
  }

  return null;
}

// ================= START CLIENTS =================

async function startClients() {
  for (const [index, key] of tokenKeys.entries()) {
    const token = process.env[key]?.trim();

    const proxy = proxies[index] || null;

    console.log(`\n[DEBUG] Checking ${key}...`);

    if (!token) {
      console.log(
        `[ERROR] ${key} is empty`
      );

      continue;
    }

    let clientOptions = {
      checkUpdate: false
    };

    // ================= PROXY =================

    if (proxy) {
      const agent = createProxyAgent(proxy);

      if (agent) {
        clientOptions = {
          checkUpdate: false,
          ws: {
            agent
          },
          http: {
            agent
          }
        };

        console.log(
          `[PROXY] ${key} using ${proxy}`
        );
      } else {
        console.log(
          `[PROXY ERROR] ${key} invalid proxy`
        );
      }
    } else {
      console.log(
        `[DIRECT] ${key} using direct connection`
      );
    }

    const client = new Client(clientOptions);

    // ================= AUTO OH STATE =================

    let autoOhRunning = false;

    // ================= READY =================

    client.once('ready', async () => {
      console.log(
        `[READY] [${index + 1}] ${key} -> ${client.user.username} (${client.user.id})`
      );

      const guild =
        client.guilds.cache.get(GUILD_ID);

      if (!guild) {
        console.log(
          `[ERROR] ${key} not in target guild`
        );

        return;
      }

      // ================= CHANNEL ASSIGN =================

      const channelGroup = Math.floor(
        index / IDS_PER_CHANNEL
      );

      const assignedChannelId =
        channelsConfig.channels[channelGroup];

      if (!assignedChannelId) {
        console.log(
          `[SKIP] ${key} no assigned channel`
        );

        return;
      }

      const channel =
        await client.channels
          .fetch(assignedChannelId)
          .catch(() => null);

      if (!channel) {
        console.log(
          `[ERROR] Channel ${assignedChannelId} not found`
        );

        return;
      }

      console.log(
        `[CHANNEL] ${key} assigned -> ${assignedChannelId}`
      );

      // ================= AUTO OH =================

      let running = true;

      async function sendAutoOhCycle() {
        while (running) {
          try {
            if (!autoOhRunning) {
              await wait(5000);
              continue;
            }

            const totalMessages =
              randomBetween(1, 80);

            console.log(
              `[AUTO OH] ${key} starting ${totalMessages} messages`
            );

            for (
              let i = 0;
              i < totalMessages;
              i++
            ) {
              if (!autoOhRunning) {
                break;
              }

              const delay =
                randomBetween(
                  15000,
                  30000
                );

              await wait(delay);

              if (!autoOhRunning) {
                break;
              }

              await channel.send('oh');

              console.log(
                `[AUTO OH] ${key} -> (${i + 1}/${totalMessages}) after ${Math.floor(delay / 1000)}s`
              );
            }

            const breakTime =
              randomBetween(
                1800000,
                3600000
              );

            console.log(
              `[AUTO OH] ${key} resting ${Math.floor(
                breakTime / 60000
              )} min`
            );

            await wait(breakTime);
          } catch (err) {
            console.log(
              `[AUTO OH ERROR] ${key}: ${err.message}`
            );

            await wait(10000);
          }
        }
      }

      sendAutoOhCycle();
    });

    // ================= COMMANDS =================

    client.on(
      'messageCreate',
      async message => {
        try {
          if (
            message.author.id !== OWNER_ID
          ) {
            return;
          }

          // ===== !on =====

          if (message.content === '!on') {
            autoOhRunning = true;

            try {
              await message.reply(
                'Auto OH enabled'
              );

              console.log(
                `[AUTO OH] ${key} enabled`
              );
            } catch (err) {
              console.log(
                `[ERROR] ${key} !on failed: ${err.message}`
              );
            }
          }

          // ===== !off =====

          if (message.content === '!off') {
            autoOhRunning = false;

            try {
              await message.reply(
                'Auto OH disabled'
              );

              console.log(
                `[AUTO OH] ${key} disabled`
              );
            } catch (err) {
              console.log(
                `[ERROR] ${key} !off failed: ${err.message}`
              );
            }
          }

          // ===== !oh =====

          if (message.content === '!oh') {
            try {
              await message.reply('oh');
            } catch (err) {
              console.log(
                `[ERROR] ${key} !oh failed: ${err.message}`
              );
            }
          }

          // ===== !msg =====

          if (
            message.content.startsWith(
              '!msg '
            )
          ) {
            const text = message.content
              .slice(5)
              .trim();

            if (!text) return;

            try {
              await wait(index * 2000);

              await message.channel.send(
                text
              );

              console.log(
                `[SUCCESS] ${key} sent: ${text}`
              );
            } catch (err) {
              console.log(
                `[ERROR] ${key} send failed: ${err.message}`
              );
            }
          }

          // ===== ,msg =====

          if (
            message.content.startsWith(
              ',msg '
            )
          ) {
            const mention =
              message.mentions.users.first();

            if (!mention) return;

            const args = message.content
              .slice(5)
              .trim()
              .split(' ');

            const text = args
              .slice(1)
              .join(' ')
              .trim();

            if (!text) return;

            if (
              client.user.id !== mention.id
            ) {
              return;
            }

            try {
              await wait(2000);

              await message.channel.send(
                text
              );

              console.log(
                `[SUCCESS] ${key} specific send: ${text}`
              );
            } catch (err) {
              console.log(
                `[ERROR] ${key} specific send failed: ${err.message}`
              );
            }
          }
        } catch (err) {
          console.log(
            `[ERROR] ${key} message handler failed: ${err.message}`
          );
        }
      }
    );

    // ================= ERRORS =================

    client.on('error', err => {
      console.log(
        `[CLIENT ERROR] ${key}: ${err.message}`
      );
    });

    client.on(
      'disconnect',
      event => {
        console.log(
          `[DISCONNECT] ${key}: ${event?.code || 'Unknown'}`
        );
      }
    );

    // ================= LOGIN =================

    try {
      console.log(
        `[LOGIN] Attempting login for ${key}...`
      );

      await client.login(token);

      console.log(
        `[SUCCESS] ${key} fully logged in`
      );

      await wait(8000);
    } catch (err) {
      console.log(
        `[LOGIN FAILED] ${key}: ${err.message}`
      );
    }
  }
}

startClients();
