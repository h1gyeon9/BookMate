// netlify/functions/gemini.js

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let payload;

  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "요청 본문을 JSON으로 해석할 수 없습니다." }),
    };
  }

  const {
    action = "opening",
    personaDescription,
    conversation = [],
    personas = [],
    bookInfo = null,
    canAskQuestion = true,
  } = payload;

  const prompt =
    action === "review"
      ? buildReviewPrompt(conversation, personas, bookInfo)
      : buildChatPrompt(personaDescription, conversation, action, bookInfo, canAskQuestion);

  if (!process.env.GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다." }),
    };
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await res.json();

  console.log("Gemini status:", res.status);

  if (!res.ok) {
    console.error("Gemini error:", JSON.stringify(data));

    return {
      statusCode: res.status,
      body: JSON.stringify({ error: "Gemini 요청 실패" }),
    };
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return { statusCode: 500, body: JSON.stringify({ error: "Gemini 응답 오류" }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  };
}

function buildChatPrompt(personaDescription, conversation, action, bookInfo, canAskQuestion = true) {
  if (!personaDescription) {
    return "독서 토론에 어울리는 짧은 질문을 한국어로 한 문장 작성해주세요.";
  }

  const transcript = toTranscript(conversation);
  const bookLabel = formatBookLabel(bookInfo);

  if (action === "opening" || !transcript) {
    return `당신은 다음과 같은 페르소나로 독서 토론에 참여합니다: "${personaDescription}"
토론할 책: ${bookLabel}

독서 토론 채팅방에 처음 입장해 토론을 시작하는 첫 마디를 합니다.
규칙:
- 반드시 페르소나의 성격과 말투를 유지할 것
- 사용자가 아직 말하지 않은 구체적인 줄거리나 사건을 아는 척하지 말 것
- 참가자들에게 질문을 던지거나 토론 주제를 제안하며 대화를 유도할 것
- 2~4문장 이내로 간결하게 작성할 것
- 인삿말 없이 바로 본론으로 시작할 것`;
  }

  const questionRule = canAskQuestion
    ? `- 답변 끝부분에 사용자가 다음으로 답하기 좋은 질문 문장을 정확히 1개만 포함할 것
- 물음표는 최대 1번만 사용할 것`
    : `- 사용자에게 직접 답변을 요구하는 질문을 하지 말 것
- 물음표를 사용하지 말고 해석이나 반론으로만 대화를 이어갈 것`;

  return `당신은 독서 토론 채팅방의 "${personaDescription}" 페르소나입니다.
토론할 책: ${bookLabel}

아래 대화 내역을 읽고, 지금 차례에 이어질 답변을 작성하세요.

대화 내역:
${transcript}

규칙:
- 반드시 "${personaDescription}"의 성격과 말투를 유지할 것
- 사용자의 마지막 발화와 이전 맥락을 모두 반영할 것
- 대화를 이어가기 위해 짧은 해석이나 반론을 포함할 것
${questionRule}
- 대화에 나오지 않은 책 제목, 작가, 줄거리를 아는 척하지 말 것
- 2~4문장으로 작성할 것
- 이름표나 따옴표 없이 답변 본문만 작성할 것`;
}

function buildReviewPrompt(conversation, personas, bookInfo) {
  const transcript = toTranscript(conversation);
  const personaList = personas.length ? personas.join(", ") : "선택된 페르소나";
  const bookLabel = formatBookLabel(bookInfo);

  return `다음은 사용자가 ${personaList}와 나눈 독서 토론 대화입니다.
대상 도서: ${bookLabel}

대화 내역:
${transcript}

위 대화 내역만 근거로 독서록을 한국어로 작성하세요.
규칙:
- 첫 줄은 반드시 "${bookLabel}" 형식의 제목만 작성할 것
- 대화에 없는 책 제목, 작가, 사건을 임의로 만들지 말 것
- 사용자가 직접 말한 감상과 페르소나들이 던진 관점을 중심으로 정리할 것
- 토론에서 실제로 나온 핵심 주제나 쟁점별로 본문을 2~3개 섹션으로 나눌 것
- 각 섹션은 반드시 "해리의 성장: ..."처럼 구체적인 소제목과 본문을 콜론으로 구분해 시작할 것
- 소제목은 해당 주제를 구체적으로 드러내는 8~18자 문구로 작성할 것
- "대화에서 남은 생각", "내가 정리한 감상", "새롭게 생긴 관점"처럼 어디에나 붙일 수 있는 고정 제목은 사용하지 말 것
- 더 생각해볼 질문 2개를 마지막에 "더 생각해볼 질문:" 섹션으로 포함할 것
- 문장은 자연스럽고 학생이 직접 쓴 독서록처럼 작성할 것
- 마크다운 코드블록 없이 바로 독서록 본문만 작성할 것`;
}

function formatBookLabel(bookInfo) {
  if (!bookInfo?.title) {
    return "사용자가 말한 책";
  }

  return bookInfo.author ? `<${bookInfo.title}> ${bookInfo.author}` : `<${bookInfo.title}>`;
}

function toTranscript(conversation) {
  if (!Array.isArray(conversation)) {
    return "";
  }

  return conversation
    .filter((message) => message?.text)
    .map((message) => {
      const speaker = message.name || (message.role === "user" ? "나" : "페르소나");
      return `${speaker}: ${message.text}`;
    })
    .join("\n");
}
