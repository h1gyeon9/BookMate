// netlify/functions/gemini.js

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { personaDescription } = JSON.parse(event.body);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `당신은 다음과 같은 페르소나로 독서 토론에 참여합니다: "${personaDescription}"

독서 토론 채팅방에 처음 입장해 토론을 시작하는 첫 마디를 합니다.
규칙:
- 반드시 페르소나의 성격과 말투를 유지할 것
- 특정 책 내용을 아는 척하지 말 것
- 참가자들에게 질문을 던지거나 토론 주제를 제안하며 대화를 유도할 것
- 2~4문장 이내로 간결하게 작성할 것
- 인삿말 없이 바로 본론으로 시작할 것`,
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await res.json();

  // 디버그용 로그
  console.log("Gemini status:", res.status);
  console.log("Gemini response:", JSON.stringify(data));

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