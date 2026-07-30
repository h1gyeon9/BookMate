const REVIEW_STORAGE_KEY = "bookmate.readingReviews.v1";

const recordList = document.querySelector(".recordList");

renderLocalReviews();
scrollToHashRecord();

function renderLocalReviews() {
  const reviews = readReviews();

  if (!recordList || reviews.length === 0) {
    return;
  }

  const firstStaticRecord = recordList.firstElementChild;

  reviews.forEach((review) => {
    recordList.insertBefore(createReviewCard(review), firstStaticRecord);
  });
}

function scrollToHashRecord() {
  const targetId = decodeURIComponent(window.location.hash.replace("#", ""));

  if (!targetId) {
    return;
  }

  const target = document.getElementById(targetId);

  if (target) {
    target.scrollIntoView({ block: "start" });
  }
}

function createReviewCard(review) {
  const reviewText = review.text || "";
  const reviewTitle = review.title || extractTitle(reviewText);
  const card = document.createElement("article");
  card.className = "recordCard generatedRecord";
  card.id = `local-review-${review.id}`;

  const top = document.createElement("div");
  top.className = "recordTop";

  const titleWrap = document.createElement("div");
  titleWrap.className = "recordTitle";

  const badge = document.createElement("span");
  badge.className = "localBadge";
  badge.textContent = "로컬";

  const title = document.createElement("h3");
  title.textContent = reviewTitle;

  const openButton = document.createElement("a");
  openButton.className = "openBtn";
  openButton.href = `./localReviewDetail.html?id=${encodeURIComponent(review.id)}`;
  openButton.setAttribute("aria-label", "저장된 독서록 자세히 보기");

  const openIcon = document.createElement("img");
  openIcon.src = "./src/downTriangle.png";
  openIcon.alt = "";

  const content = document.createElement("p");
  content.className = "recordContent";
  content.textContent = makePreview(reviewText, reviewTitle);

  const meta = document.createElement("p");
  meta.className = "generatedRecordMeta";
  meta.textContent = makeMeta(review);

  openButton.appendChild(openIcon);
  titleWrap.appendChild(badge);
  titleWrap.appendChild(title);
  top.appendChild(titleWrap);
  top.appendChild(openButton);
  card.appendChild(top);
  card.appendChild(meta);
  card.appendChild(content);

  return card;
}

function readReviews() {
  try {
    const rawValue = localStorage.getItem(REVIEW_STORAGE_KEY);
    const reviews = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(reviews)
      ? reviews.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      : [];
  } catch {
    return [];
  }
}

function extractTitle(text = "") {
  const firstLine = text.split("\n").find((line) => line.trim());
  return firstLine
    ?.replace(/^독서록\s*제목[:：]\s*/, "")
    .replace(/^제목[:：]\s*/, "")
    .replace(/^#+\s*/, "")
    .trim() || "새 독서록";
}

function makePreview(text = "", title = "") {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const bodyLines =
    title && extractTitle(lines[0] || "") === title
      ? lines.slice(1)
      : lines;
  const normalizedText = bodyLines
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalizedText.length <= 120) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, 120)}...`;
}

function makeMeta(review) {
  const dateText = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "저장일 없음";
  const personas = review.personas?.length ? review.personas.join(", ") : "페르소나 기록 없음";

  return `${dateText} · ${personas}`;
}
