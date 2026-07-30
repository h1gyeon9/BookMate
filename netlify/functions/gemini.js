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
  } = payload;

  const prompt =
    action === "review"
      ? buildReviewPrompt(conversation, personas)
      : buildChatPrompt(personaDescription, conversation, action);

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

function buildChatPrompt(personaDescription, conversation, action) {
  if (!personaDescription) {
    return "독서 토론에 어울리는 짧은 질문을 한국어로 한 문장 작성해주세요.";
  }

  const transcript = toTranscript(conversation);

  if (action === "opening" || !transcript) {
    return `당신은 다음과 같은 페르소나로 독서 토론에 참여합니다: "${personaDescription}"

독서 토론 채팅방에 처음 입장해 토론을 시작하는 첫 마디를 합니다.
규칙:
- 반드시 페르소나의 성격과 말투를 유지할 것
- 특정 책 내용을 아는 척하지 말 것
- 참가자들에게 질문을 던지거나 토론 주제를 제안하며 대화를 유도할 것
- 2~4문장 이내로 간결하게 작성할 것
- 인삿말 없이 바로 본론으로 시작할 것`;
  }

  return `당신은 독서 토론 채팅방의 "${personaDescription}" 페르소나입니다.

아래 대화 내역을 읽고, 지금 차례에 이어질 답변을 작성하세요.

대화 내역:
${transcript}

규칙:
- 반드시 "${personaDescription}"의 성격과 말투를 유지할 것
- 사용자의 마지막 발화와 이전 맥락을 모두 반영할 것
- 대화를 이어가기 위해 짧은 해석, 반론, 질문 중 하나 이상을 포함할 것
- 대화에 나오지 않은 책 제목, 작가, 줄거리를 아는 척하지 말 것
- 2~4문장으로 작성할 것
- 이름표나 따옴표 없이 답변 본문만 작성할 것`;
}

function buildReviewPrompt(conversation, personas) {
  const transcript = toTranscript(conversation);
  const personaList = personas.length ? personas.join(", ") : "선택된 페르소나";

  return `다음은 사용자가 ${personaList}와 나눈 독서 토론 대화입니다.

대화 내역:
${transcript}

위 대화 내역만 근거로 독서록을 한국어로 작성하세요.
규칙:
- 대화에 없는 책 제목, 작가, 사건을 임의로 만들지 말 것
- 사용자가 직접 말한 감상과 페르소나들이 던진 관점을 중심으로 정리할 것
- 독서록 제목 1줄, 본문 2~3문단, 더 생각해볼 질문 2개를 포함할 것
- 문장은 자연스럽고 학생이 직접 쓴 독서록처럼 작성할 것
- 마크다운 코드블록 없이 바로 독서록 본문만 작성할 것`;
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
