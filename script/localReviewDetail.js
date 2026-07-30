const REVIEW_STORAGE_KEY = "bookmate.readingReviews.v1";

const params = new URLSearchParams(window.location.search);
const reviewId = params.get("id");
const review = readReviews().find((item) => item.id === reviewId);

const titleEl = document.getElementById("review-title");
const infoTitleEl = document.getElementById("review-info-title");
const authorEl = document.getElementById("review-author");
const createdAtEl = document.getElementById("review-created-at");
const personasEl = document.getElementById("review-personas");
const memoListEl = document.getElementById("review-memo-list");

renderReview();

function renderReview() {
  if (!review) {
    renderMissingReview();
    return;
  }

  const parsedReview = parseReview(review.text || "", review.title);

  titleEl.textContent = parsedReview.title;
  infoTitleEl.textContent = review.bookInfo?.title || parsedReview.title;
  authorEl.textContent = review.bookInfo?.author || "-";
  createdAtEl.textContent = formatDate(review.createdAt);
  personasEl.textContent = review.personas?.length ? review.personas.join(", ") : "페르소나 기록 없음";

  parsedReview.sections.forEach((section) => {
    memoListEl.appendChild(createMemoCard(section.title, section.body));
  });
}

function renderMissingReview() {
  titleEl.textContent = "독서록을 찾을 수 없어요";
  infoTitleEl.textContent = "저장된 독서록 없음";
  authorEl.textContent = "-";
  createdAtEl.textContent = "-";
  personasEl.textContent = "-";

  memoListEl.appendChild(
    createMemoCard(
      "로컬 저장 내역을 확인해주세요",
      "브라우저의 로컬 저장소에서 해당 독서록을 찾지 못했습니다. 독서록 탭으로 돌아가 저장된 항목을 다시 선택해주세요.",
    ),
  );
}

function createMemoCard(title, body) {
  const card = document.createElement("article");
  card.className = "memoCard";

  const pin = document.createElement("img");
  pin.className = "pin";
  pin.src = "./src/pin.png";
  pin.alt = "";

  const heading = document.createElement("h2");
  heading.textContent = title;

  const content = document.createElement("p");
  content.textContent = body;

  card.appendChild(pin);
  card.appendChild(heading);
  card.appendChild(content);

  return card;
}

function parseReview(text, fallbackTitle) {
  const normalizedText = text.replace(/\r\n/g, "\n").trim();
  const lines = normalizedText.split("\n").map((line) => line.trim()).filter(Boolean);
  const title = fallbackTitle || extractTitle(lines[0] || "대화 기반 독서록");
  const firstLineTitle = extractTitle(lines[0] || "");
  const shouldRemoveFirstLine = lines[0] && firstLineTitle === title;
  const bodyText = shouldRemoveFirstLine
    ? normalizedText.replace(lines[0], "").trim()
    : normalizedText;
  const paragraphs = bodyText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const sections = [];
  const questionParagraphs = [];

  paragraphs.forEach((paragraph) => {
    if (/더\s*생각해볼\s*질문|질문\s*\d|^\d+[.)]\s/.test(paragraph)) {
      questionParagraphs.push(paragraph);
      return;
    }

    sections.push({
      title: inferSectionTitle(paragraph, sections.length),
      body: cleanupParagraph(paragraph),
    });
  });

  if (questionParagraphs.length > 0) {
    sections.push({
      title: "더 생각해볼 질문",
      body: questionParagraphs.map(cleanupParagraph).join("\n\n"),
    });
  }

  if (sections.length === 0) {
    sections.push({
      title: "대화에서 남은 생각",
      body: normalizedText || "저장된 독서록 본문이 없습니다.",
    });
  }

  return { title, sections };
}

function extractTitle(text = "") {
  return text
    .replace(/^독서록\s*제목[:：]\s*/, "")
    .replace(/^제목[:：]\s*/, "")
    .replace(/^#+\s*/, "")
    .trim() || "대화 기반 독서록";
}

function inferSectionTitle(paragraph, index) {
  const firstLine = paragraph.split("\n")[0].trim();
  const headingMatch = firstLine.match(/^(.{2,28})[:：]\s*(.+)$/s);

  if (headingMatch) {
    return headingMatch[1].trim();
  }

  return ["대화에서 남은 생각", "내가 정리한 감상", "새롭게 생긴 관점"][index] || "기억하고 싶은 문장";
}

function cleanupParagraph(paragraph) {
  const firstLine = paragraph.split("\n")[0].trim();
  const headingMatch = firstLine.match(/^(.{2,28})[:：]\s*(.+)$/s);

  if (!headingMatch) {
    return paragraph;
  }

  return paragraph.replace(firstLine, headingMatch[2].trim()).trim();
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
