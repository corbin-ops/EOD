export type MetricType = "count" | "rating" | "duration" | "percent" | "text";

export interface MetricConfig {
  key: string;
  label: string;
  type: MetricType;
  isTask?: boolean;
}

export interface MemberConfig {
  id: string;
  sheetName: string;
  displayName: string;
  accent: string;
  role: string;
  avatar: string;
  primaryMetricKey: string;
  goals: Array<{
    label: string;
    target: string;
  }>;
  metrics: MetricConfig[];
}

export const TEAM_MEMBERS: MemberConfig[] = [
  {
    id: "chenge",
    sheetName: "Chenge",
    displayName: "Chenge",
    accent: "#ff7a59",
    role: "Texting & Mail",
    avatar: "C",
    primaryMetricKey: "textsSent",
    goals: [
      { label: "Texts Sent", target: "Daily focus" },
      { label: "Mail Scrubbed", target: "Pipeline ready" },
    ],
    metrics: [
      { key: "textsSent", label: "Texts Sent", type: "count", isTask: true },
      { key: "followUpTexts", label: "# Texts Sent", type: "count", isTask: true },
      { key: "mailScrubbed", label: "# Mail Scrubbed", type: "count", isTask: true },
      { key: "mood", label: "Mood", type: "rating" },
      { key: "energy", label: "Energy", type: "rating" },
    ],
  },
  {
    id: "corbin",
    sheetName: "Corbin",
    displayName: "Corbin",
    accent: "#0c7b93",
    role: "Sales & Closing",
    avatar: "Co",
    primaryMetricKey: "contractsSigned",
    goals: [
      { label: "Offers", target: "30/wk" },
      { label: "Talk Time", target: "2 hrs/day" },
      { label: "Agreements", target: "2/wk" },
    ],
    metrics: [
      { key: "offersMade", label: "Offers Made", type: "count", isTask: true },
      { key: "verbalsAccepted", label: "Verbals Accepted", type: "count", isTask: true },
      { key: "contractsSigned", label: "Contracts Signed", type: "count", isTask: true },
      { key: "dials", label: "Dials", type: "count", isTask: true },
      { key: "talkTime", label: "Talk Time", type: "duration", isTask: true },
      { key: "mood", label: "Mood", type: "rating" },
      { key: "energy", label: "Energy", type: "rating" },
    ],
  },
  {
    id: "marie",
    sheetName: "Marie",
    displayName: "Marie",
    accent: "#f4a261",
    role: "Appointment Setting",
    avatar: "M",
    primaryMetricKey: "appointmentsBooked",
    goals: [
      { label: "Appts Set", target: "8-10/day" },
      { label: "Talk Time", target: "2.5 hrs/day" },
      { label: "Dials", target: "80/day" },
      { label: "Speed to Lead", target: "30 min" },
    ],
    metrics: [
      { key: "dialsMade", label: "Dials Made", type: "count", isTask: true },
      { key: "connectedCalls", label: "Connected Calls", type: "count", isTask: true },
      { key: "appointmentsBooked", label: "Appointments Booked", type: "count", isTask: true },
      { key: "askPriceCollected", label: "Ask Price Collected", type: "count", isTask: true },
      { key: "talkTime", label: "Talk Time", type: "duration", isTask: true },
      { key: "mood", label: "Mood", type: "rating" },
      { key: "energy", label: "Energy", type: "rating" },
    ],
  },
  {
    id: "hugo",
    sheetName: "Hugo",
    displayName: "Hugo",
    accent: "#2a9d8f",
    role: "Outreach & Partnerships",
    avatar: "H",
    primaryMetricKey: "realtorsContacted",
    goals: [
      { label: "Realtors", target: "Daily outreach" },
      { label: "Title Cos", target: "Steady pipeline" },
    ],
    metrics: [
      { key: "realtorsContacted", label: "Realtors Contacted", type: "count", isTask: true },
      {
        key: "titleCompaniesContacted",
        label: "Title Companies Contacted",
        type: "count",
        isTask: true
      },
      { key: "talkTime", label: "Talk Time", type: "duration", isTask: true },
      { key: "mood", label: "Mood", type: "text" },
      { key: "energy", label: "Energy", type: "rating" },
    ],
  },
  {
    id: "taa",
    sheetName: "Taa",
    displayName: "Taa",
    accent: "#7d4f9e",
    role: "Texting & Leads",
    avatar: "T",
    primaryMetricKey: "leadsPushed",
    goals: [
      { label: "Response Time", target: "7 min" },
      { label: "Leads/Day", target: "20" },
    ],
    metrics: [
      { key: "textsSent", label: "Texts Sent", type: "count", isTask: true },
      { key: "responseRate", label: "Response Rate", type: "percent", isTask: true },
      { key: "leadsPushed", label: "Leads Pushed", type: "count", isTask: true },
      { key: "responseTime", label: "Response Time", type: "duration", isTask: true },
      { key: "mood", label: "Mood", type: "rating" },
      { key: "energy", label: "Energy", type: "rating" },
      { key: "messagesReceived", label: "# Messages Received", type: "count", isTask: true },
      {
        key: "peopleTextedBack",
        label: "# People Who Texted Back",
        type: "count",
        isTask: true
      }
    ],
  }
];
