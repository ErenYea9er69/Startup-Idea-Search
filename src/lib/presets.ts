export interface PresetGroup {
  name: string;
  items: string[];
}

export const INDUSTRY_PRESETS: PresetGroup[] = [
  {
    name: "Enterprise & SaaS",
    items: ["B2B SaaS", "HRTech", "SalesTech", "MarTech", "LegalTech", "GovTech", "Cybersecurity", "Developer Tools", "Infrastructure", "Logistics", "Supply Chain", "ERP & Operations"]
  },
  {
    name: "Finance & Market",
    items: ["Fintech", "InsurTech", "PropTech", "RegTech", "E-commerce", "RetailTech", "AdTech", "Marketplaces"]
  },
  {
    name: "Health & Life Sciences",
    items: ["HealthTech", "BioTech", "MedTech", "Wellness", "Longevity", "Fitness", "Mental Health", "Senior Care", "PetTech"]
  },
  {
    name: "AI & Future Tech",
    items: ["Agentic AI", "DeepTech", "Robotics", "SpaceTech", "Quantum Computing", "CleanTech", "Energy", "ClimateTech", "AutoTech", "Mobility"]
  },
  {
    name: "Education & Society",
    items: ["EdTech", "Future of Work", "Parenting", "CivicTech", "Social Impact", "Sustainability"]
  },
  {
    name: "Consumer & Lifestyle",
    items: ["Gaming", "Media", "Entertainment", "Travel", "Hospitality", "FoodTech", "Fashion", "Beauty", "Real Estate", "Construction"]
  }
];

export const EXCLUSION_PRESETS: PresetGroup[] = [
  {
    name: "High Risk / Speculative",
    items: ["Crypto", "Web3", "NFTs", "Gambling", "Betting", "Forex", "Day Trading", "Meme Coins", "Payday Loans", "Shell Companies"]
  },
  {
    name: "Low Value / Saturated",
    items: ["AI Wrappers", "Dropshipping", "Social Media", "Dating Apps", "Copycat Apps", "Generic CRM", "Generic Todo Apps", "Generic Project Management", "Shady SEO", "Click Farms"]
  },
  {
    name: "Ethical & Regulated",
    items: ["Adult Content", "Tobacco", "Weapons", "MLM", "Escort Services", "Patent Trolls", "Debt Collection", "Bail Bonds", "Shady Marketing"]
  },
  {
    name: "Complexity / Capital Heavy",
    items: ["Heavy Infrastructure", "Nuclear", "Aviation", "Traditional Farming", "Warehousing", "Physical Retail", "Pharmaceutical", "Government Lobbying"]
  }
];
