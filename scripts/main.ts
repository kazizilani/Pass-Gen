// --- Character sets ---
class CharSet {
  constructor(characters) {
    this.characters = characters;
  }

  getAll() {
    return this.characters;
  }
}

class LowerCaseSet extends CharSet {
  constructor() {
    super(Array.from("abcdefghijklmnopqrstuvwxyz"));
  }
}

class UpperCaseSet extends CharSet {
  constructor() {
    super(Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ"));
  }
}

class NumberSet extends CharSet {
  constructor() {
    super(Array.from("0123456789"));
  }
}

class SymbolSet extends CharSet {
  constructor() {
    super(Array.from(`!@#$%^&*()-_=+[]{};:'",.<>/?\\|~\``));
  }
}

// --- Password Generator (Single Responsibility + Open/Closed) ---
class PasswordGenerator {
  constructor(charSets) {
    this.charSets = charSets;
  }

  generate(length) {
    const pool = this.charSets.flatMap((set) => set.getAll());
    if (!pool.length) return "";

    const result = [];
    const randomBytes = new Uint32Array(length);
    crypto.getRandomValues(randomBytes);

    for (let i = 0; i < length; i++) {
      const index = randomBytes[i] % pool.length;
      result.push(pool[index]);
    }

    return result.join("");
  }
}

// --- Password Stats (Single Responsibility) ---
class PasswordStatsCalculator {
  constructor(symbolsLength) {
    this.symbolsLength = symbolsLength;
  }

  calculate(password) {
    let pool = 0;
    if (/[a-z]/.test(password)) pool += 26;
    if (/[A-Z]/.test(password)) pool += 26;
    if (/[0-9]/.test(password)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(password)) pool += this.symbolsLength;

    const entropyBits = Math.log2(Math.pow(pool, password.length));
    const guessesPerSecond = 1e12;
    const crackTimeSeconds = Math.pow(2, entropyBits) / guessesPerSecond;

    return { entropyBits, crackTimeSeconds };
  }
}

// --- Crack Time Formatter ---
class CrackTimeFormatter {
  static format(seconds) {
    const minute = 60,
      hour = 3600,
      day = 86400,
      year = 31557600;

    if (seconds < 60) return `${seconds.toFixed(2)} Seconds`;
    if (seconds < hour) return `${(seconds / minute).toFixed(2)} Minutes`;
    if (seconds < day) return `${(seconds / hour).toFixed(2)} Hours`;
    if (seconds < year) return `${(seconds / day).toFixed(2)} Days`;

    let years = seconds / year;
    const units = ["", "Thousand", "Million", "Billion", "Trillion"];
    let idx = 0;
    while (years >= 1000 && idx < units.length - 1) {
      years /= 1000;
      idx++;
    }
    return `${years.toFixed(2)} ${units[idx]} Years`;
  }
}

// --- Password Strength ---
class PasswordStrength {
  constructor(colorCode) {
    this.colorCode = colorCode;
  }

  determine(entropyBits) {
    if (entropyBits < 28) return 0;
    if (entropyBits < 36) return 1;
    if (entropyBits < 60) return 2;
    if (entropyBits < 128) return 3;
    return 4;
  }

  getColorAndText(entropyBits) {
    const idx = this.determine(entropyBits);
    return this.colorCode[idx];
  }
}

// --- Controller / UI Handler ---
class PasswordUI {
  constructor(generator, statsCalculator, strength, elements) {
    this.generator = generator;
    this.statsCalculator = statsCalculator;
    this.strength = strength;
    this.elements = elements;

    this.attachEvents();
    this.updatePassword();
  }

  attachEvents() {
    const { slider, valueDisplay, checkboxes, refreshBtn, copyBtn } =
      this.elements;

    slider.addEventListener("input", () => {
      valueDisplay.innerText = slider.value;
      this.updatePassword();
    });

    checkboxes.forEach((cb) =>
      cb.addEventListener("change", () => this.updatePassword())
    );

    refreshBtn.addEventListener("click", () => this.updatePassword());
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(this.elements.passwordDisplay.innerText);
      alert("Password copied to clipboard!");
    });
  }

  updatePassword() {
    const {
      slider,
      upcCheck,
      lwcCheck,
      numbersCheck,
      symbolsCheck,
      passwordDisplay,
      entropyField,
      crackTimeField,
      strengthText,
      strengthLight,
    } = this.elements;

    const activeSets = [];
    if (lwcCheck.checked) activeSets.push(new LowerCaseSet());
    if (upcCheck.checked) activeSets.push(new UpperCaseSet());
    if (numbersCheck.checked) activeSets.push(new NumberSet());
    if (symbolsCheck.checked) activeSets.push(new SymbolSet());

    const pwd = new PasswordGenerator(activeSets).generate(
      Number(slider.value)
    );
    passwordDisplay.innerText = pwd;

    const stats = this.statsCalculator.calculate(pwd);
    entropyField.innerText = `~ ${Math.round(stats.entropyBits)} Bits`;
    crackTimeField.innerText = CrackTimeFormatter.format(
      stats.crackTimeSeconds
    );

    const { type, color } = this.strength.getColorAndText(stats.entropyBits);
    strengthText.innerText = type;
    strengthLight.style.backgroundColor = color;
  }
}

// --- Initialization ---
const colorCode = [
  { id: 0, type: "Very Weak", color: "#A10702" },
  { id: 1, type: "Weak", color: "#F3A712" },
  { id: 2, type: "Reasonable", color: "#8CD867" },
  { id: 3, type: "Strong", color: "#04E762" },
  { id: 4, type: "Very Strong", color: "#0C7489" },
];

const elements = {
  slider: document.querySelector(".slider input"),
  valueDisplay: document.getElementById("value"),
  upcCheck: document.getElementById("upc"),
  lwcCheck: document.getElementById("lwc"),
  numbersCheck: document.getElementById("numbers"),
  symbolsCheck: document.getElementById("symbols"),
  passwordDisplay: document.getElementById("the-password"),
  strengthText: document.getElementById("strength-text"),
  strengthLight: document.getElementById("light"),
  entropyField: document.getElementById("entropy"),
  crackTimeField: document.getElementById("yt"),
  refreshBtn: document.getElementById("refresh"),
  copyBtn: document.getElementById("copy"),
  checkboxes: [
    document.getElementById("upc"),
    document.getElementById("lwc"),
    document.getElementById("numbers"),
    document.getElementById("symbols"),
  ],
};

new PasswordUI(
  new PasswordGenerator([]),
  new PasswordStatsCalculator(new SymbolSet().getAll().length),
  new PasswordStrength(colorCode),
  elements
);
