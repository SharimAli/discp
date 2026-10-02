import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  console.log('===============================================================');
  console.log('🏛️  BUILDING COMPLETE PROFESSIONAL DISCORD SERVER VIA DISCP MCP');
  console.log('===============================================================\n');

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['C:\\Users\\whoami\\.gemini\\antigravity\\scratch\\discp\\dist\\index.js'],
  });

  const client = new Client(
    { name: 'server-architect', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('✅ Connected to Discp MCP server.');

  // Helper to call tools
  async function call(toolName, args) {
    const res = await client.callTool({ name: toolName, arguments: args });
    const text = res.content?.[0]?.text || '';
    return text;
  }

  // 1. Target Server & Customize Settings
  const guildId = '1555601495376793631';
  console.log(`\n[1/7] 🏰 Configuring server ${guildId} to "✦ Quantum Nexus ✦"...`);
  const renameRes = await call('modify_server_settings', {
    guildId,
    name: '✦ Quantum Nexus ✦',
    description: 'Premier hub for AI agents, developers, and autonomous systems.',
  });
  console.log('Server settings updated:', renameRes);

  // 2. Create Roles
  console.log('\n[2/7] 🎨 Creating structured roles & hierarchy...');
  const roles = [
    { name: '👑・Founder & Owner', color: '#F1C40F', hoist: true, perms: 'Administrator' },
    { name: '🛡️・Administrator', color: '#E74C3C', hoist: true, perms: 'Administrator' },
    { name: '⚔️・Moderator', color: '#3498DB', hoist: true, perms: 'KickMembers,BanMembers,ManageMessages,ModerateMembers' },
    { name: '💎・VIP Supporter', color: '#9B59B6', hoist: true, perms: 'SendMessages,AddReactions,AttachFiles' },
    { name: '🤖・Bot System', color: '#1ABC9C', hoist: true, perms: 'SendMessages,EmbedLinks' },
    { name: '🌟・Elite Member', color: '#2ECC71', hoist: false, perms: 'SendMessages,AddReactions' },
    { name: '👤・Community Member', color: '#95A5A6', hoist: false, perms: 'SendMessages,AddReactions' },
    { name: '🔇・Muted', color: '#4F545C', hoist: false, perms: '' },
  ];

  const roleMap = {};
  for (const r of roles) {
    const rRes = await call('create_role', {
      guildId,
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      permissionsNames: r.perms || undefined,
    });
    const rMatch = rRes.match(/ID: `(\d+)`/);
    if (rMatch) {
      roleMap[r.name] = rMatch[1];
      console.log(`  ✓ Created role ${r.name} (ID: ${rMatch[1]})`);
    } else {
      console.log(`  - ${rRes}`);
    }
  }

  // 3. Create Categories
  console.log('\n[3/7] 📂 Creating aesthetic categories with Unicode dividers...');
  const categoryNames = [
    '✦ ━━ INFORMATION ━━ ✦',
    '✦ ━━ COMMUNITY ━━ ✦',
    '✦ ━━ AI & CODE ━━ ✦',
    '✦ ━━ VOICE LOUNGES ━━ ✦',
    '✦ ━━ STAFF HEADQUARTERS ━━ ✦',
  ];

  const catMap = {};
  for (const catName of categoryNames) {
    const cRes = await call('create_category', { guildId, name: catName });
    const cMatch = cRes.match(/ID: `(\d+)`/);
    if (cMatch) {
      catMap[catName] = cMatch[1];
      console.log(`  ✓ Created category "${catName}" (ID: ${cMatch[1]})`);
    } else {
      console.log(`  - ${cRes}`);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  // 4. Create Channels under Categories
  console.log('\n[4/7] 💬 Creating channels under respective categories...');
  const channelDefs = [
    // Info
    { name: '📜┆rules-and-guidelines', type: 'text', cat: '✦ ━━ INFORMATION ━━ ✦', topic: 'Community rules, code of conduct, and terms' },
    { name: '📢┆announcements', type: 'text', cat: '✦ ━━ INFORMATION ━━ ✦', topic: 'Official server updates and milestones' },
    { name: '👋┆welcome-and-faq', type: 'text', cat: '✦ ━━ INFORMATION ━━ ✦', topic: 'Welcome hub, FAQs, and resources' },
    // Community
    { name: '💬┆general-chat', type: 'text', cat: '✦ ━━ COMMUNITY ━━ ✦', topic: 'Daily discussions and community hangout' },
    { name: '🤖┆bot-commands', type: 'text', cat: '✦ ━━ COMMUNITY ━━ ✦', topic: 'Run bot commands and automated workflows' },
    { name: '📸┆media-and-showcase', type: 'text', cat: '✦ ━━ COMMUNITY ━━ ✦', topic: 'Share screenshots, memes, and artwork' },
    // Tech & AI
    { name: '🧠┆ai-and-agents', type: 'text', cat: '✦ ━━ AI & CODE ━━ ✦', topic: 'LLMs, AI agents, MCP servers, and tooling' },
    { name: '💻┆code-discussions', type: 'text', cat: '✦ ━━ AI & CODE ━━ ✦', topic: 'Programming in TypeScript, Python, C++, and Rust' },
    // Voice
    { name: '🔊┆Chill Lounge', type: 'voice', cat: '✦ ━━ VOICE LOUNGES ━━ ✦', userLimit: 0 },
    { name: '🔊┆Pair Programming', type: 'voice', cat: '✦ ━━ VOICE LOUNGES ━━ ✦', userLimit: 5 },
    // Staff
    { name: '🔒┆staff-chat', type: 'text', cat: '✦ ━━ STAFF HEADQUARTERS ━━ ✦', topic: 'Private staff discussion and moderation decisions' },
    { name: '📋┆mod-logs', type: 'text', cat: '✦ ━━ STAFF HEADQUARTERS ━━ ✦', topic: 'Automated moderation logs and audit trails' },
  ];

  const chMap = {};
  for (const ch of channelDefs) {
    const parentId = catMap[ch.cat];
    let chRes = '';
    if (ch.type === 'voice') {
      chRes = await call('create_voice_channel', {
        guildId,
        name: ch.name,
        categoryId: parentId,
        userLimit: ch.userLimit,
      });
    } else {
      chRes = await call('create_text_channel', {
        guildId,
        name: ch.name,
        categoryId: parentId,
        topic: ch.topic,
      });
    }

    const match = chRes.match(/ID: `(\d+)`/);
    if (match) {
      chMap[ch.name] = match[1];
      console.log(`  ✓ Created #${ch.name} (ID: ${match[1]}) in [${ch.cat}]`);
    } else {
      console.log(`  - ${chRes}`);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  // 5. Configure Channel Permissions
  console.log('\n[5/7] 🔐 Configuring channel permission overwrites...');
  const rulesChId = chMap['📜┆rules-and-guidelines'];
  const announceChId = chMap['📢┆announcements'];
  const staffChId = chMap['🔒┆staff-chat'];
  const adminRoleId = roleMap['🛡️・Administrator'];
  const modRoleId = roleMap['⚔️・Moderator'];

  // @everyone role ID in any guild is equal to the guildId!
  const everyoneRoleId = guildId;

  // Lock down rules and announcements (read-only for @everyone)
  if (rulesChId) {
    const permRes = await call('upsert_role_channel_permissions', {
      channelId: rulesChId,
      roleId: everyoneRoleId,
      allowPermissions: 'ViewChannel,ReadMessageHistory',
      denyPermissions: 'SendMessages,AddReactions,CreatePublicThreads',
    });
    console.log(`  ✓ Set rules read-only for @everyone: ${permRes.slice(0, 60)}...`);
  }

  if (announceChId) {
    const permRes = await call('upsert_role_channel_permissions', {
      channelId: announceChId,
      roleId: everyoneRoleId,
      allowPermissions: 'ViewChannel,ReadMessageHistory',
      denyPermissions: 'SendMessages,CreatePublicThreads',
    });
    console.log(`  ✓ Set announcements read-only for @everyone: ${permRes.slice(0, 60)}...`);
  }

  // Lock staff chat (hidden from @everyone, visible to Admin & Mod)
  if (staffChId) {
    await call('upsert_role_channel_permissions', {
      channelId: staffChId,
      roleId: everyoneRoleId,
      denyPermissions: 'ViewChannel',
    });
    if (adminRoleId) {
      await call('upsert_role_channel_permissions', {
        channelId: staffChId,
        roleId: adminRoleId,
        allowPermissions: 'ViewChannel,SendMessages,ReadMessageHistory,AttachFiles',
      });
    }
    if (modRoleId) {
      await call('upsert_role_channel_permissions', {
        channelId: staffChId,
        roleId: modRoleId,
        allowPermissions: 'ViewChannel,SendMessages,ReadMessageHistory',
      });
    }
    console.log('  ✓ Staff channel locked down to Admin & Moderator roles.');
  }

  // 6. Post Content, Pin Messages, Create Poll, Create Thread
  console.log('\n[6/7] 📝 Posting welcome message, pinning announcement, creating poll & thread...');

  // Post Rules
  if (rulesChId) {
    await call('send_message', {
      channelId: rulesChId,
      message: [
        '# 📜 ✦ QUANTUM NEXUS — SERVER RULES ✦',
        '',
        'Welcome to **Quantum Nexus**! To maintain a respectful, inspiring environment, please observe these rules:',
        '',
        '**1. Respect Everyone** — No harassment, hate speech, sexism, or discrimination.',
        '**2. No Spam or Self-Promotion** — Keep promotion in designated channels only.',
        '**3. Use Appropriate Channels** — Post code in `💻┆code-discussions` and AI questions in `🧠┆ai-and-agents`.',
        '**4. Follow Discord Community Guidelines** — Standard Terms of Service apply at all times.',
        '',
        '⭐ *Enjoy your stay and build amazing things together!*',
      ].join('\n'),
    });
    console.log('  ✓ Rules message posted.');
  }

  // Post Announcement & PIN it
  if (announceChId) {
    const annMsg = await call('send_message', {
      channelId: announceChId,
      message: [
        '# 📢 ✦ GRAND OPENING: QUANTUM NEXUS ✦',
        '',
        'Welcome everyone to our brand new community hub built entirely via **Discp Discord MCP**!',
        '',
        '✨ **What to explore:**',
        '• Chat in `💬┆general-chat`',
        '• Explore agentic workflows in `🧠┆ai-and-agents`',
        '• Hop into voice in `🔊┆Chill Lounge`',
        '',
        'Stay tuned for community events, hackathons, and updates! 🚀',
      ].join('\n'),
    });
    console.log(`  ✓ Announcement posted: ${annMsg.slice(0, 70)}...`);

    const annMatch = annMsg.match(/ID: `(\d+)`/);
    if (annMatch) {
      const pinRes = await call('pin_message', {
        channelId: announceChId,
        messageId: annMatch[1],
      });
      console.log(`  ✓ Pinned announcement: ${pinRes}`);
    }
  }

  // Post Interactive Poll
  const generalChId = chMap['💬┆general-chat'];
  if (generalChId) {
    const pollRes = await call('create_poll', {
      channelId: generalChId,
      question: 'What is your primary AI / coding passion?',
      answersCsv: 'Agentic AI & MCP, Frontend & UI, Backend & Systems, Reverse Engineering & Security',
      durationHours: 72,
    });
    console.log(`  ✓ Created Poll: ${pollRes.slice(0, 80)}...`);
  }

  // Create Thread in AI channel
  const aiChId = chMap['🧠┆ai-and-agents'];
  if (aiChId) {
    const threadRes = await call('create_thread', {
      channelId: aiChId,
      name: '🤖 Discussion: Building Custom MCP Servers in 2026',
      autoArchiveDuration: '1440',
    });
    console.log(`  ✓ Created Thread: ${threadRes}`);
  }

  // 7. Verify Server Metrics
  console.log('\n[7/7] 📊 Querying complete server structure & metadata...');
  const finalInfo = await call('get_server_info', { guildId });
  console.log(finalInfo);

  const finalChannels = await call('list_channels', { guildId });
  console.log(finalChannels);

  const finalRoles = await call('list_roles', { guildId });
  console.log(finalRoles);

  console.log('\n===============================================================');
  console.log('🎉 COMPLETE AESTHETIC DISCORD SERVER SUCCESSFULLY BUILT & LIVE!');
  console.log(`👉 Server ID: ${guildId}`);
  console.log('===============================================================');

  await client.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal builder error:', err);
  process.exit(1);
});
