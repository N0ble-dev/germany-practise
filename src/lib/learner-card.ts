type CardDetails = {
  name: string;
  accountId?: string;
  words: number;
  xp: number;
  showStats?: boolean;
};

function loadCardImage(source: string, signal: AbortSignal) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    if (signal.aborted) return resolve(null);
    const image = new Image();
    image.crossOrigin = "anonymous";
    const finish = (result: HTMLImageElement | null) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      image.onload = null;
      image.onerror = null;
      resolve(result);
    };
    const abort = () => {
      image.src = "";
      finish(null);
    };
    const timer = setTimeout(abort, 4000);
    signal.addEventListener("abort", abort, { once: true });
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = source;
  });
}

async function loadAccountPhoto(accountId: string, signal: AbortSignal) {
  try {
    const response = await fetch("/api/profile/photo", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { "X-Learning-Account": accountId },
      signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    });
    if (!response.ok) return null;
    const url = URL.createObjectURL(await response.blob());
    try {
      return await loadCardImage(url, signal);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    signal.throwIfAborted();
    return null;
  }
}

export async function createLearnerCard(
  details: CardDetails,
  signal: AbortSignal,
) {
  const [template, photo] = await Promise.all([
    loadCardImage("/card-front.png", signal),
    details.accountId ? loadAccountPhoto(details.accountId, signal) : null,
    document.fonts.ready,
  ]);
  signal.throwIfAborted();
  if (!template) throw new Error("The learner card image could not load.");
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1125;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Your browser could not prepare the learner card.");
  context.drawImage(template, 0, 0, 800, 1125);
  context.save();
  context.beginPath();
  context.arc(400, 425, 165, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = "#171717";
  context.fillRect(230, 255, 340, 340);
  if (photo) {
    const scale = Math.max(330 / photo.width, 330 / photo.height);
    const width = photo.width * scale,
      height = photo.height * scale;
    context.drawImage(photo, 400 - width / 2, 425 - height / 2, width, height);
  } else {
    context.fillStyle = "#FFCE00";
    context.textAlign = "center";
    context.font = '700 132px "Plus Jakarta Sans Variable", sans-serif';
    context.fillText(
      Array.from(details.name.trim())[0]?.toUpperCase() || "G",
      400,
      470,
    );
  }
  context.restore();
  context.fillStyle = "#FFF9EB";
  context.fillRect(55, 636, 690, 100);
  context.textAlign = "center";
  context.fillStyle = "#171717";
  let size = 46;
  do {
    context.font = `700 ${size}px "Plus Jakarta Sans Variable", sans-serif`;
    if (context.measureText(details.name).width <= 680) break;
    size--;
  } while (size > 20);
  context.fillText(details.name, 400, 705, 680);
  if (details.showStats === false) {
    context.fillStyle = "#FFF9EB";
    context.fillRect(65, 800, 670, 115);
    context.fillStyle = "#171717";
    context.font = '700 28px "Nunito Sans Variable", sans-serif';
    context.fillText("A LITTLE GERMAN, EVERY DAY", 400, 866, 650);
    signal.throwIfAborted();
    return canvas.toDataURL("image/png");
  }
  context.fillStyle = "#171717";
  context.beginPath();
  context.roundRect(100, 824, 280, 75, 37.5);
  context.roundRect(420, 824, 280, 75, 37.5);
  context.fill();
  context.fillStyle = "#FFF9EB";
  context.font = '700 25px "Nunito Sans Variable", sans-serif';
  context.fillText(`${details.words} WORDS`, 240, 872, 240);
  context.fillText(`${details.xp} XP`, 560, 872, 240);
  signal.throwIfAborted();
  return canvas.toDataURL("image/png");
}
