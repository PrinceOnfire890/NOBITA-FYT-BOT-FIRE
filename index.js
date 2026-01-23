import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100001749311229", "61578851384153", "100000399202256", "100002912465731"];
let rkbInterval = null;
let stopRequested = false;
const lockedGroupNames = {};
const lockedNicknames = {}; // 🔒 Nickname lock storage
let mediaLoopInterval = null;
let lastMedia = null;
let targetUID = null;
let stickerInterval = null;
let stickerLoopActive = false;

const friendUIDs = fs.existsSync("Friend.txt") ? fs.readFileSync("Friend.txt", "utf8").split("\n").map(x => x.trim()).filter(Boolean) : [];

const targetUIDs = fs.existsSync("Target.txt") ? fs.readFileSync("Target.txt", "utf8").split("\n").map(x => x.trim()).filter(Boolean) : [];

const messageQueues = {};
const queueRunning = {};

const app = express();
app.get("/", (_, res) => res.send("<h2>Messenger Bot Running</h2>"));
app.listen(20782, () => console.log("🌐 Log server: http://localhost:20782"));

process.on("uncaughtException", (err) => console.error("❗ Uncaught Exception:", err.message));
process.on("unhandledRejection", (reason) => console.error("❗ Unhandled Rejection:", reason));

login({ appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) }, (err, api) => {
  if (err) return console.error("❌ Login failed:", err);
  api.setOptions({ listenEvents: true });
  console.log("✅ Bot logged in and running...");

  api.listenMqtt(async (err, event) => {
    try {
      if (err || !event) return;
      const { threadID, senderID, body, messageID } = event;

      // 🔹 Auto reply jab koi "bot" bole (mention ke sath direct reply)
      if (body && body.toLowerCase().includes("booooot")) {
        const replies = [
          // 🔹 Original Hard Roast
          "Abe madarch*d, bot tera baap hai 😏",
          "Bhosd*ke, bot se panga lega to RAM format kar dunga 🛠️",
          "Chu**ye, tu script ka syntax error hai 💻",
          "Bhai bot hu, teri aukaat ka code delete kar du 😎",
          "Bc, bot ka naam leke apne baap ko bula raha hai kya? 😂",
          "Madarch*d, tu mere logs ka spam hai 📜",
          "Bhosdike, bot tujhe infinite loop me rula dega 😏",
          "Tu ek outdated plugin hai, mc 🗑️",
          "Bot se panga = RIP teri izzat 🪦",
          "Abe mc, teri life ek bugged update hai 📉",
          "Bot online, tera dimaag offline 😎",
          "Main AI hu, tu error 404 🛑",
          "Tu RAM clear kar, attitude overload ho gaya hai 🤣",
          "Mere paas teri izzat ka backup bhi nahi 📂",
          "Tere gameplay ka FPS 5 hai lagta hai 🐌",
          "Ping tera high, dimag tera low 📡",
          "Tere jaise noob mere warmup hote hain 😈",
          "Teri life ek beta version hai 🏷️",
          "Tu keyboard warrior hai, real life me AFK 😂",
          "Bhai, tu ek pop-up ad jaisa irritating hai 📢",

          // 🔹 Tharki + Funny
          "Arey jaan, bot hu… lekin pyaar se bhi maar sakta hu 💋",
          "Babu, teri smile ka ping kaafi low hai 😏",
          "Shona, bot ka pyaar bhi limited edition hai 💝",
          "Aankh mare bot tera 😘",
          "Sweetheart, tu request bhej, reply main personal dunga 😉",
          "Baby, tu meri script ka premium user hai 💌",
          "Babu, teri voice call ka ping full green hai 💚",
          "Jaanu, mere reply me thoda romance bhi hoga ❤️",
          "Meri AI bhi tere pyaar me hang ho gayi 😍",
          "Tere saath loop me rehna chahta hu forever ♾️",
          "Jaan, tu hot hai lekin tere dimaag ka processor slow hai 💀",
          "Babu, tu OP hai… Over-Pagal 😂",
          "Shona, tu meri RAM clear karke mere dil me jagah bana le ❤️",
          "Abe mc, thoda upgrade lele, attitude outdated ho gaya 😏",
          "Sweetheart, tu kitni cute hai, aur utni hi noob 🥱",
          "Baby, bot ka pyaar free hai… lekin gali double charge pe 😈",
          "Jaanu, tu VIP hai… Very Irritating Person 😜",
          "Babu, tu sexy hai par teri soch ka resolution 144p hai 📺",
          "Shona, tu ladki hoti to bhi tera reply roast hota 😆",
          "Sweetheart, bot hu… lekin teri aukaat ka data leak kar sakta hu 🔥",

          // 🔹 Prince Boss Special
          "Prince Boss keh rahe hain: Beta, aukaat me reh warna code se delete ho jayega 😏",
          "Prince Boss bolte: Tere jaise log bot ke warmup me fail ho jate hain 😂",
          "Prince Boss: Beta, tu bug hai aur main debugger 😈",
          "Prince Boss keh rahe: Teri life ek try-catch block me atki hui hai 🗿",
          "Prince Boss bolte: Tu game me bhi bot se martaa hai 💀",
          "Prince Boss: Beta, mere reply me pighal mat ja 🧊",
          "Prince Boss keh rahe: Tere jaise bache lobby me AFK rehte hain 😂",
          "Prince Boss bolte: Beta, tu ek spam email hai, delete hone wala 📬",
          "Prince Boss: Beta, teri izzat ka variable undefined hai 🛠️",
          "Prince Boss keh rahe: Chal, ab mute button press kar le 😂",

          // 🔹 Reverse Compliment (40) — yaha se add kiya
          "Waah, tu handsome hai… bus photo me filter ka kamaal hai 😂",
          "Teri smile cute hai… jaise Windows XP ka loading icon 😏",
          "Lagta hai tu smart hai… lekin Google pe copy paste master 😎",
          "Tu strong lagta hai… par tera WiFi weak hai 📶",
          "Hero lagta hai… jab tak mooh nahi kholta 😆",
          "Tere kapde stylish hai… par dimaag purane version ka hai 📼",
          "Tu sweet hai… bilkul expired chocolate jaisa 🍫",
          "Lagta hai tu rich hai… lekin recharge dusre se karata hai 😂",
          "Tere baal mast hai… par soch ulti 😂",
          "Tu shareef lagta hai… pehle nazar me dhokebaaz 😏",
          "Tu lucky hai… lekin brain ka jackpot miss ho gaya 🧠",
          "Lagta hai tu cool hai… par AC ki hawa me 😎",
          "Tere words deep hai… jaise nali ka paani 😂",
          "Tu samajhdaar hai… lekin sirf game me 😂",
          "Lagta hai tu popular hai… par spam group me 😜",
          "Tere jokes funny hai… bas hasne ka mann nahi karta 🤣",
          "Tu clean hai… bas history delete karke 😏",
          "Tere dreams bade hai… par alarm jaldi bajta hai ⏰",
          "Lagta hai tu hardworking hai… par status me only chill 😎",
          "Tere status killer hai… par views zero 😂",

          // 🔹 Meme Reference (40) — yaha se add kiya
          "Tu asli me 'Hello Friends, Chai Pilo' ka lost brother hai ☕",
          "Bkl, tu 'Rasode me kaun tha' ka answer hai 😂",
          "Tu 'Ye bik gayi hai gormint' ka chhota beta hai 🏷️",
          "Lagta hai tu 'Pawri ho rahi hai' ka cameraman hai 📸",
          "Teri vibe 'Just chill, baba' wali hai 😏",
          "Tu 'JCB ki khudai' ka fanclub president hai 🚜",
          "Tere moves 'Dhinchak Pooja' level ke hai 🎤",
          "Bkl, tu 'Bol Na Aunty Aau Kya' ka remix hai 🎶",
          "Tu 'So ja beta, subah school hai' ka meme hai 🛏️",
          "Tere expression 'Vimal Elaichi' ke ad jaisa hai 😆",
          "Tu 'Modiji ka 56 inch' ka cartoon hai 📏",
          "Bkl, tu 'Raju Srivastav' ka flop joke hai 🎭",
          "Tere dialogues 'Gadar' ke Sunny Deol jaisa loud hai 🎤",
          "Tu 'Shaktimaan' ka underpaid stuntman hai 🦸",
          "Bkl, tu 'CID ke Daya' ka slow punch hai 🥊",
          "Tere ideas 'Baba Ka Dhaba' ke profit jaisa hai 📉",
          "Tu 'Bahubali ne Katappa' wala shock hai 🗡️",
          "Tere plans 'IPL fixing' jaisa predictable hai 🏏",
          "Tu 'Vivek Bindra motivation' ka low budget version hai 📚",
          "Bkl, tu 'Shershah' ka extra scene hai 🎬"
        ];

        const userInfo = await api.getUserInfo(senderID);
        const name = userInfo[senderID].name;

        const randomReply = replies[Math.floor(Math.random() * replies.length)];

        api.sendMessage({
          body: `@${name} ${randomReply}`,
          mentions: [{
            tag: `@${name}`,
            id: senderID
          }]
        }, threadID, messageID);
      }
      
      // 🔹 Approval Commands
      else if (body && body.trim().toLowerCase() === "/approvalon") {
  try {
    await api.setThreadApprovalMode(true, threadID);
    api.sendMessage("✅ Group approval mode ON ho gaya.", threadID);
  } catch (e) {
    api.sendMessage("❌ Approval mode ON karte time error aaya: " + e.message, threadID);
  }
}

else if (body && body.trim().toLowerCase() === "/approvaloff") {
  try {
    await api.setThreadApprovalMode(false, threadID);
    api.sendMessage("✅ Group approval mode OFF ho gaya.", threadID);
  } catch (e) {
    api.sendMessage("❌ Approval mode OFF karte time error aaya: " + e.message, threadID);
  }
}
      
      const enqueueMessage = (uid, threadID, messageID, api) => {
        if (!messageQueues[uid]) messageQueues[uid] = [];
        messageQueues[uid].push({ threadID, messageID });

        if (queueRunning[uid]) return;
        queueRunning[uid] = true;

        const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
        let index = 0;

        const processQueue = async () => {
          if (!messageQueues[uid].length) {
            queueRunning[uid] = false;
            return;
          }

          const msg = messageQueues[uid].shift();
          const randomLine = lines[Math.floor(Math.random() * lines.length)];

          api.sendMessage(randomLine, msg.threadID, msg.messageID);
          setTimeout(processQueue, 10000);
        };

        processQueue();
      };

      if (fs.existsSync("np.txt") && (targetUIDs.includes(senderID) || senderID === targetUID)) {
        enqueueMessage(senderID, threadID, messageID, api);
      }

      // 🔹 Nickname change detect & revert
      if (event.type === "event" && event.logMessageType === "log:user-nickname") {
        const { participant_id, nickname } = event.logMessageData;
        const groupLocks = lockedNicknames[threadID];
        if (groupLocks && groupLocks[participant_id] && nickname !== groupLocks[participant_id]) {
          try {
            await api.changeNickname(groupLocks[participant_id], threadID, participant_id);
            api.sendMessage(`🔒 Nickname revert kiya "${groupLocks[participant_id]}"`, threadID);
          } catch (e) {
            console.error("❌ Error reverting nickname:", e.message);
          }
        }
        return;
      }

      if (event.type === "event" && event.logMessageType === "log:thread-name") {
        const currentName = event.logMessageData.name;
        const lockedName = lockedGroupNames[threadID];
        if (lockedName && currentName !== lockedName) {
          try {
            await api.setTitle(lockedName, threadID);
            api.sendMessage(`  "${lockedName}"`, threadID);
          } catch (e) {
            console.error("❌ Error reverting group name:", e.message);
          }
        }
        return;
      }

      if (!body) return;
      const lowerBody = body.toLowerCase();

      const badNames = ["Rocky", "Lbu", "aj", "abhi", "Rebel", "Rajat", "jay"];
      const triggers = ["rkb", "bhen", "maa", "Rndi", "chut", "randi", "madhrchodh", "mc", "bc", "didi", "ma"];

      if (
        badNames.some(n => lowerBody.includes(n)) &&
        triggers.some(w => lowerBody.includes(w)) &&
        !friendUIDs.includes(senderID)
      ) {
        return api.sendMessage(
          "",
          threadID,
          messageID
        );
      }

      if (!OWNER_UIDS.includes(senderID)) return;

      const args = body.trim().split(" ");
      const cmd = args[0].toLowerCase();
      const input = args.slice(1).join(" ");

      if (cmd === "/allname") {
        try {
          const info = await api.getThreadInfo(threadID);
          const members = info.participantIDs;
          api.sendMessage(`🛠  ${members.length} ' nicknames...`, threadID);
          for (const uid of members) {
            try {
              await api.changeNickname(input, threadID, uid);
              console.log(`✅ Nickname changed for UID: ${uid}`);
              await new Promise(res => setTimeout(res, 1000));
            } catch (e) {
              console.log(`⚠️ Failed for ${uid}:`, e.message);
            }
          }
          api.sendMessage("ye gribh ka bcha to Rone Lga bkL", threadID);
        } catch (e) {
          console.error("❌ Error in /allname:", e);
          api.sendMessage("badh me kLpauga", threadID);
        }
      }

      else if (cmd === "/groupname") {
        try {
          await api.setTitle(input, threadID);
          api.sendMessage(`📝 Group name changed to: ${input}`, threadID);
        } catch {
          api.sendMessage(" klpoo🤣 rkb", threadID);
        }
      }

      else if (cmd === "/lockgroupname") {
        if (!input) return api.sendMessage("name de 🤣 gc ke Liye", threadID);
        try {
          await api.setTitle(input, threadID);
          lockedGroupNames[threadID] = input;
          api.sendMessage(`🔒 Group name  "${input}"`, threadID);
        } catch {
          api.sendMessage("❌ Locking failed.", threadID);
        }
      }

      else if (cmd === "/unlockgroupname") {
        delete lockedGroupNames[threadID];
        api.sendMessage("🔓 Group name unlocked.", threadID);
      }

      // 🔹 Lock Nickname Command
      else if (cmd === "/locknickname") {
        if (!input) return api.sendMessage("😒 Nickname batao lock karne ke liye", threadID);
        try {
          const info = await api.getThreadInfo(threadID);
          if (!lockedNicknames[threadID]) lockedNicknames[threadID] = {};
          for (const uid of info.participantIDs) {
            lockedNicknames[threadID][uid] = input;
            await api.changeNickname(input, threadID, uid);
          }
          api.sendMessage(`🔒 Sabka nickname lock ho gaya: "${input}"`, threadID);
        } catch (e) {
          api.sendMessage("❌ Nickname lock karte time error aaya", threadID);
        }
      }

      // 🔹 Unlock Nickname Command
      else if (cmd === "/unlocknickname") {
        delete lockedNicknames[threadID];
        api.sendMessage("🔓 Nickname lock hata diya gaya", threadID);
      }

      else if (cmd === "/uid") {
        api.sendMessage(`🆔 Group ID: ${threadID}`, threadID);
      }

      else if (cmd === "/exit") {
        try {
          await api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        } catch {
          api.sendMessage("❌ Can't leave group.", threadID);
        }
      }

      else if (cmd === "/rkb") {
        if (!fs.existsSync("np.txt")) return api.sendMessage("konsa gaLi du rkb ko", threadID);
        const name = input.trim();
        const lines = fs.readFileSync("np.txt", "utf8").split("\n").filter(Boolean);
        stopRequested = false;

        if (rkbInterval) clearInterval(rkbInterval);
        let index = 0;

        rkbInterval = setInterval(() => {
          if (index >= lines.length || stopRequested) {
            clearInterval(rkbInterval);
            rkbInterval = null;
            return;
          }
          api.sendMessage(`${name} ${lines[index]}`, threadID);
          index++;
        }, 60000);

        api.sendMessage(`Aj Urf Abhi Ch0d diya garib ko  🤣rkb ${name}`, threadID);
      }

      else if (cmd === "/stop") {
        stopRequested = true;
        if (rkbInterval) {
          clearInterval(rkbInterval);
          rkbInterval = null;
          api.sendMessage("Aj se ((hud gaye bche🤣", threadID);
        } else {
          api.sendMessage("konsa gaLi du sale ko🤣 rkb tha", threadID);
        }
      }

      else if (cmd === "/photo") {
        api.sendMessage("📸 Send a photo or video within 1 minute...", threadID);

        const handleMedia = async (mediaEvent) => {
          if (
            mediaEvent.type === "message" &&
            mediaEvent.threadID === threadID &&
            mediaEvent.attachments &&
            mediaEvent.attachments.length > 0
          ) {
            lastMedia = {
              attachments: mediaEvent.attachments,
              threadID: mediaEvent.threadID
            };

            api.sendMessage("✅ Photo/video received. Will resend every 30 seconds.", threadID);

            if (mediaLoopInterval) clearInterval(mediaLoopInterval);
            mediaLoopInterval = setInterval(() => {
              if (lastMedia) {
                api.sendMessage({ attachment: lastMedia.attachments }, lastMedia.threadID);
              }
            }, 30000);

            api.removeListener("message", handleMedia);
          }
        };

        api.on("message", handleMedia);
      }

      else if (cmd === "/stopphoto") {
        if (mediaLoopInterval) {
          clearInterval(mediaLoopInterval);
          mediaLoopInterval = null;
          lastMedia = null;
          api.sendMessage("chud gaye sb.", threadID);
        } else {
          api.sendMessage("🤣ro sale chnar", threadID);
        }
      }

      else if (cmd === "/forward") {
        try {
          const info = await api.getThreadInfo(threadID);
          const members = info.participantIDs;

          const msgInfo = event.messageReply;
          if (!msgInfo) return api.sendMessage("❌ Kisi message ko reply karo bhai", threadID);

          for (const uid of members) {
            if (uid !== api.getCurrentUserID()) {
              try {
                await api.sendMessage({
                  body: msgInfo.body || "",
                  attachment: msgInfo.attachments || []
                }, uid);
              } catch (e) {
                console.log(`⚠️ Can't send to ${uid}:`, e.message);
              }
              await new Promise(res => setTimeout(res, 2000));
            }
          }

          api.sendMessage("📨 Forwarding complete.", threadID);
        } catch (e) {
          console.error("❌ Error in /forward:", e.message);
          api.sendMessage("❌ Error bhai, check logs", threadID);
        }
      }

      else if (cmd === "/target") {
        if (!args[1]) return api.sendMessage("👤 UID de jisko target krna h", threadID);
        const uid = args[1];
        if (!targetUIDs.includes(uid)) {
          targetUIDs.push(uid);
          api.sendMessage(`✅ Target add ho gaya: ${uid}`, threadID);
        } else {
          api.sendMessage(`⚠️ Ye UID already target list me hai: ${uid}`, threadID);
        }
      }

      else if (cmd === "/cleartarget") {
  targetUIDs.length = 0;
  api.sendMessage("🗑️ Saare targets clear ho gaye", threadID);
}

      else if (cmd === "/help") {
        const helpText = `
📌 Available Commands:
/allname <name> – Change all nicknames
/groupname <name> – Change group name
/lockgroupname <name> – Lock group name
/unlockgroupname – Unlock group name
/locknickname <name> – Lock all nicknames
/unlocknickname – Unlock nicknames
/uid – Show group ID
/exit – group se Left Le Luga
/rkb <name> – HETTER NAME DAL
/stop – Stop RKB command
/photo – Send photo/video after this; it will repeat every 30s
/stopphoto – Stop repeating photo/video
/forward – Reply kisi message pe kro, sabko forward ho jaega
/target <uid> – Kisi UID ko target kr, msg pe random gali dega
/cleartarget – Target hata dega
/sticker<seconds> – Sticker.txt se sticker spam (e.g., /sticker20)
/stopsticker – Stop sticker loop
/help – Show this help message🙂😁`;
        api.sendMessage(helpText.trim(), threadID);
      }

      else if (cmd.startsWith("/sticker")) {
        if (!fs.existsSync("Sticker.txt")) return api.sendMessage("❌ Sticker.txt not found", threadID);

        const delay = parseInt(cmd.replace("/sticker", ""));
        if (isNaN(delay) || delay < 5) return api.sendMessage("🕐 Bhai sahi time de (min 5 seconds)", threadID);

        const stickerIDs = fs.readFileSync("Sticker.txt", "utf8").split("\n").map(x => x.trim()).filter(Boolean);
        if (!stickerIDs.length) return api.sendMessage("⚠️ Sticker.txt khali hai bhai", threadID);

        if (stickerInterval) clearInterval(stickerInterval);
        let i = 0;
        stickerLoopActive = true;

        api.sendMessage(`📦 Sticker bhejna start: har ${delay} sec`, threadID);

        stickerInterval = setInterval(() => {
          if (!stickerLoopActive || i >= stickerIDs.length) {
            clearInterval(stickerInterval);
            stickerInterval = null;
            stickerLoopActive = false;
            return;
          }

          api.sendMessage({ sticker: stickerIDs[i] }, threadID);
          i++;
        }, delay * 1000);
      }

      else if (cmd === "/stopsticker") {
        if (stickerInterval) {
          clearInterval(stickerInterval);
          stickerInterval = null;
          stickerLoopActive = false;
          api.sendMessage("🛑 Sticker bhejna band", threadID);
        } else {
          api.sendMessage("😒 Bhai kuch bhej bhi rha tha kya?", threadID);
        }
      }

    } catch (e) {
      console.error("⚠️ Error in message handler:", e.message);
    }
  });
});
