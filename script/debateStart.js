const personaButtons = document.querySelectorAll(".persona-btn");
const customBox = document.getElementById("custom-box");
const customInput = document.getElementById("custom-input");
const startBtn = document.getElementById("start-btn");
const selectPage = document.getElementById("select-page");
const chatPage = document.getElementById("chat-page");
const chatContainer = document.getElementById("chat-container");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const reviewBtn = document.getElementById("review-btn");
const savedSessionBox = document.getElementById("saved-session-box");
const savedSessionText = document.getElementById("saved-session-text");
const restoreBtn = document.getElementById("restore-btn");
const clearSavedBtn = document.getElementById("clear-saved-btn");

const SESSION_STORAGE_KEY = "bookmate.debateSession.v1";
const REVIEW_STORAGE_KEY = "bookmate.readingReviews.v1";

let selectedPersonas = [];
let activePersonas = [];
let chatHistory = [];
let nextPersonaIndex = 0;
let currentReview = null;
let isBusy = false;

const personaMessages = {
  "논리적 분석가":
    "토론을 시작하기 전에 먼저 질문 하나 드리겠습니다. 이 책에서 가장 인상 깊었던 주장이나 장면이 있다면, 그 이유가 무엇인지 구체적으로 말씀해주실 수 있나요? 감상보다는 근거 중심으로 이야기해보면 좋겠습니다.",

  "지배적 정복자":
    "자, 시작합시다. 이 책을 읽고 나서 가장 강하게 남은 인상이 뭔가요? 두루뭉술한 감상 말고, 딱 한 마디로 말해보세요.",

  "외교적 중재자":
    "오늘 토론이 즐거운 자리가 됐으면 좋겠어요. 먼저 각자 이 책을 읽으면서 어떤 감정이 들었는지 편하게 이야기해볼까요? 어떤 의견도 틀린 건 없으니까요.",

  "비판적 회의론자":
    "다들 이 책 어떻게 읽으셨나요? 저는 읽으면서 고개를 갸웃하게 되는 부분이 몇 군데 있었는데, 만약 작가의 전제 자체가 틀렸다면 어떻게 되는 걸까요?",

  "가치 수호자":
    "토론을 시작하기 전에 한 가지만 짚고 싶습니다. 이 책이 말하는 결론이 과연 '옳은' 방향인지, 우리가 중요하게 여기는 가치와 맞닿아 있는지를 함께 생각해보면 좋겠습니다. 효율이나 논리 이전에, 그것이 정말 옳은 일인가요?",
};

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

personaButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const persona = button.dataset.persona;

    if (selectedPersonas.includes(persona)) {
      selectedPersonas = selectedPersonas.filter((item) => item !== persona);
      button.classList.remove("selected");

      if (persona === "커스텀") {
        customBox.classList.add("hidden");
      }

      return;
    }

    selectedPersonas.push(persona);
    button.classList.add("selected");

    if (persona === "커스텀") {
      customBox.classList.remove("hidden");
      customInput.focus();
    }
  });
});

startBtn.addEventListener("click", async () => {
  if (selectedPersonas.length === 0) {
    alert("페르소나를 선택해주세요.");
    return;
  }

  activePersonas = selectedPersonas.map(resolvePersona);
  chatHistory = [];
  currentReview = null;
  nextPersonaIndex = 0;
  chatContainer.innerHTML = "";

  showChatPage();
  saveSession();
  await startChat();
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userText = messageInput.value.trim();

  if (!userText || isBusy) {
    return;
  }

  messageInput.value = "";
  addMessage({
    name: "나",
    text: userText,
    role: "user",
    bubbleClass: "userBubble",
  });

  await requestNextPersonaReply();
});

reviewBtn.addEventListener("click", async () => {
  if (isBusy) {
    return;
  }

  const hasUserMessage = chatHistory.some((message) => message.role === "user");

  if (!hasUserMessage) {
    alert("독서록을 만들려면 먼저 책에 대한 생각을 한 번 이상 입력해주세요.");
    return;
  }

  await generateReadingReview();
});

restoreBtn.addEventListener("click", () => {
  const savedSession = loadSession();

  if (!savedSession) {
    return;
  }

  selectedPersonas = savedSession.selectedPersonas || [];
  activePersonas = savedSession.activePersonas || selectedPersonas.map(resolvePersona);
  chatHistory = savedSession.chatHistory || [];
  nextPersonaIndex = savedSession.nextPersonaIndex || 0;
  currentReview = savedSession.currentReview || null;
  chatContainer.innerHTML = "";

  showChatPage();
  renderSavedChat();
  setBusy(false);
});

clearSavedBtn.addEventListener("click", () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  updateSavedSessionBox();
});

updateSavedSessionBox();
setBusy(false);

function resolvePersona(persona) {
  if (persona === "커스텀") {
    const customPersona = customInput.value.trim() || "커스텀 페르소나";

    return {
      key: persona,
      name: customPersona,
      profile: "./src/characters/custom2.png",
      bubbleClass: "customBubble",
    };
  }

  return {
    key: persona,
    name: persona,
    profile: personaProfiles[persona] || "./src/lionProfile.png",
    bubbleClass: personaBubbleClass[persona] || "customBubble",
  };
}

function showChatPage() {
  selectPage.classList.add("hidden");
  chatPage.classList.remove("hidden");
}

async function startChat() {
  setBusy(true, "페르소나가 입장하고 있어요...");

  for (const persona of activePersonas) {
    await delay(650);

    if (persona.key === "커스텀") {
      await addOpeningMessageFromGemini(persona);
      continue;
    }

    addMessage({
      name: persona.name,
      text: personaMessages[persona.key],
      profile: persona.profile,
      bubbleClass: persona.bubbleClass,
    });
  }

  setBusy(false);
}

async function addOpeningMessageFromGemini(persona) {
  const loadingBubble = addLoadingMessage({
    name: persona.name,
    profile: persona.profile,
    bubbleClass: persona.bubbleClass,
  });

  try {
    const text = await requestGemini({
      action: "opening",
      personaDescription: persona.name,
      conversation: [],
    });

    completeLoadingMessage(loadingBubble, text);
    appendHistory({
      role: "assistant",
      name: persona.name,
      text,
    });
  } catch {
    completeLoadingMessage(loadingBubble, "응답을 불러오지 못했습니다.");
  }
}

async function requestNextPersonaReply() {
  const persona = activePersonas[nextPersonaIndex % activePersonas.length];
  nextPersonaIndex += 1;
  saveSession();
  setBusy(true, `${persona.name}가 답변을 준비하고 있어요...`);

  const loadingBubble = addLoadingMessage({
    name: persona.name,
    profile: persona.profile,
    bubbleClass: persona.bubbleClass,
  });

  try {
    const text = await requestGemini({
      action: "chat",
      personaDescription: persona.name,
      conversation: getConversationForApi(),
    });

    completeLoadingMessage(loadingBubble, text);
    appendHistory({
      role: "assistant",
      name: persona.name,
      text,
    });
  } catch {
    completeLoadingMessage(loadingBubble, "응답을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
  } finally {
    setBusy(false);
  }
}

async function generateReadingReview() {
  setBusy(true, "대화 내용을 바탕으로 독서록을 쓰고 있어요...");

  const loadingBubble = addLoadingMessage({
    name: "북메이트 독서록",
    profile: "./src/bookIcon.png",
    bubbleClass: "reviewBubble",
  });

  try {
    const text = await requestGemini({
      action: "review",
      personas: activePersonas.map((persona) => persona.name),
      conversation: getConversationForApi(),
    });

    completeLoadingMessage(loadingBubble, text);

    currentReview = {
      id: createId(),
      text,
      personas: activePersonas.map((persona) => persona.name),
      createdAt: new Date().toISOString(),
    };

    saveReview(currentReview);
    saveSession();
  } catch {
    completeLoadingMessage(loadingBubble, "독서록을 생성하지 못했습니다. 대화를 조금 더 나눈 뒤 다시 시도해주세요.");
  } finally {
    setBusy(false);
  }
}

function addMessage({
  name,
  text,
  profile,
  bubbleClass,
  role = "assistant",
  persist = true,
}) {
  const isUser = role === "user";
  const messageEl = document.createElement("div");
  messageEl.className = isUser ? "message userMessage" : "message";

  if (!isUser) {
    const profileEl = document.createElement("div");
    profileEl.className = "profile";

    const profileImg = document.createElement("img");
    profileImg.src = profile;
    profileImg.alt = "";

    profileEl.appendChild(profileImg);
    messageEl.appendChild(profileEl);
  }

  const contentEl = document.createElement("div");
  contentEl.className = "messageContent";

  const nameEl = document.createElement("div");
  nameEl.className = "name";
  nameEl.textContent = name;

  const bubbleEl = document.createElement("div");
  bubbleEl.className = `bubble ${bubbleClass}`;
  bubbleEl.textContent = text;

  contentEl.appendChild(nameEl);
  contentEl.appendChild(bubbleEl);
  messageEl.appendChild(contentEl);
  chatContainer.appendChild(messageEl);
  scrollToBottom();

  if (persist) {
    appendHistory({ role, name, text });
  }
}

function addLoadingMessage({ name, profile, bubbleClass }) {
  const messageEl = document.createElement("div");
  messageEl.className = "message";

  const profileEl = document.createElement("div");
  profileEl.className = "profile";

  const profileImg = document.createElement("img");
  profileImg.src = profile;
  profileImg.alt = "";

  const contentEl = document.createElement("div");
  contentEl.className = "messageContent";

  const nameEl = document.createElement("div");
  nameEl.className = "name";
  nameEl.textContent = name;

  const bubbleEl = document.createElement("div");
  bubbleEl.className = `bubble ${bubbleClass} loadingBubble`;

  for (let index = 0; index < 3; index += 1) {
    bubbleEl.appendChild(document.createElement("span"));
  }

  profileEl.appendChild(profileImg);
  contentEl.appendChild(nameEl);
  contentEl.appendChild(bubbleEl);
  messageEl.appendChild(profileEl);
  messageEl.appendChild(contentEl);
  chatContainer.appendChild(messageEl);
  scrollToBottom();

  return bubbleEl;
}

function completeLoadingMessage(loadingBubble, text) {
  loadingBubble.classList.remove("loadingBubble");
  loadingBubble.textContent = text;
  scrollToBottom();
}

async function requestGemini(payload) {
  const res = await fetch("/.netlify/functions/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("API 호출 실패");
  }

  const data = await res.json();

  return data.text;
}

function appendHistory(message) {
  chatHistory.push({
    role: message.role,
    name: message.name,
    text: message.text,
    createdAt: new Date().toISOString(),
  });

  saveSession();
}

function getConversationForApi() {
  return chatHistory.map(({ role, name, text }) => ({
    role,
    name,
    text,
  }));
}

function renderSavedChat() {
  chatHistory.forEach((message) => {
    const persona = findPersonaByName(message.name);

    addMessage({
      name: message.name,
      text: message.text,
      role: message.role,
      profile: persona.profile,
      bubbleClass: message.role === "user" ? "userBubble" : persona.bubbleClass,
      persist: false,
    });
  });

  if (currentReview?.text) {
    addMessage({
      name: "북메이트 독서록",
      text: currentReview.text,
      profile: "./src/bookIcon.png",
      bubbleClass: "reviewBubble",
      persist: false,
    });
  }
}

function findPersonaByName(name) {
  const activePersona = activePersonas.find((persona) => persona.name === name);

  if (activePersona) {
    return activePersona;
  }

  return {
    profile: personaProfiles[name] || "./src/lionProfile.png",
    bubbleClass: personaBubbleClass[name] || "customBubble",
  };
}

function saveSession() {
  const session = {
    selectedPersonas,
    activePersonas,
    chatHistory,
    nextPersonaIndex,
    currentReview,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    updateSavedSessionBox();
  } catch {
    console.warn("대화 내역을 localStorage에 저장하지 못했습니다.");
  }
}

function loadSession() {
  return readJson(SESSION_STORAGE_KEY, null);
}

function saveReview(review) {
  const reviews = readJson(REVIEW_STORAGE_KEY, []);
  const nextReviews = [
    review,
    ...reviews.filter((item) => item.id !== review.id),
  ].slice(0, 20);

  try {
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(nextReviews));
  } catch {
    console.warn("독서록을 localStorage에 저장하지 못했습니다.");
  }
}

function readJson(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

function updateSavedSessionBox() {
  const savedSession = loadSession();

  if (!savedSession?.chatHistory?.length) {
    savedSessionBox.classList.add("hidden");
    return;
  }

  const updatedAt = savedSession.updatedAt
    ? new Date(savedSession.updatedAt).toLocaleString("ko-KR", {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "최근";

  savedSessionText.textContent = `${updatedAt} 저장된 대화가 있어요.`;
  savedSessionBox.classList.remove("hidden");
}

function setBusy(nextBusy, placeholderText) {
  isBusy = nextBusy;
  messageInput.disabled = nextBusy;
  sendBtn.disabled = nextBusy;
  reviewBtn.disabled = nextBusy || !chatHistory.some((message) => message.role === "user");

  if (placeholderText) {
    messageInput.placeholder = placeholderText;
  } else {
    messageInput.placeholder = "책에 대한 생각을 입력하세요";
  }
}

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return String(Date.now());
}
