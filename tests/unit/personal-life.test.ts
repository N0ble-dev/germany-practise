import { describe, expect, it } from "vitest";
import { personalProfileSchema } from "../../src/lib/journey-model";
import {
  personalIntroduction,
  personalPractice,
  personalFocus,
} from "../../src/lib/personal-life";
import { initialState } from "../../src/lib/content";
import { stateSchema } from "../../src/lib/learning";
import { buildLearningReport } from "../../src/lib/learning-report";
import { personalize } from "../../src/lib/journey-content";

describe("German for the learner's life", () => {
  it("links the featured sentence to a lesson that contains that personal pattern", () => {
    const doctor = personalFocus(
      personalProfileSchema.parse({
        profession: "Ärztin",
        situations: ["cafe"],
      }),
      "Sara",
    );
    expect(doctor.german).toBe("Ich bin Ärztin.");
    expect(doctor.lesson).toBe(2);
    expect(doctor.moment?.lesson).toBe(9);
    const hobby = personalFocus(
      personalProfileSchema.parse({
        interests: ["reading"],
        motivation: "travel",
      }),
      "Sara",
    );
    expect(hobby.german).toBe("Ich lese gern.");
    expect(hobby.lesson).toBe(7);
    const daily = personalFocus(
      personalProfileSchema.parse({ situations: ["transport"] }),
      "Guest",
    );
    expect(daily.german).toBe("Wo ist der Bahnhof?");
    expect(daily.lesson).toBe(10);
    expect(
      personalFocus(personalProfileSchema.parse({}), "Sara").configured,
    ).toBe(false);
  });
  it("uses studying and school sentences when the selected role is a student", () => {
    for (const profession of ["Student", "Studentin"]) {
      const profile = personalProfileSchema.parse({ profession });
      expect(
        personalize("Ich arbeite als {profession}.", "Sara", profile),
      ).toBe("Ich studiere.");
      expect(personalize("Ich bin {profession}.", "Sara", profile)).toBe(
        `Ich bin ${profession}.`,
      );
    }
    for (const profession of ["Schüler", "Schülerin"])
      expect(
        personalize(
          "Ich arbeite als {profession}.",
          "Sara",
          personalProfileSchema.parse({ profession }),
        ),
      ).toBe("Ich gehe zur Schule.");
  });
  it("restores older personal details without losing learning records or inventing choices", () => {
    const before = initialState();
    const restored = stateSchema.parse({
      ...before,
      xp: 120,
      personalProfile: {
        city: "Rabat",
        country: "Marokko",
        profession: "Ärztin",
        languages: "Arabisch",
      },
    });
    expect(restored.personalProfile).toEqual({
      city: "Rabat",
      country: "Marokko",
      profession: "Ärztin",
      languages: "Arabisch",
      motivation: null,
      interests: [],
      situations: [],
    });
    expect(restored.words).toEqual(before.words);
    expect(restored.xp).toBe(120);
  });

  it("makes introductions only from the learner's details and selected interests", () => {
    expect(
      personalIntroduction(personalProfileSchema.parse({}), "Guest"),
    ).toEqual([]);
    const profile = personalProfileSchema.parse({
      profession: "Ärztin",
      country: "der Türkei",
      city: "Berlin",
      interests: ["cooking", "music"],
    });
    expect(personalIntroduction(profile, "Sara")).toEqual([
      "Ich heiße Sara.",
      "Ich komme aus der Türkei.",
      "Ich wohne in Berlin.",
      "Ich bin Ärztin.",
      "Ich koche gern.",
      "Ich höre gern Musik.",
    ]);
    expect(personalize("Ich bin {profession}.", "Sara", profile)).toBe(
      "Ich bin Ärztin.",
    );
  });

  it("uses explicit everyday situations ahead of goal defaults without changing chapter progress", () => {
    expect(personalPractice(personalProfileSchema.parse({}))).toEqual([]);
    expect(
      personalPractice(
        personalProfileSchema.parse({ motivation: "career" }),
      ).map((item) => item.lesson),
    ).toEqual([2, 1, 8]);
    const profile = personalProfileSchema.parse({
      motivation: "career",
      situations: ["cafe", "transport"],
    });
    expect(personalPractice(profile).map((item) => item.lesson)).toEqual([
      9, 10,
    ]);
  });

  it("keeps custom professions and validates bounded, unique choices in imported backups", () => {
    const profile = personalProfileSchema.parse({
      profession: "Fotografin",
      motivation: "travel",
      interests: ["reading"],
      situations: ["transport"],
    });
    const state = stateSchema.parse(
      JSON.parse(
        JSON.stringify({ ...initialState(), personalProfile: profile }),
      ),
    );
    expect(state.personalProfile).toEqual(profile);
    expect(
      personalProfileSchema.safeParse({ interests: ["music", "music"] })
        .success,
    ).toBe(false);
    expect(
      personalProfileSchema.safeParse({ situations: ["unknown"] }).success,
    ).toBe(false);
    expect(
      personalProfileSchema.safeParse({ profession: "x".repeat(81) }).success,
    ).toBe(false);
  });

  it("exports readable preferences in the notebook instead of internal IDs or empty arrays", () => {
    const state = initialState();
    state.personalProfile = personalProfileSchema.parse({
      motivation: "home",
      interests: ["cooking", "music"],
      situations: ["cafe", "neighbors"],
    });
    const lines = buildLearningReport(state, "Sara", ["overview"]).sections[0]
      .entries[0].lines;
    expect(lines).toContain("My reason: Make Germany home");
    expect(lines).toContain("Interests: Cooking, Music");
    expect(lines).toContain(
      "Everyday situations: At a café, Meeting neighbors",
    );
    expect(lines).not.toContain("Profession: ");
    const emptyLines = buildLearningReport(initialState(), "Sara", ["overview"])
      .sections[0].entries[0].lines;
    expect(
      emptyLines.some(
        (line) =>
          line.startsWith("Interests:") ||
          line.startsWith("Everyday situations:"),
      ),
    ).toBe(false);
  });
});
