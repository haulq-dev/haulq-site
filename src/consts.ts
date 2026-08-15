export const SITE = {
  name: 'HaulQ',
  domain: 'haulq.ai',
  promise: 'Run every load. Know every dollar.',
  category: 'The modular operating system for owner-operators and small fleets.',
  wedge: 'For owner-operators and small fleets.',
};

export type Status = 'Building now' | 'Next up' | 'Planned';

export interface Product {
  slug: string;
  name: string;
  short: string;
  tagline: string;
  status: Status;
  buyer: string;
  job: string;
  offer: string[];
  worksWith: string[];
  standalone: string;
}

export const PRODUCTS: Product[] = [
  {
    slug: 'docs',
    name: 'HaulQ Docs',
    short: 'Docs',
    tagline: 'Photograph the paperwork. Get structured data.',
    status: 'Building now',
    buyer: 'Any carrier handling rate confirmations, BOLs, PODs, invoices and compliance documents.',
    job: 'Turn paperwork into validated structured data and trigger the next step automatically.',
    offer: [
      'Intake by phone camera, upload, or a dedicated email address',
      'Classifies rate confirmations, BOLs, PODs, invoices and setup packets',
      'Extracts broker, dates, locations, rate, accessorials and signature fields with confidence scores',
      'Compares what it read against the load record and flags the discrepancies',
      'Detects missing signatures and pages so nothing gets invoiced early',
      'Full version history, search and retention rules',
    ],
    worksWith: ['pay', 'verify', 'insights'],
    standalone: 'Yes. Nothing else has to be switched on.',
  },
  {
    slug: 'pay',
    name: 'HaulQ Pay',
    short: 'Pay',
    tagline: 'Delivered to funded, without the retyping.',
    status: 'Building now',
    buyer: 'Owner-operators, fleet back offices and dispatch companies.',
    job: 'Move a completed load to cash quickly and show exactly where the money went.',
    offer: [
      'Invoices generated from the load and its validated documents',
      'Linehaul, fuel surcharge, detention, TONU and lumper handled properly',
      'Factoring packets assembled and submitted, with status tracked back',
      'Receivables aging, payment matching and overdue alerts',
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
    status: 'Building now',
    buyer: 'Owners, fleet managers and anyone who signs the cheques.',
    job: 'Show which loads, lanes, trucks, drivers and brokers create profit.',
    offer: [
      'Revenue, direct costs and contribution margin per load',
      'Loaded against deadhead miles, and margin per total mile',
      'Fuel, toll, maintenance, factoring and detention impact',
      'Lane and broker performance, payment speed and exception rates',
      'Forecast against actual, so the estimate gets better every week',
      'Data-quality flags showing which numbers are estimated and which are reconciled',
    ],
    worksWith: ['docs', 'pay', 'dispatch'],
    standalone: 'Yes, on imported data. It gets sharper as other modules feed it.',
  },
  {
    slug: 'verify',
    name: 'HaulQ Verify',
    short: 'Verify',
    tagline: 'Check who you are hauling for. Free.',
    status: 'Building now',
    buyer: 'Carriers checking brokers, and brokers checking carriers.',
    job: 'Reduce nonpayment, fraud, double-brokering and authority risk before a load is accepted.',
    offer: [
      'MC and DOT identity and operating authority',
      'Insurance filing and process agent status from authoritative sources',
      'Every fact carries its source and the moment it was fetched',
      'Email, domain and contact consistency checks',
      'Your own allowlists, blocklists and approval thresholds',
      'Watchlists that tell you when authority or insurance changes',
    ],
    worksWith: ['dispatch', 'pay'],
    standalone: 'Yes. The lookup will be free to use.',
  },
  {
    slug: 'track',
    name: 'HaulQ Track',
    short: 'Track',
    tagline: 'Nobody has to call the driver.',
    status: 'Next up',
    buyer: 'Carriers, fleet managers and the brokers they send a link to.',
    job: 'End check calls, catch schedule risk early, and create evidence for detention.',
    offer: [
      'Location from your ELD, your telematics, or just the driver app',
      'Live status, ETA, route deviation and exception alerts',
      'A visibility link brokers open without creating an account',
      'Geofenced arrival and departure with a detention timer',
      'Driver hours and availability feeding load selection',
      'Automatic status updates, escalating to a human on exceptions',
    ],
    worksWith: ['dispatch', 'routes', 'pay'],
    standalone: 'Yes. Works with no ELD at all.',
  },
  {
    slug: 'routes',
    name: 'HaulQ Routes',
    short: 'Routes',
    tagline: 'Can this truck actually run this load?',
    status: 'Planned',
    buyer: 'Drivers, owner-operators, dispatchers and fleets.',
    job: 'Decide whether a load sequence is physically, legally and economically feasible.',
    offer: [
      'Truck-safe routing on height, weight, axle, length and restrictions',
      'Hours-aware pickup and delivery feasibility',
      'Deadhead, tolls, fuel, terrain, weather and stop planning',
      'Low bridges, restricted roads, scales, parking and service points',
      'Multi-load route chains and next-market positioning',
      'ETA ranges and schedule risk, not false precision',
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
    buyer: 'Owner-operators, small carriers and dispatch companies.',
    job: 'Keep every truck on profitable, feasible freight without paying a percentage of gross.',
    offer: [
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
  status: 'Planned' as Status,
  blurb:
    'An add-on for customers already running several modules. It searches, prepares, updates and submits continuously, pausing on anything ambiguous or above your approval limits. Every action is logged and you can take over instantly.',
};

export const productBySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug)!;
