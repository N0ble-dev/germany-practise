import { lessons } from "./content";
import type { Word } from "./learning";
import { wordEvidenceSchema } from "./journey-model";

export interface QuizQuestion {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}
export interface MissionCriterion {
  id: string;
  label: string;
  pattern: string;
}
export interface BookLesson {
  number: number;
  title: string;
  goal: string;
  place: string;
  story: string;
  outcomes: string[];
  words: Word[];
  patterns: string[];
  sound: { title: string; tip: string; examples: string[] };
  dialogue: { speaker: string; german: string; english: string }[];
  listening: QuizQuestion[];
  grammar: QuizQuestion[];
  mission: {
    title: string;
    prompt: string;
    hint: string;
    criteria: MissionCriterion[];
  };
}
type WordRow = [
  german: string,
  english: string,
  arabic: string,
  example: string,
  plural?: string,
];
function words(lesson: number, rows: WordRow[]): Word[] {
  return rows.map(([text, english, arabic, example, plural = ""], i) => {
    const match = text.match(/^(der|die|das) (.+)$/);
    const german = match ? match[2] : text;
    return {
      id: `book-${lesson}-${i}`,
      german,
      english,
      arabic,
      example,
      plural,
      article: match ? (match[1] as Word["article"]) : "",
      type: match ? "noun" : /^[a-zäöüß]+en$/.test(german) ? "verb" : "phrase",
      topic: lessons[lesson - 1].topic,
      lesson,
      hint: "",
      favorite: false,
      status: "new",
      due: "2020-01-01T00:00:00.000Z",
      interval: 0,
      ease: 2.5,
      reviews: 0,
      mistakes: 0,
      evidence: wordEvidenceSchema.parse({}),
    };
  });
}
const q = (
  prompt: string,
  options: string[],
  answer: number,
  explanation: string,
): QuizQuestion => ({ prompt, options, answer, explanation });
const c = (id: string, label: string, pattern: string): MissionCriterion => ({
  id,
  label,
  pattern,
});
const dialogue = (rows: [string, string][]) =>
  rows.map(([german, english], i) => ({
    speaker: i % 2 ? "B" : "A",
    german,
    english,
  }));
export const bookLessons: BookLesson[] = [
  {
    number: 1,
    title: "Hallo! Ich bin …",
    goal: "Introduce yourself to a new classmate.",
    place: "Sprachschule",
    story:
      "It’s your first morning at a language school. Someone sits next to you. A greeting is all you need to begin.",
    outcomes: [
      "Greet someone and say goodbye",
      "Give your name, country, city, and how you feel",
      "Ask someone their name",
    ],
    words: words(1, [
      ["Hallo", "hello", "مرحباً", "Hallo! Wie geht's?"],
      [
        "Guten Morgen",
        "good morning",
        "صباح الخير",
        "Guten Morgen! Ich bin Nabil.",
      ],
      ["Guten Tag", "good day", "نهارك سعيد", "Guten Tag! Wie heißen Sie?"],
      [
        "Guten Abend",
        "good evening",
        "مساء الخير",
        "Guten Abend! Wie geht es Ihnen?",
      ],
      ["Tschüss", "bye", "وداعاً", "Tschüss! Bis morgen."],
      [
        "Auf Wiedersehen",
        "goodbye",
        "إلى اللقاء",
        "Auf Wiedersehen, Frau Müller.",
      ],
      ["heißen", "to be called", "يُدعى", "Ich heiße Nabil."],
      ["kommen", "to come", "يأتي", "Ich komme aus Ägypten."],
      ["wohnen", "to live", "يسكن", "Ich wohne in Alexandria."],
      ["gut", "good", "جيد", "Mir geht's gut."],
      ["Ägypten", "Egypt", "مصر", "Ich komme aus Ägypten."],
      ["Deutsch", "German", "الألمانية", "Ich lerne Deutsch."],
    ]),
    patterns: [
      "Ich heiße {name}.",
      "Ich komme aus {country}.",
      "Ich wohne in {city}.",
      "Wie heißt du?",
      "Wie heißen Sie?",
      "Mir geht's gut. Und dir?",
    ],
    sound: {
      title: "Sentence melody",
      tip: "Listen to a greeting, a statement, and a question. Copy the whole phrase and its rhythm, rather than saying each word separately.",
      examples: ["Hallo!", "Ich heiße Nabil.", "Wie heißt du?"],
    },
    dialogue: dialogue([
      [
        "Guten Tag! Ich heiße Nabil. Wie heißen Sie?",
        "Hello! My name is Nabil. What is your name?",
      ],
      ["Ich heiße Anna. Freut mich.", "My name is Anna. Nice to meet you."],
      [
        "Freut mich auch. Woher kommen Sie?",
        "Nice to meet you too. Where are you from?",
      ],
      ["Ich komme aus Deutschland. Und Sie?", "I’m from Germany. And you?"],
      ["Ich komme aus Ägypten.", "I’m from Egypt."],
    ]),
    listening: [
      q(
        "What is the first speaker's name?",
        ["Anna", "Nabil", "Lukas"],
        1,
        "Ich heiße Nabil introduces the first speaker.",
      ),
      q(
        "Where does Anna come from?",
        ["Ägypten", "Deutschland", "Italien"],
        1,
        "Anna says Ich komme aus Deutschland.",
      ),
      q(
        "What does Freut mich express?",
        ["Nice to meet you", "I am tired", "See you tomorrow"],
        0,
        "Freut mich is a friendly way to meet someone.",
      ),
    ],
    grammar: [
      q(
        "Ich ___ Nabil.",
        ["heiße", "heißt", "heißen"],
        0,
        "With ich, use heiße.",
      ),
      q(
        "Woher ___ du?",
        ["komme", "kommst", "kommen"],
        1,
        "The du form is kommst.",
      ),
      q(
        "Ich ___ in Alexandria.",
        ["wohnst", "wohnen", "wohne"],
        2,
        "The ich form ends in -e: wohne.",
      ),
    ],
    mission: {
      title: "Your first day at language school",
      prompt:
        "Without reading the examples, write or dictate a short introduction: greet your classmate, give your name, country and city, say how you feel, ask their name, and say goodbye.",
      hint: "Hallo! Ich heiße … Ich komme aus … Ich wohne in … Mir geht's … Wie heißt du? Tschüss!",
      criteria: [
        c(
          "greeting",
          "Greet your classmate",
          "\\b(hallo|guten (morgen|tag|abend))\\b",
        ),
        c("name", "Give your name", "ich (heiße|heisse|bin) \\S+"),
        c("country", "Say where you come from", "ich komme aus \\S+"),
        c("city", "Say where you live", "ich wohne in \\S+"),
        c(
          "feeling",
          "Say how you feel",
          "mir geht.{0,8}(gut|super|schlecht|prima)|ich bin (gut|müde|glücklich)",
        ),
        c(
          "question",
          "Ask their name",
          "wie (heißt|heisst|heißen|heissen) (du|sie)",
        ),
        c(
          "goodbye",
          "Say goodbye",
          "tschüss|tschuess|auf wiedersehen|bis (bald|morgen)",
        ),
      ],
    },
  },
  {
    number: 2,
    title: "Ich bin Softwareentwickler",
    goal: "Tell someone a little about your life and work.",
    place: "Sprachschule",
    story:
      "A classmate asks what you do. Share a simple profile: your work, where you live, and the languages you speak.",
    outcomes: [
      "Say and ask a profession",
      "Read and write a short personal profile",
      "Use numbers for age and contact details",
    ],
    words: words(2, [
      [
        "der Beruf",
        "profession",
        "مهنة",
        "Was sind Sie von Beruf?",
        "die Berufe",
      ],
      ["arbeiten", "to work", "يعمل", "Ich arbeite heute."],
      [
        "der Student",
        "male student",
        "طالب",
        "Er ist Student.",
        "die Studenten",
      ],
      [
        "die Studentin",
        "female student",
        "طالبة",
        "Sie ist Studentin.",
        "die Studentinnen",
      ],
      ["der Lehrer", "male teacher", "معلّم", "Er ist Lehrer.", "die Lehrer"],
      [
        "die Lehrerin",
        "female teacher",
        "معلّمة",
        "Sie ist Lehrerin.",
        "die Lehrerinnen",
      ],
      ["der Arzt", "male doctor", "طبيب", "Er ist Arzt.", "die Ärzte"],
      [
        "die Ärztin",
        "female doctor",
        "طبيبة",
        "Sie ist Ärztin.",
        "die Ärztinnen",
      ],
      [
        "der Softwareentwickler",
        "software developer",
        "مطور برامج",
        "Ich bin Softwareentwickler.",
        "die Softwareentwickler",
      ],
      ["ledig", "single", "أعزب", "Ich bin ledig."],
      ["verheiratet", "married", "متزوج", "Sie ist verheiratet."],
      [
        "die Telefonnummer",
        "phone number",
        "رقم الهاتف",
        "Wie ist Ihre Telefonnummer?",
        "die Telefonnummern",
      ],
    ]),
    patterns: [
      "Was bist du von Beruf?",
      "Ich bin {profession}.",
      "Ich arbeite als {profession}.",
      "Ich wohne in {city}.",
      "Ich bin ledig.",
      "Ich arbeite heute nicht.",
    ],
    sound: {
      title: "Word stress",
      tip: "One syllable is stronger. Listen and say AR-bei-ten, LEH-rer, Stu-DENT, and Te-le-FON. Capital letters here mark stress; they do not change spelling.",
      examples: ["arbeiten", "Lehrer", "Student", "Telefon"],
    },
    dialogue: dialogue([
      ["Was bist du von Beruf?", "What is your profession?"],
      ["Ich bin Softwareentwickler.", "I’m a software developer."],
      ["Wo wohnst du?", "Where do you live?"],
      [
        "Ich wohne in Alexandria. Ich bin 28 Jahre alt.",
        "I live in Alexandria. I’m 28 years old.",
      ],
    ]),
    listening: [
      q(
        "What is the person's profession?",
        ["Arzt", "Softwareentwickler", "Lehrer"],
        1,
        "Ich bin Softwareentwickler gives the profession.",
      ),
      q(
        "Which city is mentioned?",
        ["Berlin", "Alexandria", "Kairo"],
        1,
        "The speaker lives in Alexandria.",
      ),
      q(
        "How old is the speaker?",
        ["18", "28", "38"],
        1,
        "Achtundzwanzig means 28.",
      ),
    ],
    grammar: [
      q("Er ___ Lehrer.", ["bin", "ist", "sind"], 1, "Use er ist."),
      q(
        "Du ___ heute.",
        ["arbeite", "arbeiten", "arbeitest"],
        2,
        "arbeiten adds -est with du: arbeitest.",
      ),
      q(
        "I am not working today.",
        [
          "Ich arbeite heute nicht.",
          "Ich nicht arbeite heute.",
          "Ich arbeitet heute nicht.",
        ],
        0,
        "Keep arbeite second; nicht negates the statement.",
      ),
    ],
    mission: {
      title: "Build your German profile",
      prompt:
        "Introduce yourself with your name, age, home, profession, and languages. Use your real details or an imaginary profile.",
      hint: "Ich heiße … Ich bin … Jahre alt. Ich wohne in … Ich bin … von Beruf. Ich spreche …",
      criteria: [
        c("name", "Give a name", "ich (heiße|heisse|bin) \\S+"),
        c(
          "age",
          "Give an age",
          "\\d{1,3} jahre alt|ich bin [a-zäöüß]+ jahre alt",
        ),
        c("home", "Say where you live", "ich wohne in \\S+"),
        c(
          "job",
          "Say your profession",
          "ich (bin .{2,60}(von beruf|entwickler|entwicklerin|student|studentin|lehrer|lehrerin|arzt|ärztin|ingenieur|ingenieurin)|arbeite als \\S+)",
        ),
        c("languages", "Mention your languages", "ich spreche \\S+"),
      ],
    },
  },
  {
    number: 3,
    title: "Das ist meine Familie",
    goal: "Introduce your family and the languages you speak.",
    place: "Sprachschule",
    story:
      "Show a classmate an imaginary family photo. Tell them who is in it and what languages you share.",
    outcomes: [
      "Introduce family members",
      "Use mein and meine",
      "Ask about family and languages",
    ],
    words: words(3, [
      [
        "die Familie",
        "family",
        "عائلة",
        "Das ist meine Familie.",
        "die Familien",
      ],
      ["die Mutter", "mother", "أم", "Das ist meine Mutter.", "die Mütter"],
      [
        "der Vater",
        "father",
        "أب",
        "Mein Vater spricht Arabisch.",
        "die Väter",
      ],
      ["der Bruder", "brother", "أخ", "Ich habe einen Bruder.", "die Brüder"],
      [
        "die Schwester",
        "sister",
        "أخت",
        "Meine Schwester heißt Mariam.",
        "die Schwestern",
      ],
      [
        "die Eltern",
        "parents",
        "الوالدان",
        "Meine Eltern wohnen in Kairo.",
        "die Eltern",
      ],
      ["der Sohn", "son", "ابن", "Das ist mein Sohn.", "die Söhne"],
      [
        "die Tochter",
        "daughter",
        "ابنة",
        "Das ist meine Tochter.",
        "die Töchter",
      ],
      ["sprechen", "to speak", "يتحدث", "Ich spreche Arabisch."],
      ["Arabisch", "Arabic", "العربية", "Ich spreche Arabisch."],
      ["Englisch", "English", "الإنجليزية", "Sie spricht Englisch."],
      [
        "ein bisschen",
        "a little",
        "قليلاً",
        "Ich spreche ein bisschen Deutsch.",
      ],
    ]),
    patterns: [
      "Das ist meine Mutter.",
      "Das ist mein Vater.",
      "Hast du Geschwister?",
      "Ich habe einen Bruder.",
      "Welche Sprachen sprichst du?",
      "Ich spreche {languages} und ein bisschen Deutsch.",
    ],
    sound: {
      title: "Question melody",
      tip: "Compare a statement, a yes/no question, and a W-question. Listen to the whole sentence and notice the verb's place.",
      examples: [
        "Du sprichst Deutsch.",
        "Sprichst du Deutsch?",
        "Welche Sprachen sprichst du?",
      ],
    },
    dialogue: dialogue([
      ["Wer ist das?", "Who is that?"],
      ["Das ist meine Schwester.", "That is my sister."],
      ["Wie heißt sie?", "What is her name?"],
      ["Sie heißt Mariam.", "Her name is Mariam."],
      ["Spricht sie Deutsch?", "Does she speak German?"],
      ["Nein, aber sie spricht Englisch.", "No, but she speaks English."],
    ]),
    listening: [
      q(
        "Who is in the photo?",
        ["A sister", "A father", "A son"],
        0,
        "Meine Schwester means my sister.",
      ),
      q(
        "What is her name?",
        ["Anna", "Mariam", "Sara"],
        1,
        "Sie heißt Mariam.",
      ),
      q(
        "Which language does she speak?",
        ["Deutsch", "Englisch", "Spanisch"],
        1,
        "She speaks English, not German.",
      ),
    ],
    grammar: [
      q(
        "Das ist ___ Mutter.",
        ["mein", "meinen", "meine"],
        2,
        "Mutter is feminine: meine Mutter.",
      ),
      q(
        "Das ist ___ Vater.",
        ["meine", "mein", "meinen"],
        1,
        "Vater is masculine: mein Vater.",
      ),
      q(
        "Which question asks about languages?",
        [
          "Welche Sprachen sprichst du?",
          "Welche Sprachen du sprichst?",
          "Welche Sprachen spricht du?",
        ],
        0,
        "Put sprichst after the question phrase.",
      ),
    ],
    mission: {
      title: "Introduce your family photo",
      prompt:
        "Describe two people in an imaginary family photo. Give a name, mention languages, and ask your classmate about their family.",
      hint: "Das ist meine … Sie heißt … Das ist mein … Ich spreche … Hast du Geschwister?",
      criteria: [
        c(
          "person1",
          "Introduce a female family member",
          "(meine|meiner) (mutter|schwester|tochter)",
        ),
        c(
          "person2",
          "Introduce a male family member",
          "mein (vater|bruder|sohn)",
        ),
        c("name", "Give someone's name", "(sie|er) (heißt|heisst) \\S+"),
        c(
          "language",
          "Mention languages",
          "(ich|sie|er) (spreche|spricht|sprechen) \\S+",
        ),
        c(
          "question",
          "Ask about family",
          "hast du (geschwister|einen bruder|eine schwester)|haben sie geschwister",
        ),
      ],
    },
  },
  {
    number: 4,
    title: "Der Tisch ist schön",
    goal: "Ask a price and describe furniture you like.",
    place: "Wohnung",
    story:
      "You need furniture for a new room. Look at a table, a sofa, and a lamp; ask a price and say what you think.",
    outcomes: [
      "Name furniture with its article",
      "Ask and understand a price",
      "Describe size, appearance, and price",
    ],
    words: words(4, [
      ["der Tisch", "table", "طاولة", "Was kostet der Tisch?", "die Tische"],
      ["der Stuhl", "chair", "كرسي", "Der Stuhl ist schön.", "die Stühle"],
      ["das Bett", "bed", "سرير", "Das Bett ist groß.", "die Betten"],
      ["das Sofa", "sofa", "أريكة", "Das Sofa kostet 200 Euro.", "die Sofas"],
      [
        "der Schrank",
        "wardrobe",
        "خزانة",
        "Der Schrank ist klein.",
        "die Schränke",
      ],
      ["die Lampe", "lamp", "مصباح", "Die Lampe ist teuer.", "die Lampen"],
      ["schön", "beautiful", "جميل", "Ich finde das Sofa schön."],
      ["teuer", "expensive", "غالي", "Die Lampe ist zu teuer."],
      ["billig", "cheap", "رخيص", "Der Tisch ist billig."],
      ["groß", "big", "كبير", "Das Bett ist groß."],
      ["klein", "small", "صغير", "Der Tisch ist klein."],
      ["kosten", "to cost", "يكلف", "Was kostet das Sofa?"],
    ]),
    patterns: [
      "Was kostet der Tisch?",
      "Der Tisch kostet 80 Euro.",
      "Wie findest du das Sofa?",
      "Ich finde es schön.",
      "Die Lampe ist zu teuer.",
    ],
    sound: {
      title: "Long and short vowels",
      tip: "Compare vowel length: Stuhl has a long u; Mutter has a short u. Listen, repeat, then use each word in a sentence.",
      examples: ["Stuhl", "Mutter", "Der Stuhl ist schön."],
    },
    dialogue: dialogue([
      ["Was kostet der Tisch?", "How much does the table cost?"],
      ["Der Tisch kostet 80 Euro.", "The table costs 80 euros."],
      ["Und die Lampe?", "And the lamp?"],
      ["Die Lampe kostet 20 Euro.", "The lamp costs 20 euros."],
      ["Ich finde den Tisch schön.", "I think the table is beautiful."],
    ]),
    listening: [
      q(
        "How much is the table?",
        ["20 Euro", "80 Euro", "180 Euro"],
        1,
        "The table costs achtzig Euro.",
      ),
      q(
        "What costs 20 Euro?",
        ["The lamp", "The sofa", "The bed"],
        0,
        "Die Lampe kostet 20 Euro.",
      ),
      q(
        "Does the customer like the table?",
        ["Yes", "No", "The customer does not say"],
        0,
        "Ich finde den Tisch schön is positive.",
      ),
    ],
    grammar: [
      q(
        "___ Tisch ist groß.",
        ["Der", "Die", "Das"],
        0,
        "Learn der Tisch together.",
      ),
      q(
        "Das Sofa ist schön. ___ ist schön.",
        ["Er", "Es", "Sie"],
        1,
        "das Sofa is referred to with es.",
      ),
      q(
        "Die Lampe ist teuer. ___ ist teuer.",
        ["Er", "Es", "Sie"],
        2,
        "die Lampe is referred to with sie.",
      ),
    ],
    mission: {
      title: "Visit a furniture store",
      prompt:
        "Ask the price of a piece of furniture, describe it, give a price in euros, and say whether you like it.",
      hint: "Was kostet …? Der Tisch kostet … Euro. Er ist … Ich finde …",
      criteria: [
        c("priceQuestion", "Ask a price", "was kostet|wie viel kostet"),
        c(
          "object",
          "Name a furniture item",
          "tisch|stuhl|sofa|bett|lampe|schrank",
        ),
        c("price", "Give a price", "(\\d+|achtzig|zwanzig|hundert) euro"),
        c(
          "description",
          "Describe the object",
          "(ist|finde).{0,30}(schön|hässlich|teuer|billig|groß|klein)",
        ),
        c("opinion", "Say what you think", "ich finde|ich mag|gefällt mir"),
      ],
    },
  },
  {
    number: 5,
    title: "Was ist das?",
    goal: "Ask what an object is called and ask for repetition.",
    place: "Geschäft",
    story:
      "A shop assistant shows you an unfamiliar object. Keep the conversation going with a few useful survival phrases.",
    outcomes: [
      "Ask for the German name of an object",
      "Ask someone to repeat or slow down",
      "Describe color or material",
    ],
    words: words(5, [
      [
        "das Handy",
        "mobile phone",
        "هاتف محمول",
        "Das ist ein Handy.",
        "die Handys",
      ],
      [
        "der Schlüssel",
        "key",
        "مفتاح",
        "Das ist ein Schlüssel.",
        "die Schlüssel",
      ],
      ["die Tasche", "bag", "حقيبة", "Die Tasche ist rot.", "die Taschen"],
      ["der Stift", "pen", "قلم", "Der Stift ist blau.", "die Stifte"],
      ["das Buch", "book", "كتاب", "Das ist kein Buch.", "die Bücher"],
      ["die Brille", "glasses", "نظارة", "Das ist eine Brille.", "die Brillen"],
      ["rot", "red", "أحمر", "Die Tasche ist rot."],
      ["blau", "blue", "أزرق", "Der Stift ist blau."],
      ["schwarz", "black", "أسود", "Das Handy ist schwarz."],
      ["weiß", "white", "أبيض", "Die Tasche ist weiß."],
      ["Wie bitte?", "pardon?", "عفواً؟", "Wie bitte? Noch einmal, bitte."],
      [
        "Langsam, bitte.",
        "slowly, please",
        "ببطء من فضلك",
        "Langsam, bitte. Ich verstehe nicht.",
      ],
    ]),
    patterns: [
      "Was ist das?",
      "Wie heißt das auf Deutsch?",
      "Wie bitte?",
      "Noch einmal, bitte.",
      "Langsam, bitte.",
      "Das ist eine Tasche.",
      "Die Tasche ist rot.",
    ],
    sound: {
      title: "Sentence stress",
      tip: "Say the same sentence with a different important word: DAS ist ein Schlüssel; Das IST ein Schlüssel; Das ist ein SCHLÜSSEL. The printed emphasis is a guide for your own voice.",
      examples: ["Das ist ein Schlüssel.", "Das ist eine Tasche."],
    },
    dialogue: dialogue([
      [
        "Entschuldigung, wie heißt das auf Deutsch?",
        "Excuse me, what is that called in German?",
      ],
      ["Das ist ein Schlüssel.", "That is a key."],
      ["Wie bitte?", "Pardon?"],
      ["Ein Schlüssel.", "A key."],
      ["Ah, danke!", "Ah, thank you!"],
    ]),
    listening: [
      q(
        "What is the object?",
        ["A key", "A phone", "A bag"],
        0,
        "Schlüssel means key.",
      ),
      q(
        "Why does the person say Wie bitte?",
        ["To ask the price", "To ask for repetition", "To say goodbye"],
        1,
        "Wie bitte? asks the other person to repeat.",
      ),
      q(
        "How does the conversation end?",
        ["With thanks", "With an invitation", "With a complaint"],
        0,
        "The learner says danke.",
      ),
    ],
    grammar: [
      q(
        "Das ist ___ Tasche.",
        ["ein", "eine", "einen"],
        1,
        "Tasche is feminine: eine Tasche.",
      ),
      q(
        "Das ist ___ Handy.",
        ["kein", "keine", "keinen"],
        0,
        "Handy is neuter: kein Handy.",
      ),
      q(
        "Das ist ___ Schlüssel.",
        ["eine", "einen", "ein"],
        2,
        "The subject complement uses ein Schlüssel.",
      ),
    ],
    mission: {
      title: "Find the German word",
      prompt:
        "Ask what an object is called in German, ask for repetition, describe its color or material, then say thank you.",
      hint: "Wie heißt das auf Deutsch? Wie bitte? Das ist … Es ist … Danke!",
      criteria: [
        c(
          "ask",
          "Ask for the German word",
          "wie heißt das auf deutsch|wie heisst das auf deutsch",
        ),
        c("repeat", "Ask for repetition", "wie bitte|noch einmal|langsam"),
        c(
          "object",
          "Name an object",
          "schlüssel|tasche|handy|stift|buch|brille",
        ),
        c(
          "describe",
          "Describe color or material",
          "rot|blau|schwarz|weiß|weiss|holz|plastik|rund|eckig",
        ),
        c("thanks", "Thank the other person", "danke"),
      ],
    },
  },
  {
    number: 6,
    title: "Ich brauche einen Laptop",
    goal: "Say what you need to set up a desk.",
    place: "Büro",
    story:
      "It’s your first day at work. Your desk is missing a few things. Ask for what you need, and say what you already have.",
    outcomes: [
      "Name common office and tech items",
      "Say what you need and do not need",
      "Use einen, ein, and eine in context",
    ],
    words: words(6, [
      [
        "der Computer",
        "computer",
        "حاسوب",
        "Ich brauche einen Computer.",
        "die Computer",
      ],
      [
        "der Laptop",
        "laptop",
        "حاسوب محمول",
        "Ich habe einen Laptop.",
        "die Laptops",
      ],
      [
        "der Drucker",
        "printer",
        "طابعة",
        "Ich brauche keinen Drucker.",
        "die Drucker",
      ],
      [
        "das Telefon",
        "telephone",
        "هاتف",
        "Ich brauche ein Telefon.",
        "die Telefone",
      ],
      [
        "die Tastatur",
        "keyboard",
        "لوحة مفاتيح",
        "Ich brauche eine Tastatur.",
        "die Tastaturen",
      ],
      [
        "die Maus",
        "mouse",
        "فأرة الحاسوب",
        "Ich suche meine Maus.",
        "die Mäuse",
      ],
      [
        "der Bildschirm",
        "screen",
        "شاشة",
        "Der Bildschirm ist groß.",
        "die Bildschirme",
      ],
      ["das Büro", "office", "مكتب", "Das Büro ist klein.", "die Büros"],
      ["brauchen", "to need", "يحتاج", "Ich brauche einen Laptop."],
      ["haben", "to have", "يملك", "Ich habe einen Computer."],
      ["suchen", "to look for", "يبحث عن", "Ich suche meine Maus."],
      ["kaufen", "to buy", "يشتري", "Ich kaufe eine Tastatur."],
    ]),
    patterns: [
      "Ich brauche einen Computer.",
      "Ich brauche ein Telefon.",
      "Ich brauche eine Maus.",
      "Ich brauche keinen Drucker.",
      "Hast du einen Laptop?",
    ],
    sound: {
      title: "The ü sound",
      tip: "For ü, try saying ee while rounding your lips as if saying oo. Compare u and ü slowly. Your goal is understandable speech.",
      examples: ["Büro", "Tür", "Ich arbeite im Büro."],
    },
    dialogue: dialogue([
      ["Was brauchst du für deine Arbeit?", "What do you need for your work?"],
      [
        "Ich brauche einen Laptop und eine Maus.",
        "I need a laptop and a mouse.",
      ],
      ["Brauchst du einen Drucker?", "Do you need a printer?"],
      [
        "Nein, ich brauche keinen Drucker. Ich habe ein Telefon.",
        "No, I don’t need a printer. I have a telephone.",
      ],
    ]),
    listening: [
      q(
        "Which computer does the person need?",
        ["A laptop", "A tablet", "No computer"],
        0,
        "The person needs einen Laptop.",
      ),
      q(
        "What else is needed?",
        ["A keyboard", "A mouse", "A printer"],
        1,
        "eine Maus means a mouse.",
      ),
      q(
        "Does the person need a printer?",
        ["Yes", "No", "Not stated"],
        1,
        "keinen Drucker means no printer.",
      ),
    ],
    grammar: [
      q(
        "Ich brauche ___ Computer.",
        ["einen", "ein", "eine"],
        0,
        "The masculine object takes einen.",
      ),
      q(
        "Ich brauche ___ Telefon.",
        ["einen", "ein", "eine"],
        1,
        "Neuter objects use ein.",
      ),
      q(
        "Ich brauche ___ Maus.",
        ["ein", "einen", "eine"],
        2,
        "Feminine objects use eine.",
      ),
    ],
    mission: {
      title: "Set up your first desk",
      prompt:
        "Say three things you need, one thing you do not need, and one thing you already have. Use a masculine and a feminine object.",
      hint: "Ich brauche einen … Ich brauche eine … Ich brauche ein … Ich brauche keinen … Ich habe …",
      criteria: [
        c(
          "masculine",
          "Ask for a masculine object",
          "ich brauche einen (computer|laptop|drucker|bildschirm)",
        ),
        c(
          "feminine",
          "Ask for a feminine object",
          "ich brauche eine (maus|tastatur)",
        ),
        c(
          "neuter",
          "Ask for a neuter object",
          "ich brauche ein (telefon|büro)",
        ),
        c(
          "negative",
          "Say what you do not need",
          "ich brauche kein(en|e)? \\S+",
        ),
        c("have", "Say what you have", "ich habe (einen|eine|ein) \\S+"),
      ],
    },
  },
  {
    number: 7,
    title: "Du kannst wirklich …",
    goal: "Talk about hobbies and give a compliment.",
    place: "Park",
    story:
      "You meet someone in a park. Ask about hobbies, talk about what you can do, and give a friendly compliment.",
    outcomes: [
      "Name two hobbies",
      "Say what you can and cannot do",
      "Give and respond to a compliment",
    ],
    words: words(7, [
      [
        "Fußball spielen",
        "to play football",
        "يلعب كرة القدم",
        "Ich spiele gern Fußball.",
      ],
      [
        "fotografieren",
        "to take photos",
        "يصوّر",
        "Du kannst toll fotografieren!",
      ],
      ["kochen", "to cook", "يطبخ", "Ich kann gut kochen."],
      ["schwimmen", "to swim", "يسبح", "Kannst du schwimmen?"],
      ["tanzen", "to dance", "يرقص", "Ich tanze gern."],
      ["singen", "to sing", "يغنّي", "Ich kann nicht gut singen."],
      ["Rad fahren", "to ride a bike", "يركب الدراجة", "Ich fahre gern Rad."],
      [
        "Musik hören",
        "to listen to music",
        "يستمع إلى الموسيقى",
        "Ich höre gern Musik.",
      ],
      ["lesen", "to read", "يقرأ", "Ich lese gern."],
      ["reisen", "to travel", "يسافر", "Ich reise gern."],
      ["können", "can / to be able to", "يستطيع", "Ich kann Deutsch sprechen."],
      ["toll", "great", "رائع", "Das ist toll!"],
    ]),
    patterns: [
      "Ich kann gut kochen.",
      "Kannst du schwimmen?",
      "Ja, ein bisschen.",
      "Ich kann nicht gut singen.",
      "Du kannst wirklich toll fotografieren!",
      "Danke!",
    ],
    sound: {
      title: "Moving sentence stress",
      tip: "Compare ICH kann gut kochen, Ich kann GUT kochen, and Ich kann gut KOCHEN. Which word do you want your listener to notice?",
      examples: ["Ich kann gut kochen.", "Du kannst toll fotografieren!"],
    },
    dialogue: dialogue([
      ["Was machst du gern?", "What do you like doing?"],
      [
        "Ich koche gern und höre Musik.",
        "I like cooking and listening to music.",
      ],
      ["Kannst du schwimmen?", "Can you swim?"],
      [
        "Ja, ein bisschen. Du kannst toll fotografieren!",
        "Yes, a little. You take great photos!",
      ],
    ]),
    listening: [
      q(
        "Which hobby is mentioned?",
        ["Cooking", "Dancing", "Cycling"],
        0,
        "Ich koche gern means I like cooking.",
      ),
      q(
        "Can the person swim?",
        ["Very well", "A little", "Not at all"],
        1,
        "ein bisschen means a little.",
      ),
      q(
        "What is the compliment about?",
        ["Singing", "Photography", "Football"],
        1,
        "toll fotografieren praises photography.",
      ),
    ],
    grammar: [
      q(
        "Ich ___ gut kochen.",
        ["kann", "kannst", "können"],
        0,
        "Use ich kann.",
      ),
      q("Du ___ schwimmen.", ["kann", "können", "kannst"], 2, "Use du kannst."),
      q(
        "Choose the correct word order.",
        ["Ich kochen kann gut.", "Ich kann gut kochen.", "Ich kann kocht gut."],
        1,
        "The infinitive kochen goes at the end.",
      ),
    ],
    mission: {
      title: "A conversation in the park",
      prompt:
        "Mention two hobbies, one ability, one thing you cannot do well, ask about an ability, and give a compliment.",
      hint: "Ich … gern. Ich kann gut … Ich kann nicht gut … Kannst du …? Du kannst toll …",
      criteria: [
        c("hobby", "Say what you enjoy", "gern|gerne"),
        c("ability", "Say what you can do", "ich kann (gut |sehr gut )?\\S+"),
        c("limit", "Say what is difficult", "ich kann nicht (gut )?\\S+"),
        c("question", "Ask about an ability", "kannst du \\S+"),
        c(
          "compliment",
          "Give a compliment",
          "du kannst.{0,40}(toll|gut)|das ist toll",
        ),
      ],
    },
  },
  {
    number: 8,
    title: "Kein Problem. Ich habe Zeit!",
    goal: "Agree on an activity, day, time, and meeting place.",
    place: "Café",
    story:
      "You and a friend want to meet. Find a free day, suggest something to do, and make a clear plan.",
    outcomes: [
      "Use days and clock times",
      "Accept or refuse politely",
      "Arrange an activity and meeting place",
    ],
    words: words(8, [
      [
        "der Montag",
        "Monday",
        "الاثنين",
        "Am Montag habe ich Zeit.",
        "die Montage",
      ],
      [
        "der Dienstag",
        "Tuesday",
        "الثلاثاء",
        "Am Dienstag arbeite ich.",
        "die Dienstage",
      ],
      [
        "der Mittwoch",
        "Wednesday",
        "الأربعاء",
        "Treffen wir uns am Mittwoch?",
        "die Mittwoche",
      ],
      [
        "der Donnerstag",
        "Thursday",
        "الخميس",
        "Am Donnerstag lerne ich Deutsch.",
        "die Donnerstage",
      ],
      ["der Freitag", "Friday", "الجمعة", "Bis Freitag!", "die Freitage"],
      [
        "der Samstag",
        "Saturday",
        "السبت",
        "Hast du am Samstag Zeit?",
        "die Samstage",
      ],
      [
        "der Sonntag",
        "Sunday",
        "الأحد",
        "Am Sonntag habe ich Zeit.",
        "die Sonntage",
      ],
      ["heute", "today", "اليوم", "Heute habe ich Zeit."],
      ["morgen", "tomorrow", "غداً", "Bis morgen!"],
      ["treffen", "to meet", "يلتقي", "Treffen wir uns um sieben Uhr?"],
      ["das Kino", "cinema", "سينما", "Gehen wir ins Kino?", "die Kinos"],
      ["das Café", "café", "مقهى", "Treffen wir uns im Café?", "die Cafés"],
    ]),
    patterns: [
      "Hast du am Samstag Zeit?",
      "Ja, gern.",
      "Leider habe ich keine Zeit.",
      "Gehen wir ins Kino?",
      "Treffen wir uns um sieben Uhr?",
      "Wir treffen uns im Café.",
      "Bis Samstag!",
    ],
    sound: {
      title: "Unstressed e",
      tip: "Listen to the light ending in heute and bitte. Copy the rhythm without giving every syllable equal weight.",
      examples: ["heute", "bitte", "Heute habe ich Zeit."],
    },
    dialogue: dialogue([
      ["Hast du am Freitagabend Zeit?", "Are you free on Friday evening?"],
      ["Ja. Warum?", "Yes. Why?"],
      ["Gehen wir ins Kino?", "Shall we go to the cinema?"],
      ["Gute Idee. Um wie viel Uhr?", "Good idea. At what time?"],
      ["Um acht.", "At eight."],
      ["Super. Bis Freitag!", "Great. See you Friday!"],
    ]),
    listening: [
      q(
        "Which day is the plan for?",
        ["Friday", "Saturday", "Sunday"],
        0,
        "Freitagabend is Friday evening.",
      ),
      q(
        "What will the friends do?",
        ["Visit a park", "Go to the cinema", "Go swimming"],
        1,
        "Gehen wir ins Kino?",
      ),
      q(
        "What time do they agree on?",
        ["7 o’clock", "8 o’clock", "9 o’clock"],
        1,
        "Um acht means at eight.",
      ),
    ],
    grammar: [
      q(
        "___ Samstag habe ich Zeit.",
        ["Um", "Im", "Am"],
        2,
        "Use am for a day.",
      ),
      q(
        "Wir treffen uns ___ sieben Uhr.",
        ["am", "um", "im"],
        1,
        "Use um with a clock time.",
      ),
      q(
        "Choose the correct word order.",
        [
          "Am Samstag habe ich Zeit.",
          "Am Samstag ich habe Zeit.",
          "Am Samstag Zeit ich habe.",
        ],
        0,
        "The conjugated verb habe stays second.",
      ),
    ],
    mission: {
      title: "Make a plan with a friend",
      prompt:
        "Ask if a friend is free, suggest an activity, agree on a day and time, name a place, and end the conversation.",
      hint: "Hast du … Zeit? Gehen wir …? Am … Um … Wir treffen uns … Bis …!",
      criteria: [
        c("free", "Ask when your friend is free", "hast du.{0,50}zeit"),
        c(
          "activity",
          "Suggest an activity",
          "gehen wir|spielen wir|schwimmen|kino|rad fahren",
        ),
        c(
          "day",
          "Choose a day",
          "am (montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)",
        ),
        c(
          "time",
          "Choose a time",
          "um (\\d{1,2}|sieben|acht|neun|zehn|sechs).{0,10}(uhr)?",
        ),
        c(
          "place",
          "Choose a meeting place",
          "im café|im cafe|am bahnhof|im park|vor dem kino|im kino",
        ),
        c("end", "End the conversation", "bis|tschüss|tschuess"),
      ],
    },
  },
  {
    number: 9,
    title: "Ich möchte etwas essen",
    goal: "Order breakfast politely without answer choices.",
    place: "Restaurant",
    story:
      "You arrive at a café for breakfast. Order food and a drink, give a quantity, and thank the person serving you.",
    outcomes: [
      "Say what you like and would like",
      "Order a drink and some food",
      "Accept or refuse politely",
    ],
    words: words(9, [
      ["das Brot", "bread", "خبز", "Ich möchte ein Brot.", "die Brote"],
      [
        "das Brötchen",
        "bread roll",
        "خبز صغير",
        "Zwei Brötchen, bitte.",
        "die Brötchen",
      ],
      ["der Käse", "cheese", "جبن", "Ich mag Käse."],
      ["die Milch", "milk", "حليب", "Ich möchte Milch."],
      [
        "der Kaffee",
        "coffee",
        "قهوة",
        "Ich möchte einen Kaffee.",
        "die Kaffees",
      ],
      ["der Tee", "tea", "شاي", "Ich mag keinen Tee.", "die Tees"],
      ["das Wasser", "water", "ماء", "Ein Wasser, bitte."],
      ["das Gemüse", "vegetables", "خضروات", "Ich esse gern Gemüse."],
      ["das Obst", "fruit", "فاكهة", "Ich mag Obst."],
      ["der Reis", "rice", "أرز", "Ich esse Reis."],
      ["essen", "to eat", "يأكل", "Ich möchte etwas essen."],
      ["trinken", "to drink", "يشرب", "Was möchten Sie trinken?"],
    ]),
    patterns: [
      "Ich mag Kaffee.",
      "Ich mag keinen Tee.",
      "Was möchtest du?",
      "Ich möchte einen Kaffee.",
      "Zwei Brötchen, bitte.",
      "Nein, danke.",
    ],
    sound: {
      title: "Stress in compound nouns",
      tip: "Split Frühstück into Früh and Stück, then hear the whole word. Compound nouns usually carry their main stress on the first part. Say it in a short breakfast phrase.",
      examples: ["Frühstück", "Frühstückskaffee", "Ich möchte frühstücken."],
    },
    dialogue: dialogue([
      ["Guten Tag. Was möchten Sie?", "Hello. What would you like?"],
      [
        "Ich möchte einen Kaffee und ein Brötchen, bitte.",
        "I would like a coffee and a bread roll, please.",
      ],
      ["Sonst noch etwas?", "Anything else?"],
      ["Nein, danke.", "No, thank you."],
      ["Das macht sechs Euro.", "That comes to six euros."],
      ["Danke.", "Thank you."],
    ]),
    listening: [
      q(
        "Which drink is ordered?",
        ["Tea", "Coffee", "Water"],
        1,
        "einen Kaffee means a coffee.",
      ),
      q(
        "What food is ordered?",
        ["Bread roll", "Cheese", "Rice"],
        0,
        "ein Brötchen is a bread roll.",
      ),
      q(
        "What is the total?",
        ["4 Euro", "6 Euro", "8 Euro"],
        1,
        "sechs Euro means six euros.",
      ),
    ],
    grammar: [
      q(
        "Ich möchte ___ Kaffee.",
        ["ein", "eine", "einen"],
        2,
        "Kaffee is masculine; use einen here.",
      ),
      q(
        "Ich möchte ___ Brötchen.",
        ["ein", "einen", "eine"],
        0,
        "Brötchen is neuter: ein Brötchen.",
      ),
      q(
        "Which sentence expresses a preference?",
        [
          "Ich möchte einen Kaffee.",
          "Ich mag Kaffee.",
          "Was kostet der Kaffee?",
        ],
        1,
        "mag expresses liking; möchte expresses a request.",
      ),
    ],
    mission: {
      title: "Order breakfast",
      prompt:
        "Order a drink and food, say how many, use bitte, and thank the server. Write your own request without choices.",
      hint: "Guten Tag. Ich möchte einen … und zwei …, bitte. Danke!",
      criteria: [
        c(
          "request",
          "Make a request",
          "ich möchte|ich moechte|ich hätte gern|ich nehme",
        ),
        c("drink", "Order a drink", "kaffee|tee|wasser|milch"),
        c("food", "Order some food", "brötchen|brot|käse|obst|reis|gemüse"),
        c("quantity", "Give a quantity", "einen|ein |eine |zwei|drei|\\d+"),
        c("polite", "Use bitte", "bitte"),
        c("thanks", "Say thank you", "danke"),
      ],
    },
  },
  {
    number: 10,
    title: "Ich steige jetzt ein",
    goal: "Find your transport and ask where to get off.",
    place: "Bahnhof",
    story:
      "You are traveling to Berlin. Listen for the destination and departure time, then ask how to get to the station.",
    outcomes: [
      "Name common transport",
      "Understand a simple announcement",
      "Use separable verbs and ask for directions",
    ],
    words: words(10, [
      ["der Bus", "bus", "حافلة", "Ich fahre mit dem Bus.", "die Busse"],
      ["der Zug", "train", "قطار", "Der Zug fährt um 14 Uhr ab.", "die Züge"],
      [
        "die U-Bahn",
        "underground",
        "مترو",
        "Ich fahre mit der U-Bahn.",
        "die U-Bahnen",
      ],
      [
        "die S-Bahn",
        "suburban train",
        "قطار الضواحي",
        "Ich nehme die S-Bahn.",
        "die S-Bahnen",
      ],
      ["das Auto", "car", "سيارة", "Ich fahre mit dem Auto.", "die Autos"],
      [
        "das Fahrrad",
        "bicycle",
        "دراجة",
        "Ich fahre mit dem Fahrrad.",
        "die Fahrräder",
      ],
      [
        "der Bahnhof",
        "train station",
        "محطة القطار",
        "Wo ist der Bahnhof?",
        "die Bahnhöfe",
      ],
      [
        "die Haltestelle",
        "stop",
        "موقف",
        "Wo ist die Haltestelle?",
        "die Haltestellen",
      ],
      ["einsteigen", "to get on", "يركب", "Ich steige in den Zug ein."],
      ["aussteigen", "to get off", "ينزل", "Ich steige am Bahnhof aus."],
      ["ankommen", "to arrive", "يصل", "Der Zug kommt um 18 Uhr an."],
      [
        "umsteigen",
        "to change trains",
        "يبدّل القطار",
        "Ich muss einmal umsteigen.",
      ],
    ]),
    patterns: [
      "Ich fahre mit der U-Bahn.",
      "Wo ist die Haltestelle?",
      "Wann fährt der Zug ab?",
      "Ich steige am Hauptbahnhof aus.",
      "Ich muss einmal umsteigen.",
      "Der Zug kommt um 18 Uhr an.",
    ],
    sound: {
      title: "Stress in separable verbs",
      tip: "Listen to EINsteigen, AUSsteigen, ANkommen, and ABfahren. In a statement the prefix moves to the end; say the complete sentence.",
      examples: [
        "einsteigen",
        "aussteigen",
        "ankommen",
        "Ich steige in den Zug ein.",
      ],
    },
    dialogue: dialogue([
      [
        "Der Zug nach Berlin fährt um 14 Uhr ab.",
        "The train to Berlin leaves at 2 pm.",
      ],
      [
        "Entschuldigung, wo ist der Bahnhof?",
        "Excuse me, where is the station?",
      ],
      [
        "Dort links. Nehmen Sie den Bus.",
        "Over there on the left. Take the bus.",
      ],
      ["Wo muss ich aussteigen?", "Where do I need to get off?"],
      ["Am Hauptbahnhof.", "At the main station."],
    ]),
    listening: [
      q(
        "What is the train's destination?",
        ["Berlin", "Hamburg", "München"],
        0,
        "nach Berlin gives the destination.",
      ),
      q(
        "What time does the train leave?",
        ["14 Uhr", "18 Uhr", "4 Uhr"],
        0,
        "The announcement says um 14 Uhr.",
      ),
      q(
        "Where should the passenger get off?",
        ["At the airport", "At the main station", "At the café"],
        1,
        "Am Hauptbahnhof means at the main station.",
      ),
    ],
    grammar: [
      q(
        "Ich steige in den Zug ___.",
        ["ein", "steigen", "einen"],
        0,
        "einsteigen splits: steige … ein.",
      ),
      q(
        "Der Zug kommt um 18 Uhr ___.",
        ["ein", "ab", "an"],
        2,
        "ankommen splits: kommt … an.",
      ),
      q(
        "Wann fährt der Zug ___?",
        ["an", "ab", "aus"],
        1,
        "abfahren means to depart.",
      ),
    ],
    mission: {
      title: "Navigate a German city",
      prompt:
        "Ask where the station is, say what transport you will take, ask where to get off, and mention a departure or arrival time.",
      hint: "Entschuldigung, wo ist …? Ich fahre mit … Wo muss ich aussteigen? Der Zug fährt um … Uhr ab.",
      criteria: [
        c(
          "directions",
          "Ask for the station or stop",
          "wo ist (der bahnhof|die haltestelle|die u-bahn)",
        ),
        c(
          "transport",
          "Name your transport",
          "ich fahre mit|ich nehme (den|die|das)",
        ),
        c(
          "exit",
          "Ask where to get off",
          "wo (muss|soll) ich aussteigen|wo steige ich aus",
        ),
        c(
          "time",
          "Mention a time",
          "um (\\d{1,2}|sieben|acht|neun|vierzehn|achtzehn) uhr",
        ),
        c(
          "verb",
          "Use a separated travel verb",
          "(fährt|kommt|steige).{0,60} (ab|an|aus|ein)",
        ),
      ],
    },
  },
  {
    number: 11,
    title: "Was hast du heute gemacht?",
    goal: "Tell someone about your day in a short diary.",
    place: "Wohnung",
    story:
      "The day is ending. Think of a few things you did, and tell a friend using familiar past-tense chunks.",
    outcomes: [
      "Describe a normal routine",
      "Talk about completed activities with haben",
      "Write or speak a short daily summary",
    ],
    words: words(11, [
      ["aufstehen", "to get up", "يستيقظ", "Ich stehe um sieben Uhr auf."],
      [
        "frühstücken",
        "to have breakfast",
        "يتناول الإفطار",
        "Ich frühstücke um acht Uhr.",
      ],
      ["arbeiten", "to work", "يعمل", "Ich habe heute gearbeitet."],
      ["lernen", "to learn", "يتعلم", "Ich habe Deutsch gelernt."],
      ["einkaufen", "to shop", "يتسوق", "Ich habe eingekauft."],
      ["kochen", "to cook", "يطبخ", "Ich habe gekocht."],
      [
        "telefonieren",
        "to telephone",
        "يتحدث هاتفياً",
        "Ich habe telefoniert.",
      ],
      ["fernsehen", "to watch TV", "يشاهد التلفاز", "Ich habe ferngesehen."],
      ["machen", "to do", "يفعل", "Was hast du gemacht?"],
      ["spielen", "to play", "يلعب", "Ich habe Fußball gespielt."],
      ["gestern", "yesterday", "أمس", "Gestern habe ich gearbeitet."],
      [
        "am Abend",
        "in the evening",
        "في المساء",
        "Am Abend habe ich Deutsch gelernt.",
      ],
    ]),
    patterns: [
      "Ich stehe um sieben Uhr auf.",
      "Ich habe heute gearbeitet.",
      "Ich habe Deutsch gelernt.",
      "Ich habe Fußball gespielt.",
      "Was hast du heute gemacht?",
    ],
    sound: {
      title: "Sentence stress with Perfekt",
      tip: "Make the important information stand out: Ich habe HEUTE Deutsch gelernt; Ich habe heute DEUTSCH gelernt. Keep the other words light.",
      examples: [
        "Ich habe heute Deutsch gelernt.",
        "Am Abend habe ich gekocht.",
      ],
    },
    dialogue: dialogue([
      ["Was hast du heute gemacht?", "What did you do today?"],
      [
        "Ich habe gearbeitet und Deutsch gelernt.",
        "I worked and studied German.",
      ],
      ["Und am Abend?", "And in the evening?"],
      [
        "Am Abend habe ich gekocht und einen Film gesehen.",
        "In the evening I cooked and watched a film.",
      ],
    ]),
    listening: [
      q(
        "What did the person learn?",
        ["German", "English", "Cooking"],
        0,
        "Deutsch gelernt means studied German.",
      ),
      q(
        "When did they cook?",
        ["In the morning", "In the evening", "At midday"],
        1,
        "Am Abend tells us it was in the evening.",
      ),
      q(
        "What did they watch?",
        ["A football game", "A film", "A concert"],
        1,
        "einen Film gesehen means watched a film.",
      ),
    ],
    grammar: [
      q(
        "Ich ___ Deutsch gelernt.",
        ["bin", "habe", "ist"],
        1,
        "lernen uses haben in the perfect tense.",
      ),
      q(
        "Ich habe heute ___.",
        ["arbeiten", "arbeite", "gearbeitet"],
        2,
        "Use the participle gearbeitet.",
      ),
      q(
        "Choose the correct sentence.",
        [
          "Gestern habe ich gekocht.",
          "Gestern ich habe gekocht.",
          "Gestern gekocht ich habe.",
        ],
        0,
        "habe stays second and gekocht goes at the end.",
      ),
    ],
    mission: {
      title: "Your daily diary",
      prompt:
        "Write at least three sentences about today or yesterday. Mention work or study, another activity, and something in the evening. Then say it out loud without reading.",
      hint: "Heute habe ich … Ich habe … Am Abend habe ich …",
      criteria: [
        c("when", "Mention today or yesterday", "heute|gestern"),
        c(
          "work",
          "Talk about work or study",
          "habe.{0,40}(gearbeitet|gelernt)",
        ),
        c(
          "activity",
          "Mention another completed activity",
          "habe.{0,50}(gekocht|gespielt|eingekauft|telefoniert|gesehen|ferngesehen)",
        ),
        c("evening", "Mention the evening", "am abend"),
        c(
          "past",
          "Use at least three haben statements",
          "(?:habe[\\s\\S]*?){3}",
        ),
      ],
    },
  },
  {
    number: 12,
    title: "Was ist denn hier passiert?",
    goal: "Tell a tiny story about a trip or celebration.",
    place: "Party",
    story:
      "You meet a friend after a trip. Tell them when you went, where you went, how you traveled, and what you thought of it.",
    outcomes: [
      "Use months and seasons",
      "Talk about movement with sein in Perfekt",
      "Combine haben and sein in a short story",
    ],
    words: words(12, [
      ["die Party", "party", "حفلة", "Die Party war schön.", "die Partys"],
      [
        "der Geburtstag",
        "birthday",
        "عيد ميلاد",
        "Im Januar habe ich Geburtstag.",
        "die Geburtstage",
      ],
      ["die Reise", "trip", "رحلة", "Die Reise war interessant.", "die Reisen"],
      [
        "der Urlaub",
        "holiday",
        "عطلة",
        "Im Sommer habe ich Urlaub.",
        "die Urlaube",
      ],
      [
        "der Sommer",
        "summer",
        "الصيف",
        "Im Sommer fahre ich nach Deutschland.",
        "die Sommer",
      ],
      [
        "der Winter",
        "winter",
        "الشتاء",
        "Im Winter bleibe ich zu Hause.",
        "die Winter",
      ],
      [
        "der Frühling",
        "spring",
        "الربيع",
        "Im Frühling reise ich gern.",
        "die Frühlinge",
      ],
      [
        "der Herbst",
        "autumn",
        "الخريف",
        "Im Herbst komme ich zurück.",
        "die Herbste",
      ],
      [
        "fahren",
        "to travel / drive",
        "يسافر / يقود",
        "Ich bin nach Berlin gefahren.",
      ],
      ["gehen", "to go / walk", "يذهب", "Wir sind nach Hause gegangen."],
      ["fliegen", "to fly", "يطير", "Ich bin nach Deutschland geflogen."],
      ["bleiben", "to stay", "يبقى", "Ich bin zu Hause geblieben."],
    ]),
    patterns: [
      "Im Sommer fahre ich nach Deutschland.",
      "Im Januar habe ich Geburtstag.",
      "Ich bin nach Berlin gefahren.",
      "Wir sind nach Hause gegangen.",
      "Wann bist du angekommen?",
      "Die Party war sehr schön.",
    ],
    sound: {
      title: "Vocalic r",
      tip: "In words such as Lehrer and Sommer, the ending -er often sounds closer to a light vowel than a strong rolled r. Listen and compare; intelligibility is the goal.",
      examples: ["Lehrer", "Sommer", "Im Sommer bin ich nach Berlin gefahren."],
    },
    dialogue: dialogue([
      ["Wo warst du im Sommer?", "Where were you in the summer?"],
      ["Ich bin nach Berlin gefahren.", "I traveled to Berlin."],
      ["Bist du mit dem Zug gefahren?", "Did you travel by train?"],
      [
        "Ja. Ich habe Freunde getroffen. Berlin war sehr interessant.",
        "Yes. I met friends. Berlin was very interesting.",
      ],
    ]),
    listening: [
      q(
        "When was the trip?",
        ["In summer", "In winter", "In January"],
        0,
        "im Sommer means in summer.",
      ),
      q(
        "How did the person travel?",
        ["By train", "By plane", "By bicycle"],
        0,
        "mit dem Zug means by train.",
      ),
      q(
        "What did they do in Berlin?",
        ["Worked in an office", "Met friends", "Went swimming"],
        1,
        "Freunde getroffen means met friends.",
      ),
    ],
    grammar: [
      q(
        "Ich ___ nach Berlin gefahren.",
        ["habe", "hat", "bin"],
        2,
        "Movement with fahren uses sein.",
      ),
      q(
        "Wir ___ nach Hause gegangen.",
        ["sind", "haben", "seid"],
        0,
        "Use wir sind with gegangen.",
      ),
      q(
        "___ Sommer habe ich Urlaub.",
        ["Am", "Um", "Im"],
        2,
        "Use im with a season or month.",
      ),
    ],
    mission: {
      title: "Tell a tiny travel story",
      prompt:
        "Tell a five-part story: when, where, how you traveled, what happened, and your opinion. Include both a sein and a haben past-tense sentence.",
      hint: "Im Sommer bin ich nach … gefahren. Ich bin mit … gefahren. Ich habe … Berlin war …",
      criteria: [
        c(
          "when",
          "Say when",
          "im (sommer|winter|frühling|herbst|januar|februar)|gestern|letzte woche",
        ),
        c("where", "Say where you went", "nach \\S+|in berlin|in deutschland"),
        c(
          "movement",
          "Use sein for movement",
          "(bin|sind).{0,60}(gefahren|gegangen|gekommen|geflogen|angekommen)",
        ),
        c(
          "how",
          "Say how you traveled",
          "mit (dem|der) (zug|bus|auto|u-bahn|s-bahn)|geflogen",
        ),
        c(
          "event",
          "Use haben for an activity",
          "(habe|haben).{0,60}(getroffen|gegessen|gelernt|gesehen|gearbeitet|gekocht)",
        ),
        c(
          "opinion",
          "Give your opinion",
          "war.{0,30}(schön|interessant|toll|gut)|ich fand|hat mir gefallen",
        ),
      ],
    },
  },
];
export const bookModules = [
  {
    number: 1,
    title: "Me & other people",
    description: "Meet someone, share your story, and introduce your family.",
    lessons: [1, 2, 3],
    place: "Sprachschule",
    review: "Meet someone new",
    criteria: [
      c("greet", "Greet and introduce yourself", "hallo|guten tag"),
      c("name", "Give your name", "ich (heiße|heisse|bin) \\S+"),
      c("home", "Say your country and city", "aus \\S+[\\s\\S]*wohne in \\S+"),
      c(
        "job",
        "Talk about work",
        "von beruf|arbeite als|entwickler|student|lehrer|arzt|ärztin",
      ),
      c("family", "Mention family", "mutter|vater|bruder|schwester|familie"),
      c("languages", "Mention languages", "spreche|sprechen"),
      c("questions", "Ask two questions", "(?:\\?[^?]*){2}"),
      c("bye", "Say goodbye", "tschüss|auf wiedersehen|bis bald"),
    ],
  },
  {
    number: 2,
    title: "Things & everyday needs",
    description: "Choose furniture, understand prices, and set up a desk.",
    lessons: [4, 5, 6],
    place: "Wohnung & Büro",
    review: "Set up a new apartment",
    criteria: [
      c(
        "objects",
        "Name five objects",
        "(?:(?:tisch|stuhl|sofa|lampe|bett|schrank|computer|maus|telefon|tastatur)[\\s\\S]*?){5}",
      ),
      c(
        "describe",
        "Describe two objects",
        "(?:(?:schön|groß|klein|teuer|billig|rot|blau)[\\s\\S]*?){2}",
      ),
      c("prices", "Ask two prices", "(?:was kostet[\\s\\S]*?){2}"),
      c("needs", "Say three things you need", "(?:ich brauche[\\s\\S]*?){3}"),
      c("negative", "Say what you do not need", "ich brauche kein(en|e)? \\S+"),
    ],
  },
  {
    number: 3,
    title: "Free time & social life",
    description: "Discover hobbies, make a plan, and order something together.",
    lessons: [7, 8, 9],
    place: "Park & Café",
    review: "Plan Saturday with a friend",
    criteria: [
      c(
        "hobby",
        "Mention a hobby",
        "kochen|schwimmen|fotografieren|fußball|musik|tanzen|rad fahren",
      ),
      c("plan", "Suggest an activity", "gehen wir|treffen wir|spielen wir"),
      c(
        "time",
        "Agree on a day and time",
        "am (samstag|freitag|sonntag)[\\s\\S]*um",
      ),
      c("place", "Choose a café", "café|cafe"),
      c(
        "order",
        "Order food and a drink",
        "ich möchte[\\s\\S]*(kaffee|tee|wasser)[\\s\\S]*(brot|brötchen|käse)",
      ),
      c("compliment", "Give a compliment", "du kannst[\\s\\S]*(toll|gut)"),
      c("bye", "Say goodbye", "bis|tschüss|auf wiedersehen"),
    ],
  },
  {
    number: 4,
    title: "Travel, daily life & the past",
    description: "Get around, talk about your day, and tell a small story.",
    lessons: [10, 11, 12],
    place: "Bahnhof & Party",
    review: "One day in Germany",
    criteria: [
      c("hello", "Meet and introduce yourself", "hallo|guten tag"),
      c("name", "Give your name", "ich (heiße|heisse|bin) \\S+"),
      c(
        "job",
        "Talk about your job",
        "entwickler|student|lehrer|arzt|ärztin|von beruf|arbeite als",
      ),
      c("family", "Mention family", "familie|mutter|vater|schwester|bruder"),
      c("price", "Ask a price", "was kostet|wie viel kostet"),
      c(
        "object",
        "Ask what an object is called",
        "wie heißt das|wie heisst das",
      ),
      c("need", "Say what you need", "ich brauche"),
      c("hobby", "Mention a hobby", "gern|gerne|ich kann"),
      c("plan", "Arrange a meeting", "treffen|hast du[\\s\\S]*zeit"),
      c("food", "Order food", "ich möchte|ich moechte"),
      c("transport", "Use transport", "zug|u-bahn|bus|aussteigen"),
      c(
        "past",
        "Describe a past activity",
        "habe[\\s\\S]*(gelernt|gearbeitet|gekocht|gesehen)|bin[\\s\\S]*gefahren",
      ),
    ],
  },
];
export const dailyRoutine = [
  {
    title: "Warm up",
    time: "5 min",
    detail: "5 old words, 3 familiar sentences, and one listening sentence.",
    step: "review",
  },
  {
    title: "Study your book",
    time: "10–15 min",
    detail:
      "Read a small section. Choose 8–12 useful words and connect each to a sentence.",
    step: "words",
  },
  {
    title: "Make it active",
    time: "10 min",
    detail:
      "Build 3 sentences, recall 5 words, listen twice, and make 2 speaking attempts.",
    step: "build",
  },
  {
    title: "Use it in life",
    time: "5 min",
    detail: "Take your new German into a realistic mission.",
    step: "mission",
  },
] as const;
export function personalize(
  text: string,
  name: string,
  profile: {
    country: string;
    city: string;
    profession: string;
    languages: string;
  },
): string {
  if (text === "Ich arbeite als {profession}.") {
    if (["Student", "Studentin"].includes(profile.profession))
      return "Ich studiere.";
    if (["Schüler", "Schülerin"].includes(profile.profession))
      return "Ich gehe zur Schule.";
  }
  return text.replace(
    /\{(name|country|city|profession|languages)\}/g,
    (_, key: string) =>
      ({
        name,
        country: profile.country || "Ägypten",
        city: profile.city || "Alexandria",
        profession: profile.profession || "Softwareentwickler",
        languages: profile.languages || "Arabisch und Englisch",
      })[key as "name"],
  );
}
export function checkMission(
  text: string,
  criteria: MissionCriterion[],
): string[] {
  const normalized = text
    .normalize("NFC")
    .toLocaleLowerCase("de-DE")
    .replace(/[’‘]/g, "'");
  return criteria
    .filter((rule) => new RegExp(rule.pattern, "u").test(normalized))
    .map((rule) => rule.id);
}
