const REVIEW_STORAGE_KEY = "bookmate.readingReviews.v1";

const params = new URLSearchParams(window.location.search);
const reviewId = params.get("id");
const review = readReviews().find((item) => item.id === reviewId);

const titleEl = document.getElementById("review-title");
const coverEl = document.getElementById("review-cover");
const coverInput = document.getElementById("cover-input");
const coverUploadBtn = document.getElementById("cover-upload-btn");
const conversationLink = document.getElementById("conversation-link");
const editReviewBtn = document.getElementById("edit-review-btn");
const editSectionEl = document.getElementById("review-edit-section");
const editInputEl = document.getElementById("review-edit-input");
const saveEditBtn = document.getElementById("save-edit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const infoTitleEl = document.getElementById("review-info-title");
const authorEl = document.getElementById("review-author");
const createdAtEl = document.getElementById("review-created-at");
const personasEl = document.getElementById("review-personas");
const memoListEl = document.getElementById("review-memo-list");

renderReview();
bindCoverUpload();
bindReviewEditing();

function renderReview() {
  if (!review) {
    renderMissingReview();
    return;
  }

  const parsedReview = parseReview(review.text || "", review.title);

  titleEl.textContent = parsedReview.title;
  titleEl.title = parsedReview.title;
  coverEl.src = review.coverImage || "./src/bookIcon.png";
  coverUploadBtn.textContent = review.coverImage ? "표지 바꾸기" : "사진 추가하기";
  conversationLink.href = `./localReviewChat.html?id=${encodeURIComponent(review.id)}`;
  infoTitleEl.textContent = review.bookInfo?.title || parsedReview.title;
  authorEl.textContent = review.bookInfo?.author || "-";
  createdAtEl.textContent = formatDate(review.createdAt);
  personasEl.textContent = review.personas?.length ? review.personas.join(", ") : "페르소나 기록 없음";

  renderMemoCards(parsedReview.sections);
}

function renderMissingReview() {
  titleEl.textContent = "독서록을 찾을 수 없어요";
  coverUploadBtn.disabled = true;
  editReviewBtn.disabled = true;
  conversationLink.href = "./archive.html";
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

function renderMemoCards(sections) {
  memoListEl.innerHTML = "";

  sections.forEach((section) => {
    memoListEl.appendChild(createMemoCard(section.title, section.body));
  });
}

function bindCoverUpload() {
  coverUploadBtn.addEventListener("click", () => {
    coverInput.click();
  });

  coverInput.addEventListener("change", async () => {
    const file = coverInput.files?.[0];

    if (!file || !review) {
      return;
    }

    try {
      const coverImage = await createCoverImage(file);
      review.coverImage = coverImage;
      saveReview(review);
      coverEl.src = coverImage;
      coverUploadBtn.textContent = "표지 바꾸기";
      coverInput.value = "";
    } catch {
      alert("표지 이미지를 불러오지 못했습니다. 다른 사진으로 다시 시도해주세요.");
    }
  });
}

function bindReviewEditing() {
  editReviewBtn.addEventListener("click", enterEditMode);
  cancelEditBtn.addEventListener("click", exitEditMode);
  saveEditBtn.addEventListener("click", saveEditedReview);
}

function enterEditMode() {
  if (!review) {
    return;
  }

  editInputEl.value = review.text || "";
  memoListEl.hidden = true;
  editSectionEl.hidden = false;
  editReviewBtn.disabled = true;
  editInputEl.focus();
}

function exitEditMode() {
  memoListEl.hidden = false;
  editSectionEl.hidden = true;
  editReviewBtn.disabled = false;
}

function saveEditedReview() {
  if (!review) {
    return;
  }

  const nextText = editInputEl.value.trim();

  if (!nextText) {
    alert("독서록 내용을 입력해주세요.");
    return;
  }

  review.text = nextText;
  review.title = parseReview(nextText).title;
  saveReview(review);
  renderReview();
  exitEditMode();
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
    if (/더\s*생각해볼\s*질문|질문\s*\d/.test(paragraph)) {
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
      title: "토론에서 길어 올린 생각",
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
  const heading = extractSectionHeading(paragraph);

  if (heading) {
    return heading;
  }

  return makeTopicTitle(paragraph, index);
}

function cleanupParagraph(paragraph) {
  const lines = paragraph.split("\n");
  const firstLine = paragraph.split("\n")[0].trim();
  const markdownHeadingMatch = firstLine.match(/^#{1,4}\s+(.+)$/);
  const boldHeadingMatch = firstLine.match(/^\*\*(.+)\*\*$/);
  const headingMatch = firstLine.match(/^(.{2,32})[:：]\s*(.*)$/s);
  const headingLabel = headingMatch?.[1]?.trim();

  if ((markdownHeadingMatch || boldHeadingMatch) && lines.length > 1) {
    return lines.slice(1).join("\n").trim();
  }

  if (!headingMatch) {
    return paragraph;
  }

  if (headingLabel === "소제목" && lines.length > 1) {
    return lines.slice(1).join("\n").trim();
  }

  return headingMatch[2].trim()
    ? paragraph.replace(firstLine, headingMatch[2].trim()).trim()
    : lines.slice(1).join("\n").trim();
}

function extractSectionHeading(paragraph) {
  const firstLine = paragraph.split("\n")[0].trim();
  const markdownHeadingMatch = firstLine.match(/^#{1,4}\s+(.+)$/);
  const boldHeadingMatch = firstLine.match(/^\*\*(.+)\*\*$/);
  const headingMatch = firstLine.match(/^(.{2,32})[:：]\s*(.*)$/s);
  const headingLabel = headingMatch?.[1]?.trim();

  if (markdownHeadingMatch) {
    return cleanupHeading(markdownHeadingMatch[1]);
  }

  if (boldHeadingMatch) {
    return cleanupHeading(boldHeadingMatch[1]);
  }

  if (headingMatch) {
    if (headingLabel === "소제목" && headingMatch[2].trim()) {
      return cleanupHeading(headingMatch[2]);
    }

    return cleanupHeading(headingMatch[1]);
  }

  return "";
}

function makeTopicTitle(paragraph, index) {
  const firstSentence = paragraph
    .replace(/\s+/g, " ")
    .split(/[.!?。？！]/)[0]
    .replace(/^[“"'「『(<\[]+/, "")
    .trim();

  if (!firstSentence) {
    return `토론 주제 ${index + 1}`;
  }

  const compactTitle = firstSentence
    .replace(/^(나는|저는|이번\s*토론에서|토론에서는)\s*/, "")
    .slice(0, 18)
    .trim();

  return compactTitle || `토론 주제 ${index + 1}`;
}

function cleanupHeading(value = "") {
  return value
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^주제\s*\d+\s*[:：.-]?\s*/, "")
    .replace(/^소제목\s*[:：]\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
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

function saveReview(nextReview) {
  const reviews = readReviews().map((item) =>
    item.id === nextReview.id ? nextReview : item,
  );

  localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews));
}

function createCoverImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const maxSize = 520;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
