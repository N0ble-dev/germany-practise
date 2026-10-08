import type { DestinationId } from "./motivation-model";
export interface Destination {
  id: DestinationId;
  name: string;
  region: string;
  landmark: string;
  image: string;
  alt: string;
  imaginedMoment: string;
  phrase: string;
  meaning: string;
  arabic: string;
  practice: string;
  href: string;
  photographer: string;
  title: string;
  source: string;
  license: string;
  licenseUrl: string;
}
export const destinations: Destination[] = [
  {
    id: "berlin",
    name: "Berlin",
    region: "City life",
    landmark: "Brandenburger Tor",
    image: "/images/germany/berlin.webp",
    alt: "Berlin's Brandenburg Gate lit with warm lights beneath an evening sky",
    imaginedMoment:
      "An evening walk, a new neighborhood, and the confidence to say your first hello.",
    phrase: "Ich möchte in Deutschland leben.",
    meaning: "I would like to live in Germany.",
    arabic: "أودّ أن أعيش في ألمانيا.",
    practice: "Introduce yourself to someone new",
    href: "/lessons/1?step=speak",
    photographer: "Bill Tyne",
    title: "Brandenburg Gate III - Flickr - wit",
    source:
      "https://commons.wikimedia.org/wiki/File:Brandenburg_Gate_III_-_Flickr_-_wit.jpg",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
  },
  {
    id: "hamburg",
    name: "Hamburg",
    region: "Water & city walks",
    landmark: "Speicherstadt",
    image: "/images/germany/hamburg.webp",
    alt: "Red-brick warehouses and the Wasserschloss beside Hamburg's Speicherstadt canals, framed by a steel bridge",
    imaginedMoment:
      "Walk beside the canals, find a favorite café, and order something in German.",
    phrase: "Einen Kaffee, bitte.",
    meaning: "A coffee, please.",
    arabic: "قهوة من فضلك.",
    practice: "Practice your first café order",
    href: "/lessons/9?step=mission",
    photographer: "Dietmar Rabich",
    title: "Hamburg, Speicherstadt, Wasserschloss -- 2016 -- 2944-50",
    source:
      "https://commons.wikimedia.org/wiki/File:Hamburg,_Speicherstadt,_Wasserschloss_--_2016_--_2944-50.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    id: "heidelberg",
    name: "Heidelberg",
    region: "Old-town afternoons",
    landmark: "Alte Brücke",
    image: "/images/germany/heidelberg.webp",
    alt: "Heidelberg's Old Bridge glowing in the setting sun, with the castle and old town behind it",
    imaginedMoment:
      "A walk across the bridge, a quiet afternoon, and a plan made with a new friend.",
    phrase: "Treffen wir uns am Samstag?",
    meaning: "Shall we meet on Saturday?",
    arabic: "هل نلتقي يوم السبت؟",
    practice: "Make a weekend plan with a friend",
    href: "/lessons/8?step=mission",
    photographer: "Hartmut Schmidt, Heidelberg",
    title: "Old Bridge across the Neckar river at sunset, Heidelberg",
    source:
      "https://commons.wikimedia.org/wiki/File:Old_Bridge_across_the_Neckar_river_at_sunset,_Heidelberg.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    id: "eibsee",
    name: "Eibsee",
    region: "Bavarian outdoors",
    landmark: "A lake beneath the mountains",
    image: "/images/germany/eibsee.webp",
    alt: "Blue water at Eibsee reflecting mountain peaks, green forests, and the Bavarian sky",
    imaginedMoment:
      "Imagine a weekend by the lake, then telling a friend about your trip in German.",
    phrase: "Ich möchte nach Bayern fahren.",
    meaning: "I would like to travel to Bavaria.",
    arabic: "أودّ أن أسافر إلى بافاريا.",
    practice: "Tell a small story about a trip",
    href: "/lessons/12?step=mission",
    photographer: "Jp.Deguo",
    title: "Eibsee mirroring the mountains",
    source:
      "https://commons.wikimedia.org/wiki/File:Eibsee_mirroring_the_mountains.jpg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
];
export function getDestination(id: DestinationId): Destination {
  return destinations.find((d) => d.id === id) ?? destinations[0];
}
