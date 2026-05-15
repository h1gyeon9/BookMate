const personaButtons = document.querySelectorAll(".persona-btn");

const customBox = document.getElementById("custom-box");
const customInput = document.getElementById("custom-input");

const startBtn = document.getElementById("start-btn");

const selectPage = document.getElementById("select-page");
const chatPage = document.getElementById("chat-page");

const chatContainer = document.getElementById("chat-container");

let selectedPersonas = [];

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

      selectedPersonas =
        selectedPersonas.filter((item) => item !== persona);

      button.classList.remove("selected");

      if(persona === "커스텀"){
        customBox.classList.add("hidden");
      }

      return;
    }

    selectedPersonas.push(persona);

    button.classList.add("selected");

    if(persona === "커스텀"){
      customBox.classList.remove("hidden");
    }

  });

});

startBtn.addEventListener("click", () => {

  if(selectedPersonas.length === 0){
    alert("페르소나를 선택해주세요.");
    return;
  }

  selectPage.classList.add("hidden");

  chatPage.classList.remove("hidden");

  startChat();

});

function addMessage({
  name,
  text,
  profile,
  bubbleClass,
}) {

  const messageEl = document.createElement("div");

  messageEl.className = "message";

  messageEl.innerHTML = `
    <div class="profile">
      <img src="${profile}">
    </div>

    <div class="messageContent">

      <div class="name">
        ${name}
      </div>

      <div class="bubble ${bubbleClass}">
        ${text}
      </div>

    </div>
  `;

  chatContainer.appendChild(messageEl);

  chatContainer.scrollTop =
    chatContainer.scrollHeight;
}

async function fetchGeminiMessage(personaDescription) {

  const res = await fetch("/.netlify/functions/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personaDescription
    }),
  });

  if (!res.ok) {
    throw new Error("API 호출 실패");
  }

  const data = await res.json();

  return data.text;
}

function startChat() {

  selectedPersonas.forEach((persona, index) => {

    setTimeout(async () => {

      if(persona === "커스텀"){

        const customPersona =
          customInput.value.trim() || "커스텀 페르소나";

        try{

          const text =
            await fetchGeminiMessage(customPersona);

          addMessage({
            name: customPersona,
            text,
            profile: "./src/custom1.png",
            bubbleClass: "mediBubble",
          });

        }
        catch{

          addMessage({
            name: customPersona,
            text: "응답을 불러오지 못했습니다.",
            profile: "./src/custom1.png",
            bubbleClass: "mediBubble",
          });

        }

        return;
      }

      addMessage({
        name: persona,
        text: personaMessages[persona],
        profile: personaProfiles[persona],
        bubbleClass: personaBubbleClass[persona],
      });

    }, 1200 * (index + 1));

  });

}