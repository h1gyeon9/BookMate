const REVIEW_STORAGE_KEY = "bookmate.readingReviews.v1";

const personaProfiles = {
  "논리적 분석가": "./src/characters/character1.png",
  "지배적 정복자": "./src/characters/character5.png",
  "외교적 중재자": "./src/characters/character3.png",
  "비판적 회의론자": "./src/characters/character2.png",
  "가치 수호자": "./src/characters/character4.png",
};

const personaBubbleClass = {
  "논리적 분석가": "logicBubble",
  "지배적 정복자": "kingBubble",
  "외교적 중재자": "mediBubble",
  "비판적 회의론자": "skepticBubble",
  "가치 수호자": "valueBubble",
};

const params = new URLSearchParams(window.location.search);
const reviewId = params.get("id");
const review = readReviews().find((item) => item.id === reviewId);
const chatTitle = document.getElementById("chat-title");
const chatContainer = document.getElementById("chat-container");
const backLink = document.getElementById("back-link");

renderConversation();

function renderConversation() {
  if (!review) {
    chatTitle.textContent = "대화 전문";
    addMessage({
      name: "북메이트",
      text: "저장된 독서록을 찾지 못했습니다.",
      profile: "./src/lionProfile.png",
      bubbleClass: "customBubble",
    });
    return;
  }

  chatTitle.textContent = review.title || "대화 전문";
  backLink.href = `./localReviewDetail.html?id=${encodeURIComponent(review.id)}`;

  const conversation = Array.isArray(review.conversation) ? review.conversation : [];

  if (conversation.length === 0) {
    addMessage({
      name: "북메이트",
      text: "이 독서록에는 저장된 대화 전문이 없습니다. 새로 생성하는 독서록부터 대화 내역이 함께 저장됩니다.",
      profile: "./src/lionProfile.png",
      bubbleClass: "customBubble",
    });
    return;
  }

  conversation.forEach((message) => {
    addMessage({
      name: message.name || (message.role === "user" ? "나" : "페르소나"),
      text: message.text || "",
      role: message.role,
      profile: getProfile(message.name),
      bubbleClass: message.role === "user" ? "userBubble" : getBubbleClass(message.name),
    });
  });
}

function addMessage({ name, text, role = "assistant", profile, bubbleClass }) {
  const isUser = role === "user";
  const messageEl = document.createElement("div");
  messageEl.className = isUser ? "message userMessage" : "message";

  if (!isUser) {
    messageEl.appendChild(createProfile(profile));
  }

  const contentEl = document.createElement("div");
  contentEl.className = "messageContent";

  const nameEl = document.createElement("div");
  nameEl.className = "name";
  nameEl.textContent = isUser ? "책 먹는 사자" : name;

  const bubbleEl = document.createElement("div");
  bubbleEl.className = `bubble ${bubbleClass}`;
  bubbleEl.textContent = text;

  contentEl.appendChild(nameEl);
  contentEl.appendChild(bubbleEl);
  messageEl.appendChild(contentEl);

  if (isUser) {
    messageEl.appendChild(createProfile("./src/lionProfile.png"));
  }

  chatContainer.appendChild(messageEl);
}

function createProfile(profile) {
  const profileEl = document.createElement("div");
  profileEl.className = "profile";

  const img = document.createElement("img");
  img.src = profile;
  img.alt = "";

  profileEl.appendChild(img);

  return profileEl;
}

function getProfile(name) {
  return personaProfiles[name] || "./src/characters/custom2.png";
}

function getBubbleClass(name) {
  return personaBubbleClass[name] || "customBubble";
}

function readReviews() {
  try {
    const rawValue = localStorage.getItem(REVIEW_STORAGE_KEY);
    const reviews = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(reviews) ? reviews : [];
  } catch {
    return [];
  }
}
