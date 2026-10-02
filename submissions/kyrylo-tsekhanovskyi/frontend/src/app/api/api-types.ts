import type { components } from './schema';

// Short aliases for the generated contract types (never hand-written; see schema.d.ts).
type Schemas = components['schemas'];

export type Money = Schemas['Money'];
export type MoneyTotal = Schemas['MoneyTotal'];
export type ItemStatus = Schemas['ItemStatus'];
export type ListingStatus = Schemas['ListingStatus'];
export type OfferFit = Schemas['OfferFit'];

export type Project = Schemas['Project'];
export type ProjectInput = Schemas['ProjectInput'];
export type ProjectListEntry = Schemas['ProjectListEntry'];
export type ProjectSummary = Schemas['ProjectSummary'];

export type Item = Schemas['Item'];
export type ItemInput = Schemas['ItemInput'];

export type Listing = Schemas['Listing'];
export type ListingInput = Schemas['ListingInput'];

export type Offer = Schemas['Offer'];
export type OfferCreate = Schemas['OfferCreate'];
export type OfferUpdate = Schemas['OfferUpdate'];

export type ValidationProblemDetails = Schemas['ValidationProblemDetails'];
export type RuleViolationProblemDetails = Schemas['RuleViolationProblemDetails'];

export const ITEM_STATUSES: readonly ItemStatus[] = ['Needed', 'Sourcing', 'Ordered', 'Received'];
export const LISTING_STATUSES: readonly ListingStatus[] = [
  'Found',
  'Contacted',
  'Negotiating',
  'Agreed',
  'Purchased',
  'Received',
  'NotResponding',
  'Declined',
  'Scam',
];
export const OFFER_FITS: readonly OfferFit[] = ['Unverified', 'Fits', 'NotQuiteRight', 'WrongItem'];
