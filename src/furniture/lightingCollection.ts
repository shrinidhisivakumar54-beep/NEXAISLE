export type LightingPiece={id:string;name:string;category:string;subtitle:string;description:string;material:string;image:string;room:string;sources:[number,number,number][];source:string;temperature?:2700|4000};
export const lightingCollection:LightingPiece[]=[
  {
    "id": "crystal",
    "name": "KRISTALLER",
    "category": "Chandeliers",
    "subtitle": "Crystal chandelier · three arms",
    "description": "Glass prisms and a silver-coloured frame. Explore the small reflections and the atmosphere around a real crystal chandelier.",
    "material": "Glass prisms · silver-coloured steel",
    "image": "/lighting/crystal.jpg",
    "room": "/lighting/crystal-1.jpg",
    "sources": [
      [
        40,
        34,
        5
      ],
      [
        48.5,
        32,
        5
      ],
      [
        54,
        34,
        5
      ]
    ],
    "source": "https://www.ikea.com/ma/en/p/kristaller-chandelier-3-armed-silver-colour-glass-80089461/"
  },
  {
    "id": "chandelier",
    "name": "SIMRISHAMN",
    "category": "Chandeliers",
    "subtitle": "Opal glass chandelier · seven arms",
    "description": "Seven opal glass shades on a chrome frame. A sculptural focal point for a dining or living space.",
    "material": "Opal glass · chrome-plated steel",
    "image": "/lighting/chandelier.jpg",
    "room": "/lighting/chandelier-alt1.jpg",
    "sources": [
      [
        38,
        42,
        7
      ],
      [
        44,
        42,
        7
      ],
      [
        59,
        42,
        7
      ],
      [
        73,
        42,
        7
      ]
    ],
    "source": "https://www.ikea.com/sa/en/p/simrishamn-chandelier-7-armed-chrome-plated-opal-white-glass-60451872/"
  },
  {
    "id": "pendant",
    "name": "SINNERLIG",
    "category": "Pendants",
    "subtitle": "Handwoven bamboo pendant",
    "description": "A woven bamboo shade with an open texture. See the actual fixture in a room, including its original patterned lighting.",
    "material": "Handwoven bamboo · natural finish",
    "image": "/lighting/pendant.jpg",
    "room": "/lighting/pendant-alt1.jpg",
    "sources": [
      [
        66,
        24,
        13
      ]
    ],
    "source": "https://www.ikea.com/us/en/p/sinnerlig-pendant-lamp-bamboo-handmade-60515869/"
  },
  {
    "id": "table",
    "name": "TÄLLBYN",
    "category": "Table lamps",
    "subtitle": "Opal glass table lamp",
    "description": "A rounded glass shade with a nickel-plated base. A gentle focal point for a sideboard, bedside table or reading corner.",
    "material": "Opal glass · nickel-plated steel",
    "image": "/lighting/table.jpg",
    "room": "/lighting/table-alt1.jpg",
    "sources": [
      [
        24,
        42,
        11
      ]
    ],
    "source": "https://www.ikea.com/kr/en/p/taellbyn-table-lamp-nickel-plated-opal-white-glass-50437669/"
  },
  {
    "id": "desk",
    "name": "RANARP",
    "category": "Table lamps",
    "subtitle": "Adjustable work lamp · off-white",
    "description": "A metal work lamp with an adjustable arm and shade. Direct the light toward a desk or a favourite reading spot.",
    "material": "Painted steel · adjustable head and arm",
    "image": "/lighting/desk.jpg",
    "room": "/lighting/desk-alt1.jpg",
    "sources": [
      [
        47,
        36,
        10
      ]
    ],
    "source": "https://www.ikea.com/us/en/p/ranarp-work-lamp-off-white-50231319/"
  },
  {
    "id": "warmbulb",
    "name": "SOLHETTA · Warm",
    "category": "Bulbs",
    "subtitle": "E27 LED bulbs · 2700 K",
    "description": "A real warm-white bulb option for a softer, yellow-toned atmosphere. Compare its rated colour with the separate 4000 K bulb.",
    "material": "E27 · 806 lumens · 2700 K",
    "image": "/lighting/warmbulb.jpg",
    "room": "/lighting/warmbulb.jpg",
    "sources": [
      [
        25,
        31,
        22
      ],
      [
        75,
        31,
        22
      ]
    ],
    "source": "https://www.ikea.com/de/de/p/solhetta-led-leuchtmittel-e27-806-lm-dimmbar-rund-opalweiss-60583924/",
    "temperature": 2700
  },
  {
    "id": "whitebulb",
    "name": "SOLHETTA · White",
    "category": "Bulbs",
    "subtitle": "E27 LED bulbs · 4000 K",
    "description": "A real white-light bulb option for a crisper atmosphere. Its colour temperature is fixed; compare it with the separate warm-white bulb.",
    "material": "E27 · 806 lumens · 4000 K",
    "image": "/lighting/whitebulb.jpg",
    "room": "/lighting/whitebulb.jpg",
    "sources": [
      [
        25,
        32,
        22
      ],
      [
        75,
        32,
        22
      ]
    ],
    "source": "https://www.ikea.com/de/de/p/solhetta-led-leuchtmittel-e27-806-lm-rund-opalweiss-10591511/",
    "temperature": 4000
  }
];
