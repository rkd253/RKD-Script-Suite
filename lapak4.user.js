// ==UserScript==
// @name         LAPAK4 - Manga Theme (Booster Pack)
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Manga-style livechat theme - enhanced with paper texture, speed lines, and SFX
// @author       Antigravity
// @match        https://my.livechatinc.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=livechatinc.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // --- Inject AoT text background ---
  const aotBackground = document.createElement("div");
  aotBackground.textContent = `The World and the Fall of Wall Maria. Humanity is trapped inside three enormous walls—Maria, Rose, and Sheena—to protect themselves from Titans... Military Training and Trost District. Three years later, the trio joins the military... Female Titan and Annie Leonhart. Clash of the Titans. Return to Shiganshina and the Truth of the World. Marley Arc. War for Paradis. Final Battle and Resolution.`;

  Object.assign(aotBackground.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    fontFamily: "monospace",
    fontSize: "12px",
    lineHeight: "18px",
    color: "rgba(49,49,53,0.08)", // subtle #313135
    whiteSpace: "pre-wrap",
    pointerEvents: "none",
    overflow: "hidden",
    zIndex: "0", // behind chat
    textAlign: "justify",
    backgroundRepeat: "repeat",
    backgroundColor: "#202024",
    padding: "10px",
  });
  document.body.appendChild(aotBackground);

  // --- Inject custom CSS ---
  const style = document.createElement("style");
  style.textContent = `
:root {
  --manga-white: #ffffff;
  --manga-black: #000000;
}
.lc-dark-theme {
    --content-basic-primary: #ffffff;
    --surface-other-visitor: #5f2820;
     --surface-other-agent: #403122;
}
html {
    filter: brightness(1.1); /* 1 is normal, >1 is brighter, <1 is darker */
}

.css-1uzymqq .answer {
    color: white;
}
.css-1tp6ln9 {
    color: white;
}
.css-1gitda {
    outline: none;
    padding: 16px 16px 0px;
    height: auto;
    min-height: 48px;
    position: relative;
    overflow: auto;
    color: white !important;
}
.css-i1m9wv {
    z-index: 1;
}
.css-ow17zx [class^="lc-"], .css-ow17zx [class^="lc-"]::after, .css-ow17zx [class^="lc-"]::before {
    color: white;
}
.css-ao3ftx{
color: white;
}
/* Base layout */
.your-parent-class {
  display: flex !important;
  width: 100vw !important;
  max-width: 100vw !important;
  box-sizing: border-box !important;
  padding: 0 !important;
  margin: 0 !important;
  flex-direction: row !important;
  overflow-x: hidden !important;
}

.css-1cmlcj3, .css-1orfco2 {
  flex: 0 0 286px !important;
  max-width: 286px !important;
  min-width: 286px !important;
  background: transparent !important;
}

/* Halftone dots */
.halftone-bg {
  background-image: radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px);
  background-size: 6px 6px;
}

/* Scrollbar with rocket */
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar { width: 30px; background: transparent; }
::-webkit-scrollbar-thumb {
  background: url('https://i.imgur.com/y9TIZT5.gif') no-repeat center center;
  background-size: contain;
  border: none;
  box-shadow: none;
}

.css-1w1hkr0 {
  position: relative; /* parent needs positioning for pseudo-element */
  z-index: 0;         /* keep normal stacking for content */
}
.css-1jx6jyw {
    background-color: transparent;
}

.css-1w1hkr0::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('https://i.imgur.com/wvwE8GQ.png');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 2;              /* above child divs */
  pointer-events: none;     /* clicks pass through */

}
iframe[src*="google.com/maps"] {
    display: none !important;
}
.css-ncqwun {
    display: flex;
    flex-direction: column;
    -webkit-box-align: center;
    align-items: center;
    padding: 0 var(--spacing-6);
    display: none;
}
.css-1ujqw2c {
    margin-top: 100px;
}
.css-14zdrhp,
.css-1qjky5r{
z-index:2;
    color: white;
    font-weight: bold;
    backdrop-filter: blur(1px);
}


.css-1l83s7m {
display:none;
}
.css-111ot1s{
background:transparent
}

/* Unreplied highlight - manga panel box */
.unreplied-highlight {
  background: #5f2820;
  border: 3px solid var(--manga-black) !important;
  border-radius: 4px;
  box-shadow: 3px 3px 0 var(--manga-black);
  color : black !important;
}

[data-testid="last-message-text"] {
    background: #5b5b5b;
    border: 3px solid black;
    border-radius: 16px;
    padding: 4px 8px;
    font-family: "Comic Sans MS", sans-serif;
    display: inline-block;
}

/* Manual highlight - JoJo style */
.manual-highlight {
  border: 3px dashed var(--manga-black);
  border-radius: 8px;
  box-shadow: 0 0 0 4px var(--manga-white), 6px 6px 0 var(--manga-black);
  position: relative;
  background: #8c8c8c;
}
.manual-highlight::before {
  content: "戦え";
  position: absolute;
  top: 10px;
  left: -16px;
  font-size: 24px;
  font-weight: 500;
  font-family: 'Comic Sans MS', sans-serif;
  color: #000;
  border: 2px solid black;
  background: rgba(255,255,255,0.9);
  text-shadow: 1px 1px 0px black;
  transform: rotate(-25deg);
  animation: shake-gogogo 0.1s infinite alternate;
  z-index: 99;
  padding: 8px 12px;
  box-sizing: border-box;
}


@keyframes shake-gogogo {
  0%   { transform: rotate(-25deg) translate(0px, 0px); }
  50%  { transform: rotate(-23deg) translate(1px, -1px); }
  100% { transform: rotate(-27deg) translate(-1px, 1px); }
}

/* Focused chat - speed lines */
.focused-custom {
  border: 3px solid var(--manga-black);
  border-radius: 8px;
  box-shadow: 6px 6px 0 var(--manga-white), 12px 12px 0 var(--manga-black);
  background-image: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 4px,
    rgba(0,0,0,1) 4px,
    rgba(0,0,0,1) 5px
  );
   ;
}

.focused-custom {
  position: relative;
  overflow: hidden;
  animation: focused-pop 0.4s ease-out;
  border-radius: 8px;
  border: 3px solid black;
}

/* add the GIF flash */
.focused-custom::before {
  content: "";
  position: absolute;
  top: -10%;
  left: -10%;
  width: 120%;
  height: 120%;
  background: url("https://i.imgur.com/y1ChEtA.gif") center/cover no-repeat;
  opacity: 0;
  transform: scale(1);
  pointer-events: none;
  border-radius: 8px;
  z-index: 0;
  animation: focused-gif-flash 1.5s ease-out;
}

/* subtle pop animation */
@keyframes focused-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.04) translateY(-2px); }
  100% { transform: scale(1) translateY(0); }
}

/* gif flash animation */
@keyframes focused-gif-flash {
  0%   { opacity: 0; transform: scale(0.9); }
  40%  { opacity: 0.4; transform: scale(1.05); }
  100% { opacity: 0; transform: scale(1.2); }
}

.lc-Avatar-module__avatar___5-kP8.lc-Avatar-module__avatar--circle___Ys84D.lc-Avatar-module__avatar--medium___un4U9.css-t0392m.privacy-masker {
    border: 3px solid #000;
    box-sizing: border-box;
}

/* Speech bubble style for last messages */
[data-testid="last-message-text"] {
  background: rgb(83 79 79);
  border: 3px solid black;
  border-radius: 16px;
  padding: 4px 8px;
  font-family: "Comic Sans MS", sans-serif;
  display: inline-block;
}

/* Tag */
.pengecekan-tag {
  background: white;
  color: black;
  font-weight: bold;
  font-size: 12px;
  border-radius: 4px;
  padding: 2px 6px;
  margin-left: 8px;
  border: 2px solid black;
}
.lc-SideNavigation-module__side-navigation__nav-wrapper--no-gaps___1ApnT {
    gap: 0;
    z-index: 1;
}
/* Make details cards transparent */
.lc-DetailsCard-module__details-card___v-Avc {
    background-color: transparent !important;
    box-shadow: none !important;
}

/* Remove extra spacing if needed */
.lc-DetailsCard-module__details-card__content___aJux3 {
    padding: 0 !important;
}
/* left side */
.css-9oh56r {
    overflow-y: auto;
    -webkit-box-flex: 1;
    flex-grow: 1;
    background-color: #20202400;
}
.css-gd0tl8 {
    background-color: #20202400;
}
.css-1rx2rn9 {
    background: #6e6e87;
    color: #ffffff;
}

/* Death Note / Manga style navigation */
.lc-Navigation-module__navigation___oNBOL.css-zutgt1 {
  background: radial-gradient(circle at top left, #111 0%, #000 80%);
  border-right: 2px solid #222;
  box-shadow: inset -5px 0 10px rgba(255, 255, 255, 0.05);
  color: #f5f5f5;
  font-family: "Special Elite", "Courier New", monospace;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
  background-image: url("https://i.imgur.com/wIkYfRF.png"); /* subtle manga paper texture */
  background-blend-mode: multiply;
  background-size: cover;
}
  `;
  document.head.appendChild(style);
// Create a fixed background div
const bg = document.createElement("div");
Object.assign(bg.style, {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "#202024",
  color: "#313135",
  fontFamily: "monospace",
  fontSize: "12px",
  lineHeight: "18px",
  overflow: "hidden",
  whiteSpace: "pre",
  padding: "0",
  pointerEvents: "none",
  zIndex: "0", // stays at very back
});



// Fill it with the full AoT story
const storyText = `The wind howled through the shattered remnants of Wall Maria, carrying with it the bitter scent of smoke, dust, and the metallic tang of blood. The sun, dimmed by a canopy of clouds heavy with ash, cast a gray pall over the landscape, where the ruined villages lay strewn with the remnants of what had once been thriving human life. Titans, colossal and mindless, roamed the lands beyond, their hulking forms silhouetted against the ruined horizon. Each step they took shook the ground, and the cries of the dying echoed like a twisted symphony of despair.
Eren Yeager tightened the straps of his maneuver gear as he surveyed the devastation from atop a crumbling wall. His heart hammered, not from fear, but from a mixture of rage and determination. He had promised himself that humanity would not fall again, that the horrors he had witnessed as a child—the destruction of his home, the death of his mother—would never repeat. He could feel it in his bones: the Titans were not merely monsters to be slain; they were the embodiment of a world that had forsaken humanity, a challenge to be overcome at any cost.
Beside him, Mikasa Ackerman adjusted her scarf, her piercing eyes scanning the horizon with unwavering focus. Silent and deadly, she was the shield that protected those she loved, a force that moved with preternatural precision. Armin Arlert, though smaller and less physically imposing, clutched his notebooks tightly, his mind constantly turning over strategies and contingencies. Each of them bore the weight of survival, the heavy burden of responsibility, and the shared history that had forged their unbreakable bond.
A sudden tremor reverberated through the air, and the colossal form of the Armored Titan appeared, smashing through the remains of the wall with terrifying inevitability. Soldiers screamed and scattered, their shouts lost amid the chaos. Eren’s fists clenched; his body surged with adrenaline as the transformation began. Bones cracked, muscles shifted, and the familiar, painful surge of power coursed through him. In moments, he became the very weapon humanity had needed, towering above the battlefield, fists ready to collide with the armored behemoth that threatened all they had fought to protect.
The clash was cataclysmic. Steel met flesh with sickening thuds, and the ground quaked under the impact of titanic blows. Each strike Eren delivered carried not only the fury of a survivor but the unyielding hope of an entire people. The Armored Titan countered with equal force, relentless and strategic, a mirror of Eren’s own determination but devoid of humanity. Sparks flew from bone against hardened armor, and dust clouds swallowed the combatants in a haze of chaos.
Below, soldiers of the Scout Regiment navigated the battlefield with breathtaking skill, their ODM gear allowing them to dart between ruins and trees, striking Titans with blades honed to lethal precision. Jean Kirstein led a squad, his voice cutting through the smoke as he coordinated attacks and rescued those trapped in the wreckage. Connie Springer moved with a mixture of fear and courage, dodging grasping hands and swinging past danger with the fluidity of someone who had grown up under the shadow of death. Humanity fought not with the power of Titans, but with ingenuity, bravery, and an unshakable will.
Amid the carnage, a new revelation shook them. Titans, once thought mindless, began showing signs of cunning and malice, hinting at the intelligence that had always lurked behind their monstrous forms. Eren sensed it, a gnawing doubt in his mind: the line between human and Titan had always been more blurred than anyone admitted. Every punch, every battle, was a struggle not only for survival but for understanding the true nature of their enemies and, perhaps, themselves.
Night fell, draping the battlefield in darkness and forcing reliance on instinct over sight. Fires burned in scattered pockets, casting flickering shadows over the carnage. In the quiet moments between skirmishes, Armin whispered strategies, piecing together patterns in the enemy’s movements. Mikasa stood vigil over Eren, her sharp senses detecting the faintest vibrations of approaching Titans. Together, they survived, clinging to the fragile thread of hope that still bound humanity together.
Days stretched into weeks, and the struggle continued relentlessly. Humanity’s resolve was tested with every loss, every breach of their walls, every revelation of Titans in the ranks of those they had called allies. Trust became a precious commodity, betrayal a constant threat. Yet amid despair, a spark of rebellion burned bright. Scouts uncovered secrets hidden for generations—ancient tomes, maps, and hints of a power that might shift the balance of the war. Knowledge, they realized, could be as lethal as any blade or Titan transformation.
Eren’s power grew with each battle, yet so did the darkness within him. The line between vengeance and justice blurred, his rage feeding the very monster he sought to control. Mikasa’s loyalty was unwavering, her discipline a guiding force, and Armin’s intellect offered a beacon of strategy amidst chaos. Together, they became a symbol of defiance, a glimmer of hope that humanity might endure even in the face of overwhelming odds.
Then came the revelation: Titans were not the ultimate enemy. The true battle lay in understanding the world beyond the walls, the forces that had shaped both Titans and humans into the pawns of fate. This knowledge came at a cost, revealing truths that shook the foundations of their beliefs and forced them to confront moral dilemmas they had never imagined. Every decision carried weight, every action rippled through the fragile fabric of their society, and the price of survival became entwined with the price of humanity itself.
The final confrontation approached, a culmination of years of struggle, sacrifice, and revelation. Titans clashed with soldiers, humans faced enemies that mirrored their own strength, and alliances shifted as secrets came to light. Eren, Mikasa, and Armin stood at the forefront, embodiments of the human spirit and the complexities of morality in a world governed by fear and power. Each blow, each strategy, each choice was a testament to the resilience and ingenuity of those who refused to yield.
In the end, the battlefield grew silent, marked only by the smoke of burned villages and the faint whispers of those who had fallen. Titans lay defeated, and humanity, battered and scarred, endured. Yet the world had changed irrevocably. Walls had fallen, both literal and metaphorical, and with them came knowledge, freedom, and a new responsibility. The survivors looked to the horizon, knowing the war was not truly over, but that hope, fragile yet persistent, could guide them through the darkness.
Eren gazed at the distant sun, now breaking through the clouds, casting golden light upon the ruins. Mikasa remained at his side, her hand brushing against his, a silent promise of unwavering loyalty. Armin stood slightly apart, eyes fixed on the horizon, already calculating the next steps, the next strategies, the next challenges that awaited. Together, they embodied humanity’s enduring spirit—the courage to face fear, the intelligence to overcome the unknown, and the hope to rebuild what had been lost. The story of Titans and humans, of fear and resilience, of loss and defiance, would continue, etched forever into the memories of those who survived and the legacy they would leave behind.`;

// Append div to body
document.body.appendChild(bg);

// Function to fill the div with repeated story
function fillStory() {
    let repeatedText = '';
    bg.textContent = ''; // clear first

    // Keep appending until scrollHeight exceeds clientHeight
    while (bg.scrollHeight <= bg.clientHeight) {
        repeatedText += storyText + ' ';
        bg.textContent = repeatedText;
    }
}

// Initial fill
fillStory();

// Optional: refill if window is resized
window.addEventListener('resize', fillStory);


// --- Memory images ---
const memoryImages = [
  { src: "https://i.imgur.com/aEk0pZt.png", top: "13%", left: "55%" },
  { src: "https://i.imgur.com/PWgWDHe.jpeg", top: "15%", left: "44%" },
  { src: "https://i.imgur.com/8RMtbiS.jpeg", top: "33%", left: "37%" },
  { src: "https://i.imgur.com/4tqtynP.png", top: "31%", left: "55%" },
  { src: "https://i.imgur.com/BeNsmLX.jpeg", top: "48%", left: "53%" },
  { src: "https://i.imgur.com/gQzqP6Q.jpeg", top: "51%", left: "37%" },
  { src: "https://i.imgur.com/86l0swg.jpeg", top: "68%", left: "31%" },
  { src: "https://i.imgur.com/3UA4UJQ.png", top: "65%", left: "55%" },
  { src: "https://i.imgur.com/El3dZDH.jpeg", top: "82%", left: "55%" },
  { src: "https://i.imgur.com/w3KcKxc.png", top: "85%", left: "31%" },
  { src: "https://i.imgur.com/KfTwUkp.png", top: "60%", left: "5%" },
];

function placeMemoriesFixed() {
  memoryImages.forEach(imgData => {
    const img = document.createElement("img");
    img.src = imgData.src;

    Object.assign(img.style, {
      position: "fixed",
      top: imgData.top,
      left: imgData.left,
      width: "200px",
      height: "auto",
      filter: "brightness(0.3) blur(1px)",
      opacity: 0.6,
      zIndex: 0,
      pointerEvents: "none"
    });

    document.body.appendChild(img);
  });
}

placeMemoriesFixed();

    // --- Original logic ---
    let currentFocusEl = null;
    const manualMarkedChats = new Map();

    function clearFocus() {
        if (currentFocusEl) {
            currentFocusEl.classList.remove("focused-custom");
            currentFocusEl = null;
        }
    }
    function setFocus(el) {
        if (el && el !== currentFocusEl) {
            clearFocus();
            currentFocusEl = el;
            el.classList.add("focused-custom");
        }
    }
    function scrollAndFocus(el) {
        if (!el) return;
        setFocus(el);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const menuBtn = el.querySelector('[data-testid="chat-menu-trigger-button"]');
        if (menuBtn) menuBtn.click();
        el.click();
    }
    function updatePengecekanTag(el, id) {
        const visitorName = el.querySelector('p[data-testid="visitor-name"]');
        if (!visitorName) return;
        let tag = el.querySelector(".pengecekan-tag");
        if (manualMarkedChats.has(id)) {
            if (!tag) {
                tag = document.createElement("span");
                tag.className = "pengecekan-tag";
                tag.textContent = "Pengecekan";
                visitorName.after(tag);
            }
        } else if (tag) tag.remove();
    }
    function checkChats() {
        const chats = Array.from(document.querySelectorAll('[data-testid^="chat-item-"]'));
        chats.forEach((chat) => {
            const id = chat.getAttribute("data-testid");
            if (!id) return;

            const lastMsgText = chat.querySelector('[data-testid="last-message-text"]')?.textContent.trim().toLowerCase() || "";
            const isArchived = lastMsgText.includes("archived");

            // Reset classes and opacity first
            chat.classList.remove("unreplied-highlight", "manual-highlight");
            chat.style.opacity = "1"; // default for non-archived

            const replied = chat.querySelector('[data-testid="replied"]');
            if (!isArchived && !replied) chat.classList.add("unreplied-highlight");
            if (manualMarkedChats.has(id)) chat.classList.add("manual-highlight");

            // Set transparency for archived chats
            if (isArchived) {
                chat.style.opacity = "0.5"; // 50% transparency
            }

            updatePengecekanTag(chat, id);

            if (!chat.dataset.clickBound) {
                chat.addEventListener("click", () => setFocus(chat));
                chat.dataset.clickBound = "true";
            }
        });

        if (currentFocusEl && !document.contains(currentFocusEl)) currentFocusEl = null;
    }

    const observer = new MutationObserver(() => {
        checkChats();
        document.querySelectorAll('[data-testid^="chat-item-"]').forEach(el => {
            if (el === currentFocusEl) el.classList.add("focused-custom");
            else el.classList.remove("focused-custom");
        });
        highlightDuplicateMessages();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    document.addEventListener("keydown", (e) => {
        if (!e.altKey) return;
        const key = e.key.toLowerCase();
        if (!["z", "q", "a", "x"].includes(key)) return;
        e.preventDefault();

        checkChats();
        const chats = Array.from(document.querySelectorAll('[data-testid^="chat-item-"]'));
        if (!chats.length) return;

        if (key === "z") {
            const markedChats = chats.filter(c =>
                                             c.classList.contains("manual-highlight") || c.classList.contains("unreplied-highlight")
                                            );
            if (!markedChats.length) return;
            let index = markedChats.findIndex(c => c === currentFocusEl);
            if (index === -1) {
                const currentPos = chats.indexOf(currentFocusEl);
                const aboveChats = markedChats.filter(c => chats.indexOf(c) < currentPos);
                if (aboveChats.length === 0) {
                    index = markedChats.length - 1;
                } else {
                    index = markedChats.indexOf(aboveChats[aboveChats.length - 1]);
                }
            } else {
                index = index <= 0 ? markedChats.length - 1 : index - 1;
            }
            scrollAndFocus(markedChats[index]);

        } else if (key === "q" || key === "a") {
            const allChats = chats; // include everything
            if (!allChats.length) return;
            let index = allChats.findIndex(c => c === currentFocusEl);
            if (key === "q") {
                index = index <= 0 ? allChats.length - 1 : index - 1;
            } else {
                index = index === -1 || index >= allChats.length - 1 ? 0 : index + 1;
            }
            scrollAndFocus(allChats[index]);
        } else if (key === "x") {
            // Alt+X → toggle manual highlight
            if (!currentFocusEl) return;
            const id = currentFocusEl.getAttribute("data-testid");
            if (!id) return;

            if (manualMarkedChats.has(id)) {
                manualMarkedChats.delete(id);
                currentFocusEl.classList.remove("manual-highlight");
            } else {
                manualMarkedChats.set(id, Date.now());
                currentFocusEl.classList.add("manual-highlight");
            }
            updatePengecekanTag(currentFocusEl, id);
        }
    });

    checkChats();
    setInterval(checkChats, 3000);

    // --- Tatakae SFX panels container ---
    let tatakaeContainer = document.createElement("div");
    Object.assign(tatakaeContainer.style, {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0 // above background (::before), behind chat
    });
    document.body.appendChild(tatakaeContainer);

    // --- Tatakae SFX panels floating ---
    const tatakaeSFX = ["戦え。立て。戦え", "立て、お父さん。まだ終わっていない。", "グリシャ、ディナ、ジークの写真を見ろ。", "倒れた仲間たちを思い出せ。", "罪を償うために、死んでも戦い続けなければならない。", "死んでも、死んだ後でも前に進み続けろ。", "この物語を始めたのはお前だ。", "結局、この醜い物語はお前から始まったんだ。", "戦え"];

    function spawnTatakaePanel() {
        const panel = document.createElement("div");
        panel.textContent = tatakaeSFX[Math.floor(Math.random() * tatakaeSFX.length)];

        Object.assign(panel.style, {
            position: "absolute",
            top: `${Math.random() * 70 + 10}%`,
            left: `${Math.random() * 50 + 10}%`,
            fontSize: `${Math.random() * 24 + 18}px`,
            fontWeight: "bold",
            fontFamily: "'Comic Sans MS', sans-serif",
            background: "rgba(255,255,255,0.85)",
            border: "2px solid black",
            boxShadow: "3px 3px 0 black",
            transform: `rotate(${Math.random() * 30 - 15}deg)`,
            pointerEvents: "none",
            opacity: "0",
            padding: "4px 8px",
            transition: "opacity 0.5s ease, transform 4s linear"
        });

        tatakaeContainer.appendChild(panel);

        // Fade in
        setTimeout(() => panel.style.opacity = "0.9", 50);

        // Slight floating drift
        const driftX = (Math.random() * 20 - 10) + "px";
        const driftY = (Math.random() * -20 - 10) + "px";
        setTimeout(() => panel.style.transform += ` translate(${driftX}, ${driftY})`, 50);

        // Fade out and remove
        setTimeout(() => {
            panel.style.opacity = "0";
            setTimeout(() => panel.remove(), 1000);
        }, 4000);

        // Spawn next panel with random interval (3-5s)
        setTimeout(spawnTatakaePanel, Math.random() * 3000 + 5000);
    }

    // Start spawning
    spawnTatakaePanel();

// Define the images and their styles in an array
const images = [
    {
        src: "https://i.imgur.com/GaN4pRS.png",
        style: {
            position: "fixed",
            bottom: "0px",
            left: "50px",
            width: "287px",
            height: "auto",
            zIndex: 0,
            pointerEvents: "none",
            filter: "brightness(0.5)"
        }
    },    {
        src: "https://i.imgur.com/9Tlmjwb.png",
        style: {
            position: "fixed",
            bottom: "0px",
            left: `40%`,
            width: "500px",
            height: "auto",
            zIndex: 0,
            pointerEvents: "none",
            filter: "brightness(0.3)"
        }
    },
    {
        src: "https://i.imgur.com/kmXJoYH.png",
        style: {
            position: "fixed",
            bottom: "0px",
            right: "0px",
            width: "400px",
            height: "auto",
            zIndex: 0,
            pointerEvents: "none",
            filter: "brightness(0.5)"
        }
    }
];

// Loop through the array and append each image
images.forEach(imgData => {
    const img = document.createElement("img");
    img.src = imgData.src;
    Object.assign(img.style, imgData.style);
    document.body.appendChild(img);
});

    // Main konten
    function highlightDuplicateMessages() {
        const chatContainer = document.querySelector('[data-testid="messages-list"]');
        if (!chatContainer) return;

        const agentMessages = Array.from(chatContainer.querySelectorAll('[data-testid="agent-message"] .css-3dz5hy'));
        if (agentMessages.length < 2) return;

        const latestMessage = agentMessages[agentMessages.length - 1];
        const latestText = latestMessage.textContent.trim().toLowerCase();
        if (!latestText) return;

        agentMessages.forEach(el => el.style.backgroundColor = "");

        const duplicates = agentMessages.filter(msg => msg.textContent.trim().toLowerCase() === latestText);
        if (duplicates.length > 1) {
            duplicates.forEach(el => {
                el.style.backgroundColor = "#3b0000";
            });
        }
    }

    function highlightChatOffStatus() {
        const css = `
    body.chats-off .lc-NavigationItem-module__navigation-item__button___g-pAI span,
    body.chats-off .lc-Icon-module__icon___J5RH5 {
      color: #ff1a1a !important;
      transition: color 200ms ease;
    }
  `;

        let style = document.getElementById('chat-off-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'chat-off-style';
            style.textContent = css;
            document.head.appendChild(style);
        }

        const chatElements = document.querySelectorAll('[class^="lc-"]');

        function updateChatOffClass() {
            const alert = document.querySelector('[data-testid="navigation-top-bar-alert"]');
            const isOpen = alert && alert.classList.contains('lc-NavigationTopBar-module__navigation-top-bar__alert--open___ESpyQ');

            if (isOpen) {
                document.body.classList.add('chats-off');
                chatElements.forEach(el => el.style.zIndex = "1"); // set z-index
            } else {
                document.body.classList.remove('chats-off');
                chatElements.forEach(el => el.style.zIndex = ""); // remove z-index
            }
        }

        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (
                    mutation.type === 'attributes' &&
                    mutation.attributeName === 'class' &&
                    mutation.target.matches('[data-testid="navigation-top-bar-alert"]')
                ) {
                    updateChatOffClass();
                } else if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.matches('[data-testid="navigation-top-bar-alert"]')) {
                            updateChatOffClass();
                        }
                    });
                    mutation.removedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.matches('[data-testid="navigation-top-bar-alert"]')) {
                            updateChatOffClass();
                        }
                    });
                }
            }
        });

        observer.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
            childList: true,
        });

        updateChatOffClass();

        return function stopHighlight() {
            observer.disconnect();
            if (style.parentNode) style.parentNode.removeChild(style);
            document.body.classList.remove('chats-off');
            chatElements.forEach(el => el.style.zIndex = "");
            console.log('chat status highlight stopped');
        };
    }

    const stopChatOffHighlight = highlightChatOffStatus();

const toggleBtn = document.createElement("button");
toggleBtn.textContent = "🚫";

Object.assign(toggleBtn.style, {
    position: "fixed",
    top: "3px",
    right: "177px",
    fontSize: "20px",
    padding: "6px 10px",
    cursor: "pointer",
    zIndex: "10000",
    background: "transparent",
});

document.body.appendChild(toggleBtn);

toggleBtn.addEventListener("click", () => {
    // Remove custom classes
    document.querySelectorAll(".pengecekan-tag, .focused-custom, .manual-highlight, .unreplied-highlight")
        .forEach(el => el.classList.remove("pengecekan-tag", "focused-custom", "manual-highlight", "unreplied-highlight"));

    // Reset opacity of chats
    document.querySelectorAll('[data-testid^="chat-item-"]').forEach(chat => chat.style.opacity = "");

    // Set z-index of the target CSS class
    document.querySelectorAll(".css-1ago99h").forEach(el => el.style.zIndex = "1");

    // Remove button itself
    toggleBtn.remove();

    console.log("Custom effects disabled, .css-1ago99h z-index set to 1.");
});

// my chat
(function styleChatsTitleMangaAlways() {
  const STYLE_ID = "chats-title-manga-style";

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      [data-testid="my-chats-title"] {
        font-weight: 900 !important;
        color: #000 !important;
        background: white !important;
        border: 3px solid black !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
        display: inline-block !important;
        text-shadow:
          -1px -1px 0 #fff,
           1px -1px 0 #fff,
          -1px  1px 0 #fff,
           1px  1px 0 #fff;
      }

      .wiggle-active {
        animation: manga-wiggle-small 0.4s infinite;
      }

      @keyframes manga-wiggle-small {
        0%   { transform: rotate(-1deg) translateY(0px); }
        25%  { transform: rotate(1deg) translateY(-1px); }
        50%  { transform: rotate(-1deg) translateY(-2px); }
        75%  { transform: rotate(1deg) translateY(-1px); }
        100% { transform: rotate(-1deg) translateY(0px); }
      }
    `;
    document.head.appendChild(style);
  }

  function updateWiggle() {
    const countEl = document.querySelector('[data-testid="active-chats-count"]');
    const titleEl = document.querySelector('[data-testid="my-chats-title"]');
    if (!countEl || !titleEl) return;

    titleEl.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = node.textContent.replace("My chats", "マイチャット");
      }
    });

    const rawText = countEl.textContent.trim();
    const count = Number(rawText) || 0;
    const isChatsOff = document.body.classList.contains("chats-off");

    if (count === 0) {
      titleEl.classList.remove("wiggle-active");
      return;
    }

    if (isChatsOff && count > 0) {
      titleEl.classList.add("wiggle-active");
    } else {
      titleEl.classList.remove("wiggle-active");
    }
  }

  const countTarget = document.querySelector('[data-testid="active-chats-count"]');
  if (countTarget) {
    const countObserver = new MutationObserver(updateWiggle);
    countObserver.observe(countTarget, { childList: true, characterData: true, subtree: true });
  }

  const bodyObserver = new MutationObserver(updateWiggle);
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

  updateWiggle();
})();

const toggleImagesBtn = document.createElement("button");
toggleImagesBtn.textContent = "🚫";

Object.assign(toggleImagesBtn.style, {
    position: "fixed",
    top: "3px",
    right: "153px",
    fontSize: "20px",
    padding: "6px 10px",
    cursor: "pointer",
    zIndex: "10000",
    background: "transparent",
});

document.body.appendChild(toggleImagesBtn);

let visualsVisible = true;

const toggleSrcs = [
    "https://i.imgur.com/aEk0pZt.png",
    "https://i.imgur.com/PWgWDHe.jpeg",
    "https://i.imgur.com/8RMtbiS.jpeg",
    "https://i.imgur.com/4tqtynP.png",
    "https://i.imgur.com/BeNsmLX.jpeg",
    "https://i.imgur.com/gQzqP6Q.jpeg",
    "https://i.imgur.com/86l0swg.jpeg",
    "https://i.imgur.com/3UA4UJQ.png",
    "https://i.imgur.com/El3dZDH.jpeg",
    "https://i.imgur.com/w3KcKxc.png",
    "https://i.imgur.com/KfTwUkp.png",
    "https://i.imgur.com/GaN4pRS.png",
    "https://i.imgur.com/kmXJoYH.png"
];

toggleImagesBtn.addEventListener("click", () => {
    visualsVisible = !visualsVisible;

    document.querySelectorAll("img").forEach(img => {
        if (toggleSrcs.includes(img.src)) {
            img.style.display = visualsVisible ? "" : "none";
        }
    });

    console.log(`Target images are now ${visualsVisible ? "visible" : "hidden"}`);
});

})();
