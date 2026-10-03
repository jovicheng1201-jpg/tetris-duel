const ASSET_ROOT = "assets/images/";

const copy = {
  en: {
    brand: "Milo's Little Cloud", languageLabel: "Language", restart: "Restart", progressCaption: "Story path",
    back: "Back", begin: "Begin the story", next: "Next page", choose: "Choose a path", finish: "Play again",
    footer: "Read, choose, and help the forest bloom.", welcomeKicker: "A story about friendship",
    guides: {
      welcome: "Xiaoming: Hi! Xiaohua and I have been best friends since we were little. Let’s help Milo and Puff together!",
      discovery: "Xiaohua: I noticed Puff is shaking. Let’s look closely before we choose what to do.",
      try: "Xiaoming: I love trying new things! Which idea should we test first?",
      mountain: "Xiaohua: Even when a plan does not work, trying together can teach us something.",
      dry: "Xiaohua: The flowers are drooping. Maybe Puff does not need to be big to help.",
      rain: "Xiaoming: We did it! A tiny drop can make a big difference.",
      ending: "Xiaohua: Everyone has a special gift. We just need to notice it.",
    },
    nodes: {
      welcome: { kicker: "A story about friendship", title: "Milo and the Little Cloud", text: "Milo the little fox says hello to everyone in Whispering Woods. One morning, he hears a tiny sniff above him.", image: "cover.svg", alt: "Milo looks up at Puff above a friendly forest" },
      discovery: { kicker: "Chapter 1 · A tiny friend", title: "Who is stuck in the tree?", text: "A small white cloud is caught between two branches. ‘I am Puff,’ the cloud whispers. ‘I am the smallest and slowest cloud in the sky.’ Milo carefully helps Puff float free.", image: "scene01_discovery.svg", alt: "Milo discovers Puff caught in an old oak tree" },
      wind: { kicker: "Chapter 2 · Try together", title: "Let the wind help!", text: "At Windy Hill, the breeze lifts Puff, spins Puff around, and sends Puff toward a bush. Plop! Puff lands safely among purple berries.", image: "scene02_wind.svg", alt: "Puff tries to fly with the wind while Milo watches" },
      mountain: { kicker: "Chapter 3 · Be brave", title: "One more try", text: "Milo and Puff climb Sunbeam Mountain. ‘We can be scared and brave at the same time,’ says Milo. Puff floats from the peak, then drifts gently down.", image: "scene03_mountain.svg", alt: "Milo and Puff stand on Sunbeam Mountain" },
      dry: { kicker: "Chapter 4 · A forest in need", title: "Can Puff help?", text: "The sun grows hot. Flowers bend low, the river grows narrow, and the animals look for water. Puff wants to help, but feels too small.", image: "scene04_dryforest.svg", alt: "The woodland animals wait in a hot dry forest" },
      rain: { kicker: "Chapter 5 · A little drop", title: "Plink!", text: "Puff remembers the thirsty flowers, rabbits, and frogs. Puff relaxes and lets one cool drop fall. Then another. The forest begins to wake up.", image: "scene05_firstdrop.svg", alt: "Puff makes the first raindrop fall on a yellow flower" },
      rainbow: { kicker: "Chapter 6 · A big difference", title: "Small clouds can help", text: "Gentle rain fills the stream and opens the flowers. Everyone dances. Sunlight touches the drops and paints a little rainbow above the trees.", image: "scene06_rainbow.svg", alt: "The refreshed forest shines beneath a rainbow" },
      friends: { kicker: "Chapter 7 · Every gift matters", title: "A place in the sky", text: "The big clouds see what Puff has done. ‘The sky needs every kind of cloud,’ says the ship cloud. Puff no longer feels left behind.", image: "scene07_cloudfriends.svg", alt: "Friendly large clouds welcome Puff in the sky" },
      ending: { kicker: "The end · Welcome, friend", title: "Room for one more", text: "Milo and Puff visit the forest every morning. When a new little cloud arrives, Puff says, ‘Welcome! There is always room for one more friend.’", image: "scene08_welcome.svg", alt: "Milo and Puff welcome a new little cloud" },
    },
    choices: {
      discovery: [
        { label: "Climb carefully and free Puff", result: "Milo reaches the branch slowly. Puff feels safe because Milo takes care." },
        { label: "Call the birds for help", result: "Milo asks for help. The birds guide him to a safe path up the tree." },
      ],
      wind: [
        { label: "Try the playful wind", result: "Whoosh! Puff learns that falling with style can still be fun." },
        { label: "Ask three birds to pull", result: "Pull, pull, pull! The birds help Puff rise, and everyone laughs together." },
      ],
      ending: [
        { label: "Welcome the new cloud", result: "Puff shares the forest and introduces a new friend to Milo." },
        { label: "Make a tiny rain hello", result: "Puff sprinkles three bright drops. The new cloud smiles and stays." },
      ],
    },
  },
  "zh-TW": {
    brand: "米洛的小雲朵", languageLabel: "語言", restart: "重新開始", progressCaption: "故事進度",
    back: "上一頁", begin: "開始故事", next: "下一頁", choose: "選擇行動", finish: "再玩一次",
    footer: "閱讀、選擇，幫助森林重新綻放。", welcomeKicker: "一個關於友誼的故事",
    guides: {
      welcome: "小明：嗨！我和小華從小就是最好的朋友。讓我們一起幫助米洛和 Puff 吧！",
      discovery: "小華：我注意到 Puff 正在發抖。先仔細觀察，再決定怎麼幫忙吧。",
      try: "小明：我最喜歡嘗試新方法了！我們先試哪一個？",
      mountain: "小華：即使方法沒有成功，只要一起嘗試，就能學到新的事物。",
      dry: "小華：花朵都垂下頭了。也許 Puff 不需要變大，也能幫上忙。",
      rain: "小明：我們做到了！小小的一滴水，也能帶來大大的改變。",
      ending: "小華：每個人都有特別的才能，只要我們願意發現它。",
    },
    nodes: {
      welcome: { kicker: "一個關於友誼的故事", title: "米洛和小雲朵", text: "小狐狸米洛每天都向低語森林裡的朋友打招呼。一天早上，他聽見頭頂傳來細小的啜泣聲。", image: "cover.svg", alt: "米洛抬頭看著森林上方的 Puff" },
      discovery: { kicker: "第一章．小小的朋友", title: "誰被卡在樹上？", text: "一朵小白雲卡在兩根樹枝之間。「我叫 Puff，」小雲朵小聲說，「我是天空中最小、最慢的雲。」米洛小心地幫助 Puff 飄出來。", image: "scene01_discovery.svg", alt: "米洛發現 Puff 被卡在老橡樹上" },
      wind: { kicker: "第二章．一起嘗試", title: "讓風來幫忙！", text: "在風之丘，微風把 Puff 吹起來、轉了一圈，接著把 Puff 吹向莓果樹叢。噗通！Puff 安全地落在紫色莓果中。", image: "scene02_wind.svg", alt: "Puff 嘗試乘著風飛行，米洛在旁邊觀看" },
      mountain: { kicker: "第三章．勇敢一點", title: "再試一次", text: "米洛和 Puff 爬上陽光山。「害怕的時候，我們也可以同時保持勇敢，」米洛說。Puff 從山頂飄起，然後輕輕地落下。", image: "scene03_mountain.svg", alt: "米洛和 Puff 站在陽光山上" },
      dry: { kicker: "第四章．需要幫助的森林", title: "Puff 能幫忙嗎？", text: "太陽越來越熱，花朵低下頭，河流變得狹窄，動物們四處尋找水。Puff 想幫忙，卻覺得自己太小了。", image: "scene04_dryforest.svg", alt: "森林動物們在炎熱乾燥的森林裡等待" },
      rain: { kicker: "第五章．小小的雨滴", title: "滴答！", text: "Puff 想起口渴的花朵、兔子和青蛙。Puff 放鬆身體，讓一滴清涼的水落下，接著又一滴。森林開始甦醒。", image: "scene05_firstdrop.svg", alt: "Puff 讓第一滴雨落在黃色花朵上" },
      rainbow: { kicker: "第六章．大大的改變", title: "小雲朵也能幫忙", text: "溫柔的雨水填滿小溪，花朵重新綻放。大家一起跳舞。陽光照在雨滴上，在樹林上方畫出一道小彩虹。", image: "scene06_rainbow.svg", alt: "雨後的森林在彩虹下閃閃發亮" },
      friends: { kicker: "第七章．每份才能都重要", title: "天空裡的位置", text: "大雲朵看見 Puff 做的事。「天空需要每一種雲，」船形雲朵說。Puff 不再覺得自己被落下了。", image: "scene07_cloudfriends.svg", alt: "友善的大雲朵在天空中歡迎 Puff" },
      ending: { kicker: "結尾．歡迎你，朋友", title: "永遠多一個位置", text: "米洛和 Puff 每天早上都拜訪森林。當一朵新的小雲來到時，Puff 說：「歡迎！這裡永遠有位置留給新朋友。」", image: "scene08_welcome.svg", alt: "米洛和 Puff 歡迎一朵新的小雲" },
    },
    choices: {
      discovery: [
        { label: "小心爬上去，救出 Puff", result: "米洛慢慢爬到樹枝旁。因為米洛很小心，Puff 感到很安心。" },
        { label: "請小鳥朋友幫忙", result: "米洛請小鳥帶路，牠們一起找到安全的爬樹路線。" },
      ],
      wind: [
        { label: "試試淘氣的風", result: "呼——！Puff 發現，即使是有趣地跌落，也可以很快樂。" },
        { label: "請三隻小鳥拉一拉", result: "拉呀、拉呀、拉呀！小鳥幫 Puff 升高，大家一起笑了起來。" },
      ],
      ending: [
        { label: "歡迎新的小雲朵", result: "Puff 分享森林，也把新朋友介紹給米洛。" },
        { label: "用小雨滴打招呼", result: "Puff 灑下三滴閃亮的雨水。新朋友笑了，並留了下來。" },
      ],
    },
  },
};

const route = ["welcome", "discovery", "wind", "mountain", "dry", "rain", "rainbow", "friends", "ending"];
let language = "en";
let currentIndex = 0;
let history = [];
let choiceResult = "";
let selectedChoice = false;

const $ = (id) => document.getElementById(id);

function t(key) { return copy[language][key]; }

function applyStaticLanguage() {
  document.documentElement.lang = language === "zh-TW" ? "zh-Hant" : "en";
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = t(element.dataset.i18n);
    if (value) element.textContent = value;
  });
  $("language-select").setAttribute("aria-label", t("languageLabel"));
  $("restart-button").setAttribute("title", t("restart"));
}

function guideFor(nodeKey) {
  if (nodeKey === "welcome") return t("guides").welcome;
  if (nodeKey === "discovery") return t("guides").discovery;
  if (nodeKey === "wind") return t("guides").try;
  if (nodeKey === "mountain") return t("guides").mountain;
  if (nodeKey === "dry") return t("guides").dry;
  if (nodeKey === "rain") return t("guides").rain;
  return t("guides").ending;
}

function renderChoices(nodeKey) {
  const choices = t("choices")[nodeKey];
  const container = $("choices");
  container.innerHTML = "";
  selectedChoice = false;
  choiceResult = "";
  if (!choices) return;
  const label = document.createElement("p");
  label.className = "eyebrow";
  label.textContent = t("choose");
  container.append(label);
  choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.textContent = `${index + 1}. ${choice.label}`;
    button.addEventListener("click", () => {
      selectedChoice = true;
      choiceResult = choice.result;
      container.querySelectorAll(".choice-button").forEach((b) => { b.setAttribute("aria-pressed", "false"); });
      button.setAttribute("aria-pressed", "true");
      const result = document.createElement("p");
      result.className = "choice-result";
      result.textContent = choice.result;
      const oldResult = container.querySelector(".choice-result");
      if (oldResult) oldResult.replaceWith(result); else container.append(result);
      $("next-button").focus();
    });
    container.append(button);
  });
}

function render() {
  applyStaticLanguage();
  const key = route[currentIndex];
  const node = t("nodes")[key];
  $("story-kicker").textContent = node.kicker;
  $("story-title").textContent = node.title;
  $("story-text").textContent = node.text;
  $("guide-text").textContent = guideFor(key);
  $("scene-image").src = ASSET_ROOT + node.image;
  $("scene-image").alt = node.alt;
  $("scene-badge").textContent = String(currentIndex + 1);
  $("progress-label").textContent = `${currentIndex + 1} / ${route.length}`;
  $("progress-fill").style.width = `${((currentIndex + 1) / route.length) * 100}%`;
  $("back-button").disabled = currentIndex === 0;
  $("next-button").textContent = currentIndex === route.length - 1 ? t("finish") : (currentIndex === 0 ? t("begin") : t("next"));
  renderChoices(key);
}

function moveNext() {
  const key = route[currentIndex];
  if (t("choices")[key] && !selectedChoice) {
    $("choices").animate([{ transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 260 });
    return;
  }
  if (currentIndex === route.length - 1) {
    currentIndex = 0;
    history = [];
  } else {
    history.push(currentIndex);
    currentIndex += 1;
  }
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function moveBack() {
  if (!history.length) return;
  currentIndex = history.pop();
  render();
}

$("next-button").addEventListener("click", moveNext);
$("back-button").addEventListener("click", moveBack);
$("restart-button").addEventListener("click", () => { currentIndex = 0; history = []; render(); });
$("brand-link").addEventListener("click", (event) => { event.preventDefault(); currentIndex = 0; history = []; render(); });
$("language-select").addEventListener("change", (event) => { language = event.target.value; render(); });
$("scene-image").addEventListener("error", (event) => { event.currentTarget.src = ASSET_ROOT + "cover.svg"; event.currentTarget.alt = "Story illustration"; });

render();
