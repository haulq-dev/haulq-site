export const SITE = {
  name: 'HaulQ',
  domain: 'haulq.ai',
  promise: 'Run every load. Know every dollar.',
  category: 'The modular operating system for owner-operators and small fleets.',
  wedge: 'For owner-operators and small fleets.',
};

/**
 * Version tag for the consent sentence shown under the waitlist form.
 * Bump this whenever the wording of that sentence changes, so a stored
 * signup can always be traced back to what the person actually agreed to.
 */
export const WAITLIST_CONSENT_VERSION = 'waitlist-2026-08';

export const APP_URL = 'https://app.haulq.ai';
export const APP_STORE_URL = 'https://apps.apple.com/us/app/haulq/id6804486951';

export type Status = 'Live' | 'Early access' | 'Next up' | 'Planned';

/** Which subscription includes a product. `null` means not sold yet. */
export type Plan = 'Core' | 'Fleet' | null;

export interface Product {
  slug: string;
  name: string;
  short: string;
  tagline: string;
  status: Status;
  plan: Plan;
  buyer: string;
  job: string;
  /** What it does today. Only things that are built and running. */
  offer: string[];
  /** On this product's roadmap, not built yet. */
  next: string[];
  worksWith: string[];
  standalone: string;
}

export const PRODUCTS: Product[] = [
  {
    slug: 'docs',
    name: 'HaulQ Docs',
    short: 'Docs',
    tagline: 'Photograph the paperwork. Get structured data.',
    status: 'Live',
    plan: 'Core',
    buyer: 'Any carrier handling rate confirmations, BOLs, PODs, invoices and lumper receipts.',
    job: 'Turn paperwork into validated structured data and trigger the next step automatically.',
    offer: [
      'Upload a PDF or a photo, forward to your own HaulQ paperwork address, or connect your Google or Microsoft mailbox so rate confirmations arrive on their own',
      'Recognises rate confirmations, BOLs, PODs, invoices and lumper receipts from what the document says, never from its filename',
      'Reads broker, load number, rate, weight and stops, and reports a field as missing rather than guessing',
      'Compares what it read against the load, and flags a rate or load-number disagreement before anything gets invoiced',
      'A rate confirmation that arrives on its own becomes a proposed load, with the source text under every field. You create the load with one tap',
      'Sending the same file twice is caught. A document it cannot read can be filled in by hand, and the correction sticks',
    ],
    next: [
      'Missing-signature and missing-page detection',
      'Search and retention rules across every document',
    ],
    worksWith: ['pay', 'verify', 'insights'],
    standalone: 'Yes. Nothing else has to be switched on.',
  },
  {
    slug: 'pay',
    name: 'HaulQ Pay',
    short: 'Pay',
    tagline: 'Delivered to funded, without the retyping.',
    status: 'Live',
    plan: 'Core',
    buyer: 'Owner-operators, fleet back offices and dispatch companies.',
    job: 'Move a completed load to cash quickly and show exactly where the money went.',
    offer: [
      'Invoices built from the load, with linehaul filled in from the rate and one-tap accessorials like detention, TONU and lumper',
      'A clean invoice PDF, ready to send',
      'Factoring packets assembled, submitted and tracked through to the factor’s answer',
      'Payments recorded against what is still owed, receivables aging, and a clear view of what is late',
      'With Autopilot, weekly payment reminders to each broker, and invoice emails with the rate confirmation and POD attached, sent from your own mailbox once you approve them',
    ],
    next: [
      'Expenses from fuel cards, tolls and maintenance',
      'Exports to your accounting software rather than replacing it',
    ],
    worksWith: ['docs', 'track', 'insights'],
    standalone: 'Yes, with manual entry. Docs is what makes it automatic.',
  },
  {
    slug: 'insights',
    name: 'HaulQ Insights',
    short: 'Insights',
    tagline: 'What each load actually made. To the cent.',
    status: 'Live',
    plan: 'Core',
    buyer: 'Owners, fleet managers and anyone who signs the cheques.',
    job: 'Show which loads, lanes, trucks and brokers create profit.',
    offer: [
      'Revenue, direct cost and margin on every load, from your own cost per mile',
      'Loaded against deadhead miles, so a load that looks good per loaded mile is not mistaken for a good load',
      'Breakdowns by broker, lane and truck',
      'Which brokers pay on time, and what is owed right now',
      'A needs-attention list that links each problem straight to where you fix it',
      'Import 30 to 90 days of history from a spreadsheet, and check your costs against what those loads actually made',
    ],
    next: [
      'Fuel, toll and maintenance impact per load',
      'Forecast against actual, so the estimate gets better every week',
    ],
    worksWith: ['docs', 'pay', 'dispatch'],
    standalone: 'Yes, on imported data. It gets sharper as other modules feed it.',
  },
  {
    slug: 'verify',
    name: 'HaulQ Verify',
    short: 'Verify',
    tagline: 'Check who you are hauling for.',
    status: 'Live',
    plan: 'Core',
    buyer: 'Carriers checking the brokers they haul for.',
    job: 'Reduce nonpayment, fraud, double-brokering and authority risk before a load is accepted.',
    offer: [
      'MC and DOT identity, operating authority and insurance status, straight from FMCSA',
      'Every fact carries its source and the moment it was fetched',
      'Brokers on file are re-checked every night, and you get an email when something changes',
      'A warning when paperwork arrives from an email domain that broker has never used, a common double-brokering pattern',
      'Booking a load with a broker FMCSA shows as not authorized is flagged on the record. Your call, never a block',
    ],
    next: ['Your own allowlists, blocklists and approval thresholds'],
    worksWith: ['dispatch', 'pay'],
    standalone: 'Yes. The MC lookup on this site is free for anyone, no account needed.',
  },
  {
    slug: 'track',
    name: 'HaulQ Track',
    short: 'Track',
    tagline: 'Nobody has to call the driver.',
    status: 'Live',
    plan: 'Fleet',
    buyer: 'Carriers, fleet managers and the brokers they send a link to.',
    job: 'End check calls, catch trouble early, and create evidence for detention.',
    offer: [
      'Drivers check in at each stop from the HaulQ app or a link: arrived, loading, departed',
      'Connect Motive and HaulQ matches its vehicles to your trucks and reads their position',
      'A visibility link brokers open without creating an account',
      'Arrival and departure timestamped, with a detention threshold per broker and an alert when it is crossed',
      'An alert when a load in transit goes quiet for too long',
    ],
    next: [
      'Live ETA and route deviation alerts',
      'Driver hours and availability feeding load selection',
      'More ELD and telematics providers',
    ],
    worksWith: ['dispatch', 'routes', 'pay'],
    standalone: 'Yes. Works with no ELD at all.',
  },
  {
    slug: 'routes',
    name: 'HaulQ Routes',
    short: 'Routes',
    tagline: 'Can this truck actually run this load?',
    status: 'Live',
    plan: 'Fleet',
    buyer: 'Drivers, owner-operators, dispatchers and fleets.',
    job: 'Decide whether a load is physically and legally feasible for the truck you have.',
    offer: [
      'Truck-aware routing on height, weight, length and hazmat, with a plain answer: feasible or not, and the one constraint that decided it',
      'Addresses on a load are placed on the map automatically',
      'Truck stops, fuel, rest areas, weigh stations and truck washes near every stop',
      'Repair shops near the truck, a stop or any city, with ratings and a number to call',
    ],
    next: [
      'Multi-load route chains and next-market positioning',
      'Hours-aware pickup and delivery feasibility',
      'Tolls, fuel, terrain and weather in the plan',
    ],
    worksWith: ['dispatch', 'track', 'insights'],
    standalone: 'Yes, as a planning tool, with or without a load board.',
  },
  {
    slug: 'dispatch',
    name: 'HaulQ Dispatch',
    short: 'Dispatch',
    tagline: 'Your next load. Right on Q.',
    status: 'Planned',
    plan: null,
    buyer: 'Owner-operators, small carriers and dispatch companies.',
    job: 'Keep every truck on profitable, feasible freight without paying a percentage of gross.',
    offer: [],
    next: [
      'Searches approved load sources and collapses duplicate postings',
      'Applies your hard rules: equipment, dimensions, windows, blocked lanes, rate floor, home time',
      'Ranks by predicted net contribution, not rate per mile',
      'Looks days ahead across a sequence instead of one load at a time',
      'Contacts brokers from your own email and negotiates inside your limits',
      'Shows a full approval card, and never books without your say-so',
    ],
    worksWith: ['routes', 'verify', 'track', 'docs'],
    standalone: 'Yes, though it is far stronger with Routes and Verify alongside.',
  },
];

export const AUTOPILOT = {
  name: 'HaulQ Autopilot',
  tagline: 'Runs the loop. Asks when it matters.',
  status: 'Early access' as Status,
  blurb:
    'Sends the routine email a dispatcher would, from your own mailbox. Each kind of message starts as a preview you mark right or wrong, moves to ask-first, and only goes automatic when you say so. Payment reminders and invoice emails today, approved from the web or your phone.',
};

/** The HaulQ iPhone app. `features` must match the build live on the App Store. */
export const MOBILE_APP = {
  name: 'HaulQ for iPhone',
  features: [
    'Sign in and see the loads assigned to you, with every stop on them.',
    'One tap to check in at each stop: arrived, loading, departed. No phone tag with dispatch.',
    'Detention starts and stops from those taps, so the evidence is already on file.',
    'Owners can add a truck, invite a driver and create a load from the phone.',
  ],
  nextUpdate: [
    'Photograph paperwork straight into Docs',
    'Invoices, payments and factoring',
    'Insights and the Autopilot approvals inbox',
    'Repair shops near where you are',
  ],
};

export const productBySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug)!;
