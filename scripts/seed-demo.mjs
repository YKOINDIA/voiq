import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envFile = path.join(process.cwd(), ".env.local");

if (existsSync(envFile)) {
  const contents = readFileSync(envFile, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, "$1");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const firstNames = [
  "Airi", "Yuna", "Mio", "Sora", "Ren", "Hina", "Kento", "Rio", "Noa", "Sara",
  "Itsuki", "Aoi", "Rin", "Yui", "Mina", "Toma", "Haru", "Nico", "Sena", "Mei"
];
const lastNames = [
  "Wave", "Echo", "Pulse", "Tone", "Drift", "Bloom", "Mellow", "Chord", "Smile", "Velvet"
];
const bios = [
  "深夜テンションの一言回答が得意です。",
  "かわいい声と変なテンポで返事します。",
  "低音寄りの匿名ボイスで答えます。",
  "モノマネと声遊びが好きです。",
  "聞き専にも優しいリアクション歓迎です。"
];
const topics = [
  "今いちばんハマってることは？",
  "眠れない夜ってどうしてる？",
  "好きな声の系統は？",
  "無人島に持っていくもの3つは？",
  "地元のおすすめを教えて。",
  "最近ちょっと嬉しかったことは？",
  "いちばん得意なモノマネは？",
  "緊張したときの対処法は？",
  "今夜のひとことください。",
  "匿名ボイスで告白して。"
];
const senderNames = ["匿名", "りん", "はる", "そら", "めい", "nana", "listener", "momo"];
const voiceModes = ["original", "high", "low", "robot", "telephone"];

function pick(list, indexSeed = Math.random()) {
  return list[Math.floor(indexSeed * list.length) % list.length];
}

function createUsername(index) {
  return `demo_${String(index + 1).padStart(3, "0")}`;
}

function createDisplayName(index) {
  return `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;
}

function createBio(index) {
  return bios[index % bios.length];
}

function createQuestion(index, recipientName) {
  return `${pick(topics, (index * 0.137) % 1)} ${recipientName} の声で聞きたいです。`;
}

function createWaveFileBuffer(durationSeconds = 2, frequency = 180) {
  const sampleRate = 24000;
  const sampleCount = sampleRate * durationSeconds;
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.min(1, i / 1200) * Math.min(1, (sampleCount - i) / 1200);
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.35 * envelope;
    view.setInt16(44 + i * 2, Math.round(sample * 0x7fff), true);
  }

  return Buffer.from(buffer);
}

async function listAllUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });

    if (error) {
      throw error;
    }

    users.push(...data.users);

    if (data.users.length < 100) {
      break;
    }

    page += 1;
  }

  return users;
}

async function ensureBucket() {
  const lookup = await supabase.storage.getBucket("voice-posts");

  if (lookup.error) {
    const createResult = await supabase.storage.createBucket("voice-posts", { public: true });

    if (createResult.error && !createResult.error.message.includes("already exists")) {
      throw createResult.error;
    }

    const updateResult = await supabase.storage.updateBucket("voice-posts", {
      public: true,
      allowedMimeTypes: ["audio/wav", "audio/webm", "audio/mp4", "audio/mpeg"],
      fileSizeLimit: 5242880
    });

    if (updateResult.error) {
      throw updateResult.error;
    }
    return;
  }

  const updateResult = await supabase.storage.updateBucket("voice-posts", {
    public: true,
    allowedMimeTypes: ["audio/wav", "audio/webm", "audio/mp4", "audio/mpeg"],
    fileSizeLimit: 5242880
  });

  if (updateResult.error) {
    throw updateResult.error;
  }
}

async function deleteExistingDemoUsers() {
  const users = await listAllUsers();
  const demoUsers = users.filter((user) => user.email?.endsWith("@demo.voiq.app"));

  for (const user of demoUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      throw error;
    }
  }
}

async function createDemoProfiles() {
  const created = [];

  for (let index = 0; index < 100; index += 1) {
    const email = `${createUsername(index)}@demo.voiq.app`;
    const password = `VoiqDemo!${String(index).padStart(3, "0")}`;
    const userResult = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: createDisplayName(index)
      }
    });

    if (userResult.error || !userResult.data.user) {
      throw userResult.error ?? new Error("Failed to create user");
    }

    const user = userResult.data.user;
    const profileUpdate = await supabase
      .from("profiles")
      .update({
        username: createUsername(index),
        display_name: createDisplayName(index),
        bio: createBio(index),
        is_premium: index < 15
      })
      .eq("id", user.id);

    if (profileUpdate.error) {
      throw profileUpdate.error;
    }

    created.push({
      id: user.id,
      username: createUsername(index),
      displayName: createDisplayName(index),
      isPremium: index < 15
    });
  }

  return created;
}

async function seedQuestionsAndVoicePosts(profiles) {
  const audioBuffers = [
    createWaveFileBuffer(2, 180),
    createWaveFileBuffer(2, 220),
    createWaveFileBuffer(2, 260)
  ];
  const questions = [];
  const voicePosts = [];
  const reactions = [];

  for (let index = 0; index < profiles.length; index += 1) {
    const recipient = profiles[index];
    const questionCount = 2 + (index % 4);

    for (let q = 0; q < questionCount; q += 1) {
      const questionId = randomUUID();
      const createdAt = new Date(Date.now() - (index * 11 + q) * 60 * 60 * 1000).toISOString();
      const answered = q !== questionCount - 1 || index < 60;
      const voiceMode =
        recipient.isPremium && q % 5 === 0 ? pick(voiceModes, (index + q) / 11) : pick(voiceModes.slice(0, 3), (index + q) / 9);
      const durationSeconds = recipient.isPremium ? 24 + (q % 20) : 6 + (q % 4);

      questions.push({
        id: questionId,
        recipient_id: recipient.id,
        content: createQuestion(index + q, recipient.displayName),
        sender_name: q % 2 === 0 ? null : pick(senderNames, (index + q) / 7),
        is_anonymous: q % 2 === 0,
        answered_at: answered ? createdAt : null,
        created_at: createdAt
      });

      if (!answered) {
        continue;
      }

      const postId = randomUUID();
      const path = `${recipient.id}/demo-${postId}.wav`;
      const upload = await supabase.storage
        .from("voice-posts")
        .upload(path, audioBuffers[(index + q) % audioBuffers.length], {
          contentType: "audio/wav",
          upsert: true
        });

      if (upload.error) {
        throw upload.error;
      }

      const createdPostAt = createdAt;
      voicePosts.push({
        id: postId,
        author_id: recipient.id,
        question_id: questionId,
        storage_path: path,
        duration_seconds: durationSeconds,
        voice_mode: voiceMode,
        expires_at: recipient.isPremium ? null : new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        created_at: createdPostAt
      });

      const reactionBurst = index < 10 ? 24 + q * 3 : index < 30 ? 10 + q * 2 : 2 + (q % 4);

      for (let r = 0; r < reactionBurst; r += 1) {
        reactions.push({
          id: randomUUID(),
          voice_post_id: postId,
          sound_type: ["clap", "laugh", "replay"][r % 3],
          created_at: createdPostAt
        });
      }
    }
  }

  return { questions, voicePosts, reactions };
}

async function seedFollows(profiles) {
  const follows = [];

  for (let index = 0; index < profiles.length; index += 1) {
    const target = profiles[index];
    const followCount = index < 10 ? 18 : index < 30 ? 9 : 3;

    for (let count = 0; count < followCount; count += 1) {
      const follower = profiles[(index + count + 7) % profiles.length];

      if (follower.id === target.id) {
        continue;
      }

      follows.push({
        follower_id: follower.id,
        following_id: target.id,
        created_at: new Date(Date.now() - (index + count) * 60 * 60 * 1000).toISOString()
      });
    }
  }

  const deduped = new Map();

  for (const follow of follows) {
    deduped.set(`${follow.follower_id}:${follow.following_id}`, follow);
  }

  return Array.from(deduped.values());
}

async function insertChunked(table, rows, size = 200) {
  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);
    const { error } = await supabase.from(table).insert(chunk);

    if (error) {
      throw error;
    }
  }
}

async function main() {
  console.log("Preparing demo seed...");
  await ensureBucket();
  await deleteExistingDemoUsers();

  const profiles = await createDemoProfiles();
  const { questions, voicePosts, reactions } = await seedQuestionsAndVoicePosts(profiles);
  const follows = await seedFollows(profiles);

  await insertChunked("questions", questions);
  await insertChunked("voice_posts", voicePosts);
  await insertChunked("reactions", reactions);
  await insertChunked("follows", follows);

  console.log(`Seed complete:
- demo users: ${profiles.length}
- questions: ${questions.length}
- voice posts: ${voicePosts.length}
- reactions: ${reactions.length}
- follows: ${follows.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
